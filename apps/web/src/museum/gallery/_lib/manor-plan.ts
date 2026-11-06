import {
  entranceDoor,
  frontWall,
  type Collider,
} from "@/museum/_lib/museum-layout"
import type { CollectionWorkId } from "@/museum/collection/collection-works"
import type {
  RoomId,
  ManorRoom,
  DoorSpot,
  WorkHang,
  IkebanaSpot,
  ManorPropSpot,
  BenchSpot,
  ChandelierSpot,
  WallMark,
} from "@/museum/gallery/_lib/manor-plan-types"
import type { RoomWall } from "@/museum/gallery/_lib/room-bounds"
import {
  diningCentrepieceSpots,
  paleMarkSize,
  type PropSpot,
} from "@/museum/gallery/props/_lib/prop-spots"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"

// Madame's manor, the one source every room, door, hang and spot is built
// from. Five rooms in a ring: Vestibule → Grand Salon → Couloir des Voiles →
// Boudoir → Salle à manger → back to the Vestibule. x runs east (right as you
// come in), z runs from the front door (z = 0) toward the back (negative).

export type {
  RoomId,
  DoorLock,
  DoorKind,
  RoomPalette,
  RoomLook,
  ManorRoom,
  DoorSpot,
  WorkHang,
  IkebanaStand,
  IkebanaSpot,
  ManorPropSpot,
  BenchSpot,
  ChandelierSpot,
  WallMark,
} from "@/museum/gallery/_lib/manor-plan-types"

const { palette, manor, props } = sceneTokens
const quarter = Math.PI / 2

// Room walls are this thick, outward from their bounds: two rooms side by
// side sit two walls apart. The front wall is thicker (frontWall).
export const partition = 0.15

export const doorHeight = 2.8

export const manorRooms: readonly ManorRoom[] = [
  {
    id: "vestibule",
    name: "Le Vestibule",
    bounds: { minX: -5, maxX: 5, minZ: -8, maxZ: 0, height: 4.5 },
    palette: {
      notes:
        "Black, white and wine: her cape, her perfume, the big chandelier.",
      fill: { sky: manor.candleLight, ground: palette.wine, intensity: 0.22 },
    },
    look: {
      wallpaper: "wallpaper",
      floor: "checker",
      ceilingSteps: [],
      beams: null,
    },
  },
  {
    id: "salon",
    name: "Le Grand Salon",
    bounds: { minX: -15.3, maxX: -5.3, minZ: -9, maxZ: 0, height: 4.5 },
    palette: {
      notes: "Black, white and moon blue, moonlit through the west windows.",
      fill: { sky: manor.moonlight, ground: palette.wine, intensity: 0.2 },
    },
    look: {
      wallpaper: "wallpaper",
      floor: "carpet",
      ceilingSteps: [],
      beams: { acrossZ: [-2.25, -6.75], alongX: [-12.3, -7.3] },
    },
  },
  {
    id: "couloir",
    name: "Le Couloir des Voiles",
    bounds: { minX: -7.8, maxX: 5.2, minZ: -11.8, maxZ: -9.3, height: 3.6 },
    palette: {
      notes: "Tulle, a ceiling that keeps lowering, light cooling to frost.",
      fill: { sky: manor.frost, ground: manor.nightSky, intensity: 0.18 },
    },
    look: {
      wallpaper: "wallpaperVeil",
      floor: "wood",
      ceilingSteps: [3.6, 3.3, 3, 2.8],
      beams: null,
    },
  },
  {
    id: "boudoir",
    name: "Le Boudoir de Madame",
    bounds: { minX: 5.5, maxX: 13.5, minZ: -16.3, maxZ: -8.3, height: 3.8 },
    palette: {
      notes: "Frost blue, nacre and black: her vanity, her dress forms.",
      fill: { sky: manor.frost, ground: props.tulleFrost, intensity: 0.2 },
    },
    look: {
      wallpaper: "wallpaperFrost",
      floor: "frostCarpet",
      ceilingSteps: [],
      beams: null,
    },
  },
  {
    id: "salle",
    name: "La Salle à manger",
    bounds: { minX: 5.3, maxX: 17.3, minZ: -8, maxZ: 0, height: 4.2 },
    palette: {
      notes: "Wine, then candy pink and pop yellow: a table set for two.",
      fill: { sky: palette.blush, ground: palette.wine, intensity: 0.22 },
    },
    look: {
      wallpaper: "wallpaperWine",
      floor: "wood",
      ceilingSteps: [],
      beams: { acrossZ: [-1.6, -6.4], alongX: [8.3, 14.3] },
    },
  },
]

export const doorSpots: readonly DoorSpot[] = [
  {
    id: "salon-door",
    rooms: ["vestibule", "salon"],
    position: [-5.15, 0, -4.5],
    rotationY: quarter,
    width: 1.6,
    height: doorHeight,
    kind: "archway",
    lock: null,
  },
  {
    id: "couloir-door",
    rooms: ["salon", "couloir"],
    position: [-6.55, 0, -9.15],
    rotationY: 0,
    width: 1.2,
    height: 2.6,
    kind: "ribbon",
    lock: "envol",
  },
  {
    // The dead end: the panel beside Requiem, where she went.
    id: "requiem-panel",
    rooms: ["couloir", "boudoir"],
    position: [5.35, 0, -10.55],
    rotationY: -quarter,
    width: 1,
    height: 2.3,
    kind: "panel",
    lock: "requiem",
  },
  {
    // Hidden in the boudoir's wallpaper.
    id: "wallpaper-door",
    rooms: ["boudoir", "salle"],
    position: [11.5, 0, -8.15],
    rotationY: Math.PI,
    width: 1,
    height: 2.4,
    kind: "wallpaper",
    lock: "dedans",
  },
  {
    // Tied with the front door's ribbon; it opens at midnight.
    id: "ribbon-door",
    rooms: ["salle", "vestibule"],
    position: [5.15, 0, -4.5],
    rotationY: quarter,
    width: 1.5,
    height: doorHeight,
    kind: "ribbon",
    lock: "midnight",
  },
]

export const frontDoor = {
  room: "vestibule",
  position: [
    entranceDoor.centerX,
    0,
    (entranceDoor.innerZ + entranceDoor.outerZ) / 2,
  ],
  width: entranceDoor.width,
  height: entranceDoor.height,
} as const satisfies Omit<WallMark, "rotationY">

// Where a frame once hung by the front door; the 13th frame appears here.
export const paleMark: WallMark = {
  room: "vestibule",
  position: [-2.7, 1.65, frontWall.z],
  rotationY: Math.PI,
  ...paleMarkSize,
}

const hang = (
  id: CollectionWorkId,
  room: RoomId,
  [wall, along]: readonly [RoomWall, number],
  viewingDistance: number
): WorkHang => ({ id, room, wall, along, viewingDistance, hangHeight: 1.65 })

// All twelve works in the order a visitor meets them along the ring: in
// each room, one sweep from the doorway you come in by to the one that
// leads on. I · L'Envol in the Salon, II · Le Dedans down the corridor
// (Requiem last, by the panel) and in the Boudoir, III · L'Appétit at table.
export const workHangs: readonly WorkHang[] = [
  hang("fashion-chaos-1", "salon", ["front", -8], 2.5),
  hang("fashion-chaos-2", "salon", ["front", -12], 2.5),
  hang("le-monde-onirique", "salon", ["back", -13], 3),
  hang("a-swan-in-the-city", "salon", ["back", -9.8], 3),
  { ...hang("requiem", "couloir", ["back", 3.6], 2), hangHeight: 1.55 },
  hang("abysses", "boudoir", ["front", 7.8], 2.5),
  hang("mens-tokyo", "boudoir", ["back", 10.8], 3),
  hang("celle-qui-vient-du-dedans", "boudoir", ["right", -12.4], 3),
  hang("le-maraicher", "salle", ["back", 14.6], 2.5),
  hang("brain", "salle", ["right", -4.6], 3),
  hang("le-dejeuner-sur-l-herbe", "salle", ["front", 8.6], 3),
  hang("cannibal-flowers", "salle", ["back", 7.8], 3),
]

// The fixed waking order (phase B): only the next work in it glows.
export const manorWorkOrder: readonly CollectionWorkId[] = workHangs.map(
  (work) => work.id
)

export const benchSpot: BenchSpot = {
  id: "bench-salon",
  room: "salon",
  x: -9.8,
  z: -6,
  width: 2.4,
  depth: 0.6,
}

// Top of the bench cushion, where her ribbon lies.
export const benchSeatTop = 0.52

const warmLight = { color: palette.white, intensity: 24, distance: 11 }

export const chandelierSpots: readonly ChandelierSpot[] = [
  {
    id: "chandelier-vestibule",
    room: "vestibule",
    position: [0, 4.5, -4],
    scale: 1.45,
    light: warmLight,
  },
  {
    id: "chandelier-salon",
    room: "salon",
    position: [-9.8, 4.5, -4.5],
    scale: 1.2,
    light: { ...warmLight, intensity: 20 },
  },
  {
    id: "chandelier-boudoir",
    room: "boudoir",
    position: [9.5, 3.8, -12.3],
    scale: 0.85,
    light: { color: manor.frost, intensity: 10, distance: 9 },
  },
  {
    id: "chandelier-salle",
    room: "salle",
    position: [11.3, 4.2, -4],
    scale: 1.15,
    light: { ...warmLight, intensity: 20 },
  },
]

export const pedestalTop = 1

// Madame sits at the table's west end (-x), the guest at the east end.
export const diningTableSpot: PropSpot = {
  id: "dining-table",
  position: [11.3, 0, -4],
  rotationY: 0,
}

// Two centrepieces 0.7 m apart: close enough for one to bite the other.
const [tableLeft = diningTableSpot.position, tableRight = tableLeft] =
  diningCentrepieceSpots(diningTableSpot)

export const ikebanaSpots: readonly IkebanaSpot[] = [
  {
    role: "vestibule",
    room: "vestibule",
    variant: 1,
    position: [-4.3, pedestalTop, -6.1],
    rotationY: quarter,
    stand: "pedestal",
  },
  {
    role: "boudoir",
    room: "boudoir",
    variant: 2,
    position: [8.9, pedestalTop, -11.4],
    rotationY: -0.6,
    stand: "pedestal",
  },
  {
    role: "table-left",
    room: "salle",
    variant: 0,
    position: [...tableLeft],
    rotationY: 0,
    stand: "table",
  },
  {
    role: "table-right",
    room: "salle",
    variant: 0,
    position: [...tableRight],
    rotationY: Math.PI,
    stand: "table",
  },
]

// Six dress forms in two staggered rows, all turned toward the panel you
// came in through.
const dressFormSpots = (
  [
    [6.4, -12.5],
    [7.3, -12.4],
    [8.2, -12.6],
    [6.85, -13.6],
    [7.75, -13.7],
    [8.65, -13.6],
  ] as const
).map(([x, z], seed): ManorPropSpot => {
  const [doorX, , doorZ] = doorSpots[2]?.position ?? [x, 0, z]
  return {
    id: "dress-form",
    room: "boudoir",
    position: [x, 0, z],
    rotationY: Math.atan2(doorX - x, doorZ - z),
    seed,
  }
})

export const manorPropSpots: readonly ManorPropSpot[] = [
  {
    id: "cape-stand",
    room: "vestibule",
    position: [3.2, 0, -1.1],
    rotationY: Math.PI - 0.5,
  },
  {
    id: "perfume-console",
    room: "vestibule",
    position: [0, 0, -7.78],
    rotationY: 0,
  },
  {
    id: "pale-mark",
    room: "vestibule",
    position: paleMark.position,
    rotationY: paleMark.rotationY,
  },
  {
    id: "birdcage",
    room: "salon",
    position: [-14.4, 0, -4.5],
    rotationY: quarter,
  },
  {
    id: "bench-ribbon",
    room: "salon",
    position: [benchSpot.x, 0, benchSpot.z],
    rotationY: 0,
  },
  { id: "vanity", room: "boudoir", position: [7.3, 0, -16.02], rotationY: 0 },
  ...dressFormSpots,
  { ...diningTableSpot, room: "salle" },
]

export const roomById = new Map<RoomId, ManorRoom>(
  manorRooms.map((room) => [room.id, room])
)

export function roomOf(id: RoomId): ManorRoom {
  const room = roomById.get(id)
  if (!room) {
    throw new Error(`Unknown manor room ${id}`)
  }
  return room
}

// Rooms one doorway away, whatever the lock: they render with this one.
export function neighboursOf(id: RoomId): RoomId[] {
  return doorSpots.flatMap((door) => {
    if (door.rooms[0] === id) {
      return [door.rooms[1]]
    }
    return door.rooms[1] === id ? [door.rooms[0]] : []
  })
}

export function roomAt(x: number, z: number): RoomId | null {
  const room = manorRooms.find(
    ({ bounds }) =>
      x >= bounds.minX &&
      x <= bounds.maxX &&
      z >= bounds.minZ &&
      z <= bounds.maxZ
  )
  return room?.id ?? null
}

// The outer walls' extent, front wall included.
export const manorFootprint: Collider = {
  minX: Math.min(...manorRooms.map((room) => room.bounds.minX)) - partition,
  maxX: Math.max(...manorRooms.map((room) => room.bounds.maxX)) + partition,
  minZ: Math.min(...manorRooms.map((room) => room.bounds.minZ)) - partition,
  maxZ: frontWall.z + frontWall.thickness,
}
