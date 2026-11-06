import { createRandom } from "@/museum/_lib/relief/height-field"
import { windowMatrix } from "@/museum/gallery/windows/_lib/window-geometry"
import {
  glassCrown,
  manorWindow,
  type ManorWindowSpec,
} from "@/museum/gallery/windows/_lib/window-layout"
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

const floorY = 0.026
const half = manorWindow.glassWidth / 2

export type MoonPane = {
  window: readonly [Vector3, Vector3, Vector3, Vector3]
  floor: readonly [Vector3, Vector3, Vector3, Vector3]
  direction: Vector3
}

function toFloor(point: Vector3, direction: Vector3) {
  const travel = (point.y - floorY) / -direction.y
  return point.clone().addScaledVector(direction, travel)
}

// Glass corners (bottom-left, bottom-right, top-right, top-left) and where
// moonlight through them lands on the carpet.
function moonPane(spec: ManorWindowSpec, direction: Vector3): MoonPane {
  const matrix = windowMatrix(spec)
  const corners = [
    new Vector3(-half, manorWindow.sill, 0.01),
    new Vector3(half, manorWindow.sill, 0.01),
    new Vector3(half, glassCrown, 0.01),
    new Vector3(-half, glassCrown, 0.01),
  ].map((corner) => corner.applyMatrix4(matrix))
  const [a = new Vector3(), b = a, c = a, d = a] = corners
  return {
    window: [a, b, c, d],
    floor: [
      toFloor(a, direction),
      toFloor(b, direction),
      toFloor(c, direction),
      toFloor(d, direction),
    ],
    direction,
  }
}

// Where moonlight through each moonlit window's glass lands on the floor.
// The direction is the way the light travels (pointing down into the room).
export function moonPanes(
  windows: readonly ManorWindowSpec[],
  direction: Vector3
): MoonPane[] {
  const travel = direction.clone().normalize()
  return windows
    .filter((spec) => spec.isMoonlit)
    .map((spec) => moonPane(spec, travel))
}

class QuadBuffer {
  positions: number[] = []
  uvs: number[] = []

  quad(
    corners: readonly Vector3[],
    uvs: readonly (readonly [number, number])[]
  ) {
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const corner = corners[index]
      const uv = uvs[index]
      if (corner && uv) {
        this.positions.push(corner.x, corner.y, corner.z)
        this.uvs.push(uv[0], uv[1])
      }
    }
  }

  geometry() {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(this.positions, 3)
    )
    geometry.setAttribute("uv", new Float32BufferAttribute(this.uvs, 2))
    geometry.computeVertexNormals()
    return geometry
  }
}

const sideUvs = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const

// The shaft's four sides; u runs across a side, v from the glass to the floor.
export function buildBeamGeometry(panes: readonly MoonPane[]) {
  const buffer = new QuadBuffer()
  for (const { window: glass, floor } of panes) {
    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ] as const
    for (const [from, to] of edges) {
      buffer.quad(
        [glass[from], glass[to], floor[to], floor[from]],
        sideUvs.map(([u, v]) => [u, v] as const)
      )
    }
  }
  return buffer.geometry()
}

export function buildPoolGeometry(panes: readonly MoonPane[]) {
  const buffer = new QuadBuffer()
  for (const { floor } of panes) {
    buffer.quad(floor, sideUvs)
  }
  return buffer.geometry()
}

const motesPerBeam = 110

// Dust caught in the shafts: random points inside each beam's volume.
export function buildMoteGeometry(panes: readonly MoonPane[]) {
  const random = createRandom(131)
  const positions: number[] = []
  const seeds: number[] = []
  for (const { window: glass, direction } of panes) {
    const [bottomLeft, bottomRight, , topLeft] = glass
    for (let index = 0; index < motesPerBeam; index += 1) {
      const across = random()
      const up = random()
      const point = bottomLeft
        .clone()
        .lerp(bottomRight, across)
        .add(topLeft.clone().sub(bottomLeft).multiplyScalar(up))
      const travel = (point.y - floorY) / -direction.y
      point.addScaledVector(direction, travel * (0.08 + random() * 0.85))
      positions.push(point.x, point.y, point.z)
      seeds.push(random())
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("seed", new Float32BufferAttribute(seeds, 1))
  return geometry
}
