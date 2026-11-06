import type { Point3 } from "@/museum/gallery/_lib/room-bounds"
import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

// A length of tulle hung from a rod. A parted veil is two panels tied back
// to the sides, leaving a way through the middle.
export type VeilSpec = {
  // Top centre, under the rod.
  position: Point3
  rotationY: number
  width: number
  height: number
  // Gap left in the middle of a parted veil; 0 hangs one closed panel.
  gap: number
}

const columns = 28
const rows = 18
const foldDepth = 0.05
const foldsPerMeter = 3.2

type Panel = { from: number; to: number; tieTo: number | null }

// One panel in the veil's own frame (x across, y down from the rod, z out
// of the wall). A tied panel narrows toward tieTo near its foot. uv is
// (metres across, 0 at the rod to 1 at the hem).
function panelGeometry(panel: Panel, height: number) {
  const positions: number[] = []
  const uvs: number[] = []
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    const pull =
      panel.tieTo === null
        ? 0
        : Math.sin(Math.min(1, v * 1.4) * Math.PI * 0.5) * 0.7
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      const top = panel.from + (panel.to - panel.from) * u
      const x = top + ((panel.tieTo ?? top) - top) * pull
      const z =
        Math.sin(top * foldsPerMeter * Math.PI * 2) *
        foldDepth *
        (0.5 + v * 0.5)
      positions.push(x, -v * height, z)
      uvs.push(top, v)
    }
  }
  const indices: number[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column
      const b = a + 1
      const c = a + columns + 1
      indices.push(a, c, b, b, c, c + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

function veilPanels(spec: VeilSpec): Panel[] {
  const half = spec.width / 2
  if (spec.gap <= 0) {
    return [{ from: -half, to: half, tieTo: null }]
  }
  const inner = spec.gap / 2
  return [
    { from: -half, to: -inner, tieTo: -half + 0.12 },
    { from: inner, to: half, tieTo: half - 0.12 },
  ]
}

const axisY = new Vector3(0, 1, 0)

// Every veil of a room merged into one mesh.
export function buildVeilGeometry(veils: readonly VeilSpec[]) {
  const parts = veils.flatMap((spec) => {
    const matrix = new Matrix4()
      .makeRotationAxis(axisY, spec.rotationY)
      .setPosition(...spec.position)
    const out = new Vector3(
      Math.sin(spec.rotationY),
      0,
      Math.cos(spec.rotationY)
    )
    return veilPanels(spec).map((panel) => {
      const geometry = panelGeometry(panel, spec.height).applyMatrix4(matrix)
      const uv = geometry.getAttribute("uv")
      const sway: number[] = []
      for (let index = 0; index < uv.count; index += 1) {
        const weight = uv.getY(index) ** 1.5
        sway.push(out.x * weight, 0, out.z * weight)
      }
      geometry.setAttribute("sway", new Float32BufferAttribute(sway, 3))
      return geometry
    })
  })
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  return merged
}
