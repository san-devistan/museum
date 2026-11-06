import { propSurfaces } from "@/museum/gallery/props/_lib/prop-spots"

// The table for two, in its own metres: length along x, Madame at -x, the
// guest at +x, front (+z) toward the room.
export const table = {
  length: 2,
  width: 1,
  top: propSurfaces.diningTableTop,
  slab: 0.045,
  apron: 0.1,
  legInset: { x: 0.12, z: 0.1 },
  clothDrop: 0.3,
} as const

export const woodTop = table.top - 0.005

type Spot = { x: number; z: number }

// Her side: she was sitting at -x and has just stood up.
export const herPlace = {
  plate: { x: -0.8, z: 0 },
  glass: { x: -0.66, z: 0.27 },
  knife: { x: -0.8, z: 0.19 },
  napkin: { x: -0.92, z: -0.27 },
  chair: { x: -1.35, z: 0.1, turn: Math.PI / 2 + 0.35 },
} as const

// The visitor's place at +x, card on the folded napkin.
export const guestPlace = {
  plate: { x: 0.8, z: 0 },
  glass: { x: 0.66, z: -0.27 },
  fork: { x: 0.8, z: 0.19 },
  knife: { x: 0.8, z: -0.19 },
  chair: { x: 1.17, z: 0, turn: -Math.PI / 2 },
} as const

// Off the stretch between the centrepieces, so it stays clear.
export const cakeSpot: Spot = { x: -0.58, z: -0.3 }
export const candelabraSpot: Spot = { x: 0.58, z: 0.3 }
