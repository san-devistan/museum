import { artworks } from "@/museum/gallery/_lib/gallery-artworks"
import { roomOpenings } from "@/museum/gallery/_lib/gallery-layout"
import {
  chandelierSpots,
  manorRooms,
  partition,
  roomOf,
  type ManorRoom,
  type RoomId,
} from "@/museum/gallery/_lib/manor-plan"
import type {
  Doorway,
  Point3,
  RoomBounds,
  RoomWall,
} from "@/museum/gallery/_lib/room-bounds"
import {
  wallGapsOf,
  wallMount,
  type WallMount,
} from "@/museum/gallery/_lib/wall-gaps"
import {
  cornerTorcheres,
  sconceY,
  torchereColliders,
  type CandleSet,
} from "@/museum/gallery/candles/_lib/candle-layout"
import type { DecaySpec, PeelSpec } from "@/museum/gallery/decay/wall-decay"
import type {
  FeatherSpec,
  PetalTrail,
} from "@/museum/gallery/remnants/remnants"
import type { VeilSpec } from "@/museum/gallery/tulle/_lib/tulle-geometry"
import {
  windowsInGaps,
  windowFootprint,
  type ManorWindowSpec,
} from "@/museum/gallery/windows/_lib/window-layout"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { Vector3 } from "three"

// How each room of the manor is dressed. The builders are generic; only
// the placements below belong to the rooms.

// A real light: every room has exactly two, so the scene's light count
// (and every compiled shader) stays the same from room to room.
export type RoomLight = {
  id: string
  position: Point3
  color: string
  intensity: number
  distance: number
  flicker: "candle" | "chandelier"
}

export type CarpetPatch = { x: number; z: number; width: number; depth: number }

export type RoomDressing = {
  room: ManorRoom
  doorways: readonly Doorway[]
  windows: readonly ManorWindowSpec[]
  candles: CandleSet
  lights: readonly [RoomLight, RoomLight]
  roses: readonly Point3[]
  decay: readonly DecaySpec[]
  peels: readonly PeelSpec[]
  petals: readonly PetalTrail[]
  feathers: readonly FeatherSpec[]
  carpet: CarpetPatch | null
  veils: readonly VeilSpec[]
  hasCobwebs: boolean
  hasMoonlight: boolean
}

export const moonDirection = new Vector3(1, -0.66, 0.16).normalize()

const { manor } = sceneTokens

function on(bounds: RoomBounds, wall: RoomWall, along: number, y: number) {
  return wallMount({ wall, center: along, width: 0 }, bounds, y)
}

function windowsAt(
  bounds: RoomBounds,
  spots: readonly [RoomWall, number][],
  isMoonlit: boolean
) {
  return windowsInGaps({
    bounds,
    gaps: spots.map(([wall, center]) => ({
      wall,
      center,
      width: windowFootprint,
    })),
    isMoonlit,
    stirringIndex: 1,
  })
}

const stain = (mount: WallMount, width: number, height: number): DecaySpec => ({
  mount,
  cell: "stain",
  width,
  height,
})

const peel = (mount: WallMount, width: number, height: number): DecaySpec => ({
  mount,
  cell: "peel",
  width,
  height,
})

function candleLight(
  position: Point3,
  intensity = 1.8,
  distance = 8
): RoomLight {
  return {
    id: "candles",
    position,
    color: manor.candleLight,
    intensity,
    distance,
    flicker: "candle",
  }
}

function chandelierLight(id: RoomId): RoomLight {
  const spot = chandelierSpots.find((chandelier) => chandelier.room === id)
  const [x = 0, y = 4, z = 0] = spot?.position ?? []
  const scale = spot?.scale ?? 1
  return {
    id: "chandelier",
    position: [x, y - 0.58 * scale, z],
    ...(spot?.light ?? { color: manor.candleLight, intensity: 0, distance: 1 }),
    flicker: "chandelier",
  }
}

const roses = (id: RoomId): Point3[] =>
  chandelierSpots
    .filter((chandelier) => chandelier.room === id)
    .map((chandelier) => [...chandelier.position])

function base(id: RoomId) {
  const room = roomOf(id)
  return {
    room,
    doorways: roomOpenings(room),
    roses: roses(id),
    petals: [],
    feathers: [],
    veils: [],
    hasCobwebs: true,
    hasMoonlight: false,
  }
}

function sconcesBetweenWorks(id: RoomId, walls: readonly RoomWall[]) {
  const { bounds } = roomOf(id)
  const gaps = wallGapsOf(
    bounds,
    artworks.filter((artwork) => artwork.room === id)
  )
  return walls.flatMap((wall) =>
    gaps[wall].map((gap) => wallMount(gap, bounds, sconceY))
  )
}

const vestibule = roomOf("vestibule").bounds
const salon = roomOf("salon").bounds
const couloir = roomOf("couloir").bounds
const boudoir = roomOf("boudoir").bounds
const salle = roomOf("salle").bounds
const couloirMid = (couloir.minZ + couloir.maxZ) / 2

// Ceiling height over x in a room whose ceiling steps down.
export function ceilingAt(room: ManorRoom, x: number) {
  const steps = room.look.ceilingSteps
  const { minX, maxX, height } = room.bounds
  const length = (maxX - minX + partition * 2) / Math.max(1, steps.length)
  const index = Math.floor((x - minX + partition) / length)
  return steps[Math.min(Math.max(index, 0), steps.length - 1)] ?? height
}

const couloirRoom = roomOf("couloir")
const drape = (wall: "front" | "back", x: number): VeilSpec => ({
  position: [
    x,
    ceilingAt(couloirRoom, x) - 0.08,
    wall === "front" ? couloir.maxZ - 0.12 : couloir.minZ + 0.12,
  ],
  rotationY: wall === "front" ? Math.PI : 0,
  width: 1.4,
  height: ceilingAt(couloirRoom, x) - 0.1,
  gap: 0,
})
const parted = (x: number): VeilSpec => ({
  position: [x, ceilingAt(couloirRoom, x) - 0.05, couloirMid],
  rotationY: Math.PI / 2,
  width: couloir.maxZ - couloir.minZ,
  height: ceilingAt(couloirRoom, x) - 0.08,
  gap: 1.1,
})

// Tulle down both walls, and veils parted across the way at each step of
// the ceiling; the last one hangs just before the dead end.
const couloirVeils: readonly VeilSpec[] = [
  ...[-5, -1.4, 2, 4.4].map((x) => drape("front", x)),
  ...[-6.6, -3.2, 0.1].map((x) => drape("back", x)),
  ...[-4.55, -1.25, 2.1, 4.6].map(parted),
]

const salonWindows = windowsAt(
  salon,
  [
    ["left", -2.3],
    ["left", -6.7],
  ],
  true
)

const dressings: readonly RoomDressing[] = [
  {
    ...base("vestibule"),
    windows: [],
    candles: {
      sconces: [
        on(vestibule, "back", -1.6, sconceY),
        on(vestibule, "back", 1.6, sconceY),
        on(vestibule, "front", -1.5, sconceY),
        on(vestibule, "front", 1.5, sconceY),
      ],
      torcheres: cornerTorcheres(vestibule),
    },
    lights: [chandelierLight("vestibule"), candleLight([0, 2.3, -6.9])],
    decay: [
      stain(on(vestibule, "back", 3.4, 3.4), 1.4, 1.2),
      peel(on(vestibule, "front", 3.9, 3), 0.9, 0.85),
      stain(on(vestibule, "left", -1.8, 3.6), 1.1, 1.3),
    ],
    peels: [
      { mount: on(vestibule, "back", -4.3, 3.96), width: 0.32, length: 1 },
    ],
    // Rose petals from the front door to the Salon: she went that way.
    petals: [
      {
        from: [0.3, 0.022, -0.7],
        to: [-4.2, 0.022, -4.4],
        count: 38,
        spread: 0.8,
        seed: 211,
      },
    ],
    carpet: { x: 0, z: -3.4, width: 1.8, depth: 6.8 },
  },
  {
    ...base("salon"),
    windows: salonWindows,
    candles: {
      sconces: sconcesBetweenWorks("salon", ["front", "back"]),
      torcheres: cornerTorcheres(salon).filter(
        (origin) => !(origin.x > salon.maxX - 1 && origin.z < salon.minZ + 1)
      ),
    },
    lights: [chandelierLight("salon"), candleLight([-11.2, 2.1, -8.1])],
    decay: [
      stain(on(salon, "back", -11.3, 3.3), 1.4, 1.5),
      peel(on(salon, "back", -14.5, 2.35), 0.9, 0.8),
      stain(on(salon, "front", -10, 3.4), 1.4, 1.2),
      stain(on(salon, "left", -2.3, 3.6), 1.2, 0.85),
      stain(on(salon, "left", -6.3, 3.58), 1.2, 0.85),
    ],
    peels: [
      { mount: on(salon, "back", -14.4, 3.96), width: 0.32, length: 1 },
      { mount: on(salon, "left", -0.9, 3.96), width: 0.3, length: 0.85 },
    ],
    // Petals from the bench into the moonlight, and a black feather by
    // the swan.
    petals: [
      {
        from: [-10.8, 0.022, -6.15],
        to: [-13.6, 0.022, -6.5],
        count: 46,
        spread: 0.9,
        seed: 223,
      },
      {
        from: [-9.35, 0.522, -6.02],
        to: [-8.95, 0.522, -5.96],
        count: 4,
        spread: 0.18,
        seed: 227,
      },
    ],
    feathers: [{ position: [-9.1, 0.024, -8.2], turn: 0.7 }],
    carpet: {
      x: (salon.minX + salon.maxX) / 2,
      z: (salon.minZ + salon.maxZ) / 2,
      width: salon.maxX - salon.minX,
      depth: salon.maxZ - salon.minZ,
    },
    hasMoonlight: true,
  },
  {
    ...base("couloir"),
    windows: [],
    candles: {
      sconces: [
        ...[-3.2, 0.2].map((x) => on(couloir, "front", x, sconceY)),
        ...[-5, -1.4, 1.6].map((x) => on(couloir, "back", x, sconceY)),
      ],
      torcheres: [],
    },
    // Warm where you come in, frost blue at the dead end.
    lights: [
      candleLight([-6.2, 2.4, couloirMid], 1.6, 7),
      {
        id: "frost",
        position: [3.4, 2.3, couloirMid],
        color: manor.frost,
        intensity: 2.4,
        distance: 7,
        flicker: "chandelier",
      },
    ],
    decay: [
      stain(on(couloir, "front", -1.4, 2.6), 1.1, 0.9),
      stain(on(couloir, "back", -3.4, 2.2), 0.9, 1.1),
    ],
    peels: [{ mount: on(couloir, "front", 2.2, 2.7), width: 0.3, length: 0.8 }],
    carpet: null,
    veils: couloirVeils,
    hasCobwebs: false,
  },
  {
    ...base("boudoir"),
    windows: windowsAt(
      boudoir,
      [
        ["right", -15],
        ["right", -9.3],
      ],
      false
    ),
    candles: {
      sconces: [6.15, 8.45].map((x) => on(boudoir, "back", x, sconceY)),
      torcheres: [
        new Vector3(6, 0, -8.8),
        new Vector3(13, 0, -8.8),
        new Vector3(6, 0, -15.8),
      ],
    },
    lights: [
      chandelierLight("boudoir"),
      candleLight([7.3, 1.6, -15.5], 1.4, 6),
    ],
    decay: [
      stain(on(boudoir, "back", 12.8, 3.1), 1.1, 1.2),
      stain(on(boudoir, "left", -14, 3), 1.2, 1),
    ],
    peels: [
      { mount: on(boudoir, "left", -15.6, 3.3), width: 0.3, length: 0.9 },
    ],
    carpet: {
      x: (boudoir.minX + boudoir.maxX) / 2,
      z: (boudoir.minZ + boudoir.maxZ) / 2,
      width: boudoir.maxX - boudoir.minX,
      depth: boudoir.maxZ - boudoir.minZ,
    },
  },
  {
    ...base("salle"),
    windows: windowsAt(
      salle,
      [
        ["right", -7],
        ["front", 14.2],
      ],
      false
    ),
    candles: {
      sconces: [
        on(salle, "back", 10.2, sconceY),
        on(salle, "back", 12.8, sconceY),
        on(salle, "front", 11.3, sconceY),
      ],
      torcheres: [new Vector3(5.85, 0, -0.55), new Vector3(5.85, 0, -7.45)],
    },
    lights: [chandelierLight("salle"), candleLight([11.3, 1.5, -4], 1.6, 7)],
    decay: [
      stain(on(salle, "back", 11.5, 3.5), 1.4, 1.1),
      peel(on(salle, "front", 16.4, 2.9), 0.9, 0.9),
    ],
    peels: [
      { mount: on(salle, "back", 16.6, 3.66), width: 0.34, length: 0.95 },
    ],
    // Petals from the table to the ribbon door.
    petals: [
      {
        from: [9.5, 0.022, -4.2],
        to: [6, 0.022, -4.5],
        count: 30,
        spread: 0.8,
        seed: 239,
      },
    ],
    carpet: null,
  },
]

export const roomDressings = new Map<RoomId, RoomDressing>(
  dressings.map((dressing) => [dressing.room.id, dressing])
)

export const dressingColliders = dressings.flatMap((dressing) =>
  torchereColliders(dressing.candles.torcheres)
)

export const manorRoomIds: readonly RoomId[] = manorRooms.map((room) => room.id)
