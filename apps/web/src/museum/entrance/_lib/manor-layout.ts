import { entranceDoor } from "@/museum/_lib/museum-layout"
import {
  archApex,
  lancetHalf,
  tudorHalf,
  type Point2,
} from "@/museum/entrance/_lib/manor-arches"
import { manorFootprint, manorRooms } from "@/museum/gallery/_lib/manor-plan"

export type Point = [x: number, y: number, z: number]

export const facadeZ = entranceDoor.outerZ
const doorHalf = entranceDoor.width / 2
const doorTop = entranceDoor.height

const frontHeight =
  Math.max(
    ...manorRooms
      .filter((room) => room.bounds.maxZ === entranceDoor.innerZ)
      .map((room) => room.bounds.height)
  ) + 0.3

/** The stone skin laid over the manor's front wall, as wide as the manor. */
export const facadeSkin = {
  minX: manorFootprint.minX,
  maxX: manorFootprint.maxX,
  minY: -0.05,
  maxY: frontHeight,
  z: facadeZ + 0.003,
  /** One texture tile, centred on the door so its seam sits off frame. */
  tile: [7.2, frontHeight] as const,
}

const portalArch = tudorHalf({ halfSpan: doorHalf, rise: 0.2 })
const ringHalf = doorHalf + 0.1

export const portal = {
  arch: portalArch,
  springY: doorTop,
  doorHalf,
  ringHalf,
  frameHalf: doorHalf + 0.26,
  labelHalf: doorHalf + 0.3,
  ringDepth: 0.08,
  frameDepth: 0.16,
  spandrelDepth: 0.045,
  transomTop: doorTop + 0.05,
  transomDepth: 0.06,
  labelBottom: doorTop + archApex(portalArch, ringHalf),
  labelHeight: 0.07,
  labelDepth: 0.12,
  plinthHeight: 0.4,
  sillDepth: 0.09,
  rosetteX: 0.74,
  rosetteY: doorTop + 0.235,
}

export const portalTop = portal.labelBottom + portal.labelHeight

export const plinth = {
  top: 0.3,
  capTop: 0.34,
  depth: 0.07,
  capDepth: 0.095,
}

const windowArch = lancetHalf(0.36)

export const manorWindow = {
  arch: windowArch,
  halfSpan: 0.36,
  sill: 0.98,
  springY: 2.5,
  ringHalf: 0.46,
  hoodInner: 0.48,
  hoodOuter: 0.53,
  ringDepth: 0.08,
  hoodDepth: 0.11,
  sillBlock: { halfWidth: 0.52, height: 0.08, depth: 0.12 },
  curtain: { halfWidth: 0.4, bottom: 0.94, top: 3.16 },
  layers: { curtain: facadeZ + 0.0012, glass: facadeZ + 0.0045 },
}

/** Lancets either side of the portal, then along the Salon and the Salle. */
export const manorWindows = [
  -13, -9.6, -6.2, -2.6, 2.6, 6.2, 9.6, 13, 16.2,
].map((centerX) => ({ id: `window-${centerX}`, centerX }))

/** Glowing fanlight above the transom, under the portal arch. */
export const fanlight = {
  bottom: portal.transomTop,
  top: doorTop + archApex(portalArch, doorHalf),
  z: facadeZ + 0.004,
}

export const lanterns = [-1, 1].map((side, index) => ({
  id: `lantern-${side}`,
  center: [side * 1.66, 2.12, facadeZ + 0.27] satisfies Point,
  phase: index * 2.37,
}))

export const lanternLight = { intensity: 2.4, distance: 4.2, decay: 2 }

export const lanternBody = {
  half: 0.075,
  height: 0.3,
  wallGap: 0.27,
  armY: 0.47,
  flameY: -0.03,
}

export const pearlString = {
  radius: 0.0135,
  spacing: 0.031,
  inset: 0.024,
  from: plinth.capTop + 0.04,
}

export type VineSpec = {
  id: string
  points: readonly Point[]
  radius: number
}

const wall = facadeZ + 0.012

/** Dead climbing roses, hand placed so they hug the stone. */
export const vines: readonly VineSpec[] = [
  {
    id: "portal-right",
    radius: 0.02,
    points: [
      [1.34, -0.02, facadeZ + 0.12],
      [1.31, 0.36, facadeZ + 0.115],
      [1.33, 0.48, wall],
      [1.4, 1.1, wall],
      [1.33, 1.7, wall],
      [1.42, 2.3, wall],
      [1.34, 2.85, wall],
      [1.32, 3.08, wall + 0.01],
      [1.17, 3.2, facadeZ + 0.1],
      [0.9, 3.193, facadeZ + 0.13],
      [0.62, 3.198, facadeZ + 0.1],
      [0.42, 3.19, facadeZ + 0.15],
      [0.37, 3.12, facadeZ + 0.165],
      [0.34, 2.98, facadeZ + 0.16],
    ],
  },
  {
    id: "portal-right-climb",
    radius: 0.012,
    points: [
      [1.36, 2.6, wall],
      [1.5, 2.95, wall],
      [1.46, 3.4, wall],
      [1.6, 3.85, wall],
      [1.52, 4.3, wall],
    ],
  },
  {
    id: "window-left",
    radius: 0.018,
    points: [
      [-3.3, -0.02, facadeZ + 0.12],
      [-3.27, 0.36, facadeZ + 0.115],
      [-3.24, 0.48, wall],
      [-3.18, 1.2, wall],
      [-3.26, 1.9, wall],
      [-3.16, 2.6, wall],
      [-3.08, 3.15, wall],
      [-2.86, 3.42, wall],
      [-2.6, 3.48, wall],
      [-2.34, 3.4, wall],
      [-2.12, 3.18, wall],
    ],
  },
]

export type RoseSpec = {
  position: Point
  scale: number
  tilt: number
  isPale?: boolean
}

export const roses: readonly RoseSpec[] = [
  { position: [0.76, 3.215, facadeZ + 0.15], scale: 0.062, tilt: 0.4 },
  { position: [0.35, 3.03, facadeZ + 0.19], scale: 0.055, tilt: -0.5 },
  { position: [1.06, 3.21, facadeZ + 0.13], scale: 0.048, tilt: 1.1 },
  { position: [1.4, 1.95, wall + 0.02], scale: 0.05, tilt: -0.2 },
  { position: [1.33, 1.25, wall + 0.02], scale: 0.042, tilt: 0.9 },
  {
    position: [1.37, 2.72, wall + 0.03],
    scale: 0.058,
    tilt: 0.7,
    isPale: true,
  },
  { position: [1.48, 3.05, wall + 0.02], scale: 0.044, tilt: -1.2 },
  { position: [-2.88, 3.47, wall + 0.02], scale: 0.056, tilt: 0.3 },
  { position: [-3.22, 2.2, wall + 0.02], scale: 0.05, tilt: -0.9 },
  { position: [-3.2, 1.05, wall + 0.02], scale: 0.044, tilt: 0.5 },
  { position: [-2.2, 3.26, wall + 0.03], scale: 0.046, tilt: 1.4 },
]

export type MistLayer = {
  id: string
  center: Point
  size: Point2
  drift: number
  opacity: number
}

/** From the west tower's foot to the east corner, so no sheet hangs past it. */
const mistReach = { minX: facadeSkin.minX - 2, maxX: facadeSkin.maxX }
const mistCenterX = (mistReach.minX + mistReach.maxX) / 2
const mistWidth = mistReach.maxX - mistReach.minX

export const mistLayers: readonly MistLayer[] = [
  {
    id: "mist-wall",
    center: [mistCenterX, 0.3, facadeZ + 0.06],
    size: [mistWidth, 0.8],
    drift: 0.01,
    opacity: 0.46,
  },
  {
    id: "mist-mid",
    center: [mistCenterX, 0.24, facadeZ + 0.3],
    size: [mistWidth, 0.62],
    drift: -0.007,
    opacity: 0.4,
  },
  {
    id: "mist-near",
    center: [mistCenterX, 0.2, facadeZ + 0.62],
    size: [mistWidth, 0.5],
    drift: 0.005,
    opacity: 0.34,
  },
]
