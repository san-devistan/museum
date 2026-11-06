import type { RoomBounds } from "@/museum/gallery/_lib/room-bounds"
import {
  armAngles,
  chandelierLayout,
  radialPoint,
  tipPoint,
} from "@/museum/gallery/chandelier/_lib/chandelier-layout"
import { cobwebCells } from "@/museum/gallery/cobwebs/_lib/cobweb-texture"
import { defaultPictureRailY } from "@/museum/gallery/mouldings/_lib/moulding-profiles"
import { windowMatrix } from "@/museum/gallery/windows/_lib/window-geometry"
import {
  manorWindow,
  type ManorWindowSpec,
} from "@/museum/gallery/windows/_lib/window-layout"
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

type Cell = keyof typeof cobwebCells

// Corners run top-left, top-right, bottom-right, bottom-left.
type WebQuad = {
  corners: readonly [Vector3, Vector3, Vector3, Vector3]
  cell: Cell
  isMirrored?: boolean
}

function quadUvs(cell: Cell, isMirrored: boolean) {
  const { u, width } = cobwebCells[cell]
  const left = isMirrored ? u + width : u
  const right = isMirrored ? u : u + width
  return [
    [left, 1],
    [right, 1],
    [right, 0],
    [left, 0],
  ] as const
}

function buildWebs(quads: readonly WebQuad[]) {
  const positions: number[] = []
  const uvs: number[] = []
  for (const quad of quads) {
    const corners = quad.corners
    const quadUv = quadUvs(quad.cell, quad.isMirrored ?? false)
    for (const index of [0, 3, 1, 1, 3, 2]) {
      const corner = corners[index]
      const uv = quadUv[index]
      if (corner && uv) {
        positions.push(corner.x, corner.y, corner.z)
        uvs.push(uv[0], uv[1])
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  return geometry
}

const reach = 1.05

type CornerSpec = {
  corner: Vector3
  alongA: Vector3
  alongB: Vector3
  drop: number
  top: number
}

function cornerWeb({
  corner,
  alongA,
  alongB,
  drop,
  top: webTop,
}: CornerSpec): WebQuad {
  const a = corner.clone().addScaledVector(alongA, reach)
  const b = corner.clone().addScaledVector(alongB, reach * 0.9)
  return {
    cell: "fan",
    isMirrored: alongA.x + alongA.z < 0,
    corners: [
      a.clone().setY(webTop),
      b.clone().setY(webTop),
      b.clone().setY(webTop - drop * 0.85),
      a.clone().setY(webTop - drop),
    ],
  }
}

const east = new Vector3(1, 0, 0)
const west = new Vector3(-1, 0, 0)
const north = new Vector3(0, 0, -1)
const south = new Vector3(0, 0, 1)

// A torn web hanging from the curtain rod's end, in the window's frame.
function windowWeb(spec: ManorWindowSpec): WebQuad {
  const matrix = windowMatrix(spec)
  const x = manorWindow.curtainReach + 0.06
  const top = Math.min(manorWindow.curtainRodY, defaultPictureRailY - 0.03)
  const z = manorWindow.curtainZ
  const place = (px: number, py: number, pz: number) =>
    new Vector3(px, py, pz).applyMatrix4(matrix)
  return {
    cell: "drape",
    corners: [
      place(x - 0.55, top, 0.02),
      place(x + 0.05, top, z),
      place(x, top - 0.5, z * 0.8),
      place(x - 0.45, top - 0.62, 0.03),
    ],
  }
}

function floorPoint(x: number, z: number) {
  return new Vector3(x, 0, z)
}

// Webs strung across a room's four top corners, and over a few windows.
export function buildRoomWebs(
  bounds: RoomBounds,
  windows: readonly ManorWindowSpec[]
) {
  const top = bounds.height - 0.53
  return buildWebs([
    cornerWeb({
      corner: floorPoint(bounds.minX, bounds.minZ),
      alongA: south,
      alongB: east,
      drop: 1.05,
      top,
    }),
    cornerWeb({
      corner: floorPoint(bounds.maxX, bounds.minZ),
      alongA: west,
      alongB: south,
      drop: 0.85,
      top,
    }),
    cornerWeb({
      corner: floorPoint(bounds.minX, bounds.maxZ),
      alongA: north,
      alongB: east,
      drop: 0.9,
      top,
    }),
    cornerWeb({
      corner: floorPoint(bounds.maxX, bounds.maxZ),
      alongA: west,
      alongB: north,
      drop: 1.1,
      top,
    }),
    ...windows.filter((_, index) => index % 2 === 1).map(windowWeb),
  ])
}

function armDrape(index: number, depth: number): WebQuad {
  const from = armAngles[index] ?? 0
  const to = armAngles[(index + 1) % armAngles.length] ?? 0
  const y = chandelierLayout.dishY - 0.01
  const start = tipPoint(from, y)
  const end = tipPoint(to, y)
  return {
    cell: "drape",
    corners: [
      start,
      end,
      end
        .clone()
        .lerp(start, 0.3)
        .setY(y - depth),
      start
        .clone()
        .lerp(end, 0.2)
        .setY(y - depth * 1.15),
    ],
  }
}

function crownFan(index: number): WebQuad {
  const angle = (armAngles[index] ?? 0) + Math.PI / armAngles.length
  return {
    cell: "fan",
    corners: [
      radialPoint(0.02, -0.12, angle),
      radialPoint(0.3, -0.42, angle),
      radialPoint(0.42, -0.86, angle),
      radialPoint(0.05, -0.62, angle),
    ],
  }
}

// Webs strung from the chandelier itself, in its local (unscaled) frame.
export function buildChandelierWebs() {
  return buildWebs([
    armDrape(0, 0.34),
    armDrape(3, 0.26),
    armDrape(5, 0.4),
    crownFan(1),
    crownFan(6),
  ])
}
