import { windowMatrix } from "@/museum/gallery/windows/_lib/window-geometry"
import {
  manorWindow,
  type ManorWindowSpec,
} from "@/museum/gallery/windows/_lib/window-layout"
import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix3,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

const columns = 28
const rows = 44
const hemY = 0.03
const gatherWidth = 0.17
const folds = 8.5
const { curtainReach, curtainRodY, curtainZ, tieY } = manorWindow
const meet = 0.03

function smooth(value: number) {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

// Distance of the panel's inner and outer edges from the window's middle.
function panelEdges(y: number) {
  const gathered = curtainReach - gatherWidth
  if (y >= tieY) {
    const rise = (y - tieY) / (curtainRodY - tieY)
    return {
      inner: gathered + (meet - gathered) * smooth(rise) ** 0.8,
      outer: curtainReach,
    }
  }
  const drop = (tieY - y) / (tieY - hemY)
  return {
    inner: gathered - 0.14 * drop ** 1.4,
    outer: curtainReach + 0.03 * drop,
  }
}

function panelPoint(side: number, s: number, t: number) {
  const y = hemY + (curtainRodY - hemY) * t
  const edges = panelEdges(y)
  const distance = edges.outer + (edges.inner - edges.outer) * s
  const spread = edges.outer - edges.inner
  const depth = Math.min(
    0.055,
    0.022 * Math.sqrt((curtainReach - meet) / spread)
  )
  const knot = Math.exp(-(((y - tieY) / 0.12) ** 2))
  const z =
    curtainZ +
    depth * Math.sin(Math.PI * 2 * folds * s + 0.5 * Math.sin(y * 2.3)) +
    0.035 * knot
  return new Vector3(side * distance, y, z)
}

function curtainPanel(side: number, stir: number) {
  const positions: number[] = []
  const uvs: number[] = []
  const sway: number[] = []
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows
    for (let column = 0; column <= columns; column += 1) {
      const s = column / columns
      const point = panelPoint(side, s, t)
      positions.push(point.x, point.y, point.z)
      uvs.push(s * 2.4, point.y / 1.2)
      sway.push(stir * (1 - t) ** 1.3)
    }
  }
  const indices: number[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column
      const b = a + 1
      const c = a + columns + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute("sway", new Float32BufferAttribute(sway, 1))
  geometry.computeVertexNormals()
  return geometry
}

// The sway attribute becomes a world-space push into the room per vertex.
function withSwayDirection(geometry: BufferGeometry, inward: Vector3) {
  const sway = geometry.getAttribute("sway")
  const direction: number[] = []
  for (let index = 0; index < sway.count; index += 1) {
    const amount = sway.getX(index)
    direction.push(inward.x * amount, inward.y * amount, inward.z * amount)
  }
  geometry.deleteAttribute("sway")
  geometry.setAttribute(
    "swayDirection",
    new Float32BufferAttribute(direction, 3)
  )
  return geometry
}

export function buildCurtainGeometry(windows: readonly ManorWindowSpec[]) {
  const parts = windows.flatMap((spec) => {
    const matrix = windowMatrix(spec)
    const inward = new Vector3(0, 0, 1)
      .applyMatrix3(new Matrix3().setFromMatrix4(matrix))
      .normalize()
    const stir = spec.isStirring ? 1 : 0.1
    return [-1, 1].map((side) =>
      withSwayDirection(curtainPanel(side, stir).applyMatrix4(matrix), inward)
    )
  })
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  return merged
}

function tieBack(side: number) {
  const x = side * (curtainReach - gatherWidth / 2)
  const z = curtainZ + 0.035
  const band = new TorusGeometry(0.1, 0.009, 6, 24)
    .rotateX(Math.PI / 2)
    .scale(gatherWidth / 0.2, 1, 0.6)
    .translate(x, tieY, z - 0.01)
  const loops = [-1, 1].map((turn) =>
    new TorusGeometry(0.04, 0.009, 6, 18)
      .scale(1, 0.55, 0.35)
      .rotateZ(turn * 0.45)
      .translate(x + turn * 0.04, tieY + 0.01, z + 0.06)
  )
  const tails = [-1, 1].map((turn) =>
    new TorusGeometry(0.11, 0.008, 4, 10, 0.9)
      .scale(0.35, 1, 0.3)
      .rotateZ(-Math.PI / 2 + turn * 0.25)
      .translate(x + turn * 0.03, tieY - 0.02, z + 0.06)
  )
  const knot = new SphereGeometry(0.018, 10, 8)
    .scale(1, 0.8, 0.6)
    .translate(x, tieY + 0.005, z + 0.065)
  return [band, ...loops, ...tails, knot]
}

export function buildBowGeometry(windows: readonly ManorWindowSpec[]) {
  const parts = windows.flatMap((spec) => {
    const matrix = windowMatrix(spec)
    return [-1, 1].flatMap((side) =>
      tieBack(side).map((part) => part.applyMatrix4(matrix))
    )
  })
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  return merged
}
