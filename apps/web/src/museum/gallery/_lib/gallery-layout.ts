import {
  entranceDoor,
  frontWall,
  type Collider,
} from "@/museum/_lib/museum-layout"
import {
  benchSpot,
  chandelierSpots,
  doorSpots,
  frontDoor,
  ikebanaSpots,
  manorFootprint,
  manorRooms,
  partition,
  type DoorSpot,
  type ManorRoom,
  type RoomId,
} from "@/museum/gallery/_lib/manor-plan"
import type { Doorway, RoomWall } from "@/museum/gallery/_lib/room-bounds"
import {
  benchSolids,
  ceilingBeamSolids,
  decor,
  obstacle,
  pedestalSolids,
  type BenchSpec,
  type GallerySolid,
} from "@/museum/gallery/_lib/room-solids"

export type {
  BoxFace,
  GallerySolid,
  Point,
} from "@/museum/gallery/_lib/room-solids"
export { benchFrame } from "@/museum/gallery/_lib/room-solids"

// An opening in one of a room's walls, with the height of its head.
export type RoomOpening = Doorway & { id: string; height: number }

const wallTolerance = 0.4

// Which of a room's walls a door spot stands in, if any.
function wallOfPoint(room: ManorRoom, x: number, z: number): RoomWall | null {
  const { bounds } = room
  const isAlongZ = z >= bounds.minZ && z <= bounds.maxZ
  const isAlongX = x >= bounds.minX && x <= bounds.maxX
  if (isAlongZ && Math.abs(x - bounds.minX) < wallTolerance) {
    return "left"
  }
  if (isAlongZ && Math.abs(x - bounds.maxX) < wallTolerance) {
    return "right"
  }
  if (isAlongX && Math.abs(z - bounds.minZ) < wallTolerance) {
    return "back"
  }
  return isAlongX && Math.abs(z - bounds.maxZ) < wallTolerance ? "front" : null
}

type OpeningSpot = {
  id: string
  rooms: readonly RoomId[]
  position: readonly [number, number, number]
  width: number
  height: number
}

const doorOpenings: readonly OpeningSpot[] = [
  ...doorSpots,
  { ...frontDoor, id: "front-door", rooms: [frontDoor.room] },
]

// Every opening in a room's walls: its doors and, in the Vestibule, the
// front door.
export function roomOpenings(room: ManorRoom): RoomOpening[] {
  return doorOpenings.flatMap((door) => {
    if (!door.rooms.includes(room.id)) {
      return []
    }
    const [x, , z] = door.position
    const wall = wallOfPoint(room, x, z)
    if (!wall) {
      return []
    }
    const center = wall === "left" || wall === "right" ? z : x
    return [
      { id: door.id, wall, center, width: door.width, height: door.height },
    ]
  })
}

const touchesFront = (room: ManorRoom) => room.bounds.maxZ === frontWall.z

type WallRun = {
  wall: RoomWall
  from: number
  to: number
  // Across the wall: its centre line and thickness.
  at: number
  thickness: number
}

function wallRuns(room: ManorRoom): WallRun[] {
  const { minX, maxX, minZ, maxZ } = room.bounds
  const front = touchesFront(room) ? frontWall.thickness : partition
  return [
    {
      wall: "front",
      from: minX - partition,
      to: maxX + partition,
      at: maxZ + front / 2,
      thickness: front,
    },
    {
      wall: "back",
      from: minX - partition,
      to: maxX + partition,
      at: minZ - partition / 2,
      thickness: partition,
    },
    {
      wall: "left",
      from: minZ,
      to: maxZ,
      at: minX - partition / 2,
      thickness: partition,
    },
    {
      wall: "right",
      from: minZ,
      to: maxZ,
      at: maxX + partition / 2,
      thickness: partition,
    },
  ]
}

type WallPiece = {
  id: string
  from: number
  to: number
  y0: number
  y1: number
}

// Splits one wall into full-height stretches and lintels over its openings.
function wallPieces(
  run: WallRun,
  openings: readonly RoomOpening[],
  top: number
) {
  // This wall's openings, in order along it.
  const holes: RoomOpening[] = []
  for (const opening of openings) {
    if (opening.wall === run.wall) {
      const at = holes.findIndex((other) => other.center > opening.center)
      holes.splice(at === -1 ? holes.length : at, 0, opening)
    }
  }
  const pieces: WallPiece[] = []
  let cursor = run.from
  for (const hole of holes) {
    const start = hole.center - hole.width / 2
    const end = hole.center + hole.width / 2
    pieces.push(
      { id: `to-${hole.id}`, from: cursor, to: start, y0: 0, y1: top },
      { id: `over-${hole.id}`, from: start, to: end, y0: hole.height, y1: top }
    )
    cursor = end
  }
  pieces.push({ id: "end", from: cursor, to: run.to, y0: 0, y1: top })
  return pieces.filter((piece) => piece.to - piece.from > 0.001)
}

function wallSolid(room: ManorRoom, run: WallRun, piece: WallPiece) {
  const along = (piece.from + piece.to) / 2
  const length = piece.to - piece.from
  const height = piece.y1 - piece.y0
  const isAlongX = run.wall === "front" || run.wall === "back"
  const isFacade = run.wall === "front" && room.id === frontDoor.room
  // A lintel over a doorway is walked under, not into.
  const solid = piece.y0 > 0 ? decor : obstacle
  return solid({
    id: `${room.id}-wall-${run.wall}-${piece.id}`,
    color: "wall",
    surface: room.look.wallpaper,
    facadeFace: isFacade ? "pz" : undefined,
    center: isAlongX
      ? [along, piece.y0 + height / 2, run.at]
      : [run.at, piece.y0 + height / 2, along],
    size: isAlongX
      ? [length, height, run.thickness]
      : [run.thickness, height, length],
  })
}

function wallSolids(room: ManorRoom): GallerySolid[] {
  const openings = roomOpenings(room)
  return wallRuns(room).flatMap((run) =>
    wallPieces(run, openings, room.bounds.height).map((piece) =>
      wallSolid(room, run, piece)
    )
  )
}

// Floor under the room and its walls; one ceiling, or the corridor's steps
// with a drop between each.
function slabSolids(room: ManorRoom): GallerySolid[] {
  const { minX, maxX, minZ, maxZ, height } = room.bounds
  const front = touchesFront(room) ? frontWall.thickness : partition
  const x0 = minX - partition
  const z0 = minZ - partition
  const z1 = maxZ + front
  const depth = z1 - z0
  const steps = room.look.ceilingSteps.length
    ? room.look.ceilingSteps
    : [height]
  const stepLength = (maxX - minX + partition * 2) / steps.length
  const ceilings = steps.map((stepHeight, index) =>
    decor({
      id: `${room.id}-ceiling-${index}`,
      color: "ceiling",
      surface: room.look.wallpaper,
      center: [
        x0 + stepLength * (index + 0.5),
        stepHeight + partition / 2,
        (z0 + z1) / 2,
      ],
      size: [stepLength, partition, depth],
    })
  )
  const drops = steps.slice(1).map((stepHeight, index) => {
    const above = steps[index] ?? stepHeight
    return decor({
      id: `${room.id}-ceiling-drop-${index}`,
      color: "ceiling",
      surface: room.look.wallpaper,
      center: [
        x0 + stepLength * (index + 1),
        (stepHeight + above) / 2,
        (z0 + z1) / 2,
      ],
      size: [partition, above - stepHeight, depth],
    })
  })
  return [
    decor({
      id: `${room.id}-floor`,
      color: "floor",
      surface: room.look.floor,
      center: [(minX + maxX) / 2, -0.15, (z0 + z1) / 2],
      size: [maxX - minX + partition * 2, 0.3, depth],
    }),
    ...ceilings,
    ...drops,
  ]
}

export const benchSpecs: readonly (BenchSpec & { room: RoomId })[] = [benchSpot]

export const pedestalSpots = ikebanaSpots
  .filter((spot) => spot.stand === "pedestal")
  .map((spot) => ({
    id: `pedestal-${spot.role}`,
    room: spot.room,
    x: spot.position[0],
    z: spot.position[2],
  }))

function furnitureSolids(id: RoomId): GallerySolid[] {
  return [
    ...(benchSpot.room === id ? benchSolids(benchSpot) : []),
    ...pedestalSpots.filter((spot) => spot.room === id).flatMap(pedestalSolids),
  ]
}

// Every box of one room: walls, floor, ceiling, beams and furniture.
export function roomSolids(room: ManorRoom): GallerySolid[] {
  return [
    ...wallSolids(room),
    ...slabSolids(room),
    ...(room.look.beams ? ceilingBeamSolids(room.bounds, room.look.beams) : []),
    ...furnitureSolids(room.id),
  ]
}

export const manorSolids = new Map<RoomId, readonly GallerySolid[]>(
  manorRooms.map((room) => [room.id, roomSolids(room)])
)

const doorLeft = entranceDoor.centerX - entranceDoor.width / 2
const doorRight = entranceDoor.centerX + entranceDoor.width / 2

// The player is clamped to the manor's outline; walls do the rest.
export const walkableBounds: Collider = {
  minX: manorFootprint.minX,
  maxX: manorFootprint.maxX,
  minZ: manorFootprint.minZ,
  maxZ: entranceDoor.outerZ + 1,
}

export const doorwayExit: Collider = {
  minX: doorLeft,
  maxX: doorRight,
  minZ: (entranceDoor.innerZ + entranceDoor.outerZ) / 2,
  maxZ: walkableBounds.maxZ,
}

const openLeafReach = entranceDoor.width / 2 + 0.05

export const doorLeafColliders: readonly Collider[] = [
  {
    minX: doorLeft - 0.12,
    maxX: doorLeft + 0.12,
    minZ: entranceDoor.innerZ - openLeafReach,
    maxZ: entranceDoor.innerZ,
  },
  {
    minX: doorRight - 0.12,
    maxX: doorRight + 0.12,
    minZ: entranceDoor.innerZ - openLeafReach,
    maxZ: entranceDoor.innerZ,
  },
]

// Where the visitor can stand: each room, and each doorway's passage
// through the walls between two rooms.
export const walkAreas: readonly (Collider & { id: string })[] = [
  ...manorRooms.map((room) => ({ id: room.id, ...room.bounds })),
  ...doorSpots.map((door) => ({ id: door.id, ...doorBlocker(door) })),
]

// The doorway's opening as a box through the wall: a collider that closes
// it while the door is locked.
export function doorBlocker(door: DoorSpot): Collider {
  const [x, , z] = door.position
  const isAcrossX = Math.abs(Math.sin(door.rotationY)) > 0.5
  const half = door.width / 2
  return isAcrossX
    ? {
        minX: x - partition,
        maxX: x + partition,
        minZ: z - half,
        maxZ: z + half,
      }
    : {
        minX: x - half,
        maxX: x + half,
        minZ: z - partition,
        maxZ: z + partition,
      }
}

export function solidCollider(solid: GallerySolid): Collider {
  return {
    minX: solid.center[0] - solid.size[0] / 2,
    maxX: solid.center[0] + solid.size[0] / 2,
    minZ: solid.center[2] - solid.size[2] / 2,
    maxZ: solid.center[2] + solid.size[2] / 2,
  }
}

export const chandeliers = chandelierSpots
