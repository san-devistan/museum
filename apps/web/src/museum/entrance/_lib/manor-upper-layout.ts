import { lancetHalf } from "@/museum/entrance/_lib/manor-arches"
import {
  facadeSkin,
  facadeZ,
  manorWindows,
  type Point,
} from "@/museum/entrance/_lib/manor-layout"
import { manorFootprint } from "@/museum/gallery/_lib/manor-plan"
import { MathUtils } from "three"

// Everything above the ground floor's 4.8 m wall: Madame's bedroom storey,
// the slate roof, its chimneys and the corner tower. Sizes start from the
// manor plan's footprint so the roof always covers the rooms below.

const storeyHeight = 3.6

export const upperFloor = {
  minX: facadeSkin.minX,
  maxX: facadeSkin.maxX,
  bottom: facadeSkin.maxY,
  top: facadeSkin.maxY + storeyHeight,
  z: facadeSkin.z,
}

/** The moulded band between the two floors, hiding the skins' seam. */
export const stringCourse = {
  bottom: upperFloor.bottom - 0.05,
  top: upperFloor.bottom + 0.1,
  depth: 0.11,
  dripTop: upperFloor.bottom + 0.15,
  dripDepth: 0.075,
}

export const cornice = {
  bottom: upperFloor.top - 0.36,
  top: upperFloor.top,
  depth: 0.24,
  corbel: { spacing: 0.62, width: 0.14, height: 0.22, depth: 0.17 },
}

/** Smaller lancets upstairs, lined up with the ones below. */
const upperHalfSpan = 0.27

export type LancetSpec = {
  arch: ReturnType<typeof lancetHalf>
  halfSpan: number
  sill: number
  springY: number
  ringHalf: number
  hoodInner: number
  hoodOuter: number
  ringDepth: number
  hoodDepth: number
  sillBlock: { halfWidth: number; height: number; depth: number }
}

function lancet(halfSpan: number, sill: number, springY: number): LancetSpec {
  return {
    arch: lancetHalf(halfSpan),
    halfSpan,
    sill,
    springY,
    ringHalf: halfSpan + 0.08,
    hoodInner: halfSpan + 0.1,
    hoodOuter: halfSpan + 0.14,
    ringDepth: 0.07,
    hoodDepth: 0.1,
    sillBlock: { halfWidth: halfSpan + 0.14, height: 0.07, depth: 0.11 },
  }
}

export const upperWindow = lancet(
  upperHalfSpan,
  upperFloor.bottom + 0.82,
  upperFloor.bottom + 2.02
)

/**
 * How a window's room is lit: dark, a still candle, or Madame's candle
 * drifting past. `candleU` is across the pane, 0 at the left jamb.
 */
export type PaneGlow =
  | { mode: "dark" }
  | { mode: "candle"; candleU: number; strength: number; phase: number }
  | { mode: "wander"; strength: number }

const upperGlows = new Map<number, PaneGlow>([
  [9.6, { mode: "candle", candleU: 0.36, strength: 0.6, phase: 1.7 }],
  [-2.6, { mode: "wander", strength: 0.85 }],
])

export const upperWindows = manorWindows.map(({ centerX }) => ({
  id: `upper-${centerX}`,
  centerX,
  glow: upperGlows.get(centerX) ?? ({ mode: "dark" } satisfies PaneGlow),
}))

/** Madame's walk past the window: one slow pass, then a long dark wait. */
export const candleWalk = {
  firstPass: 4,
  period: 27,
  duration: 9.5,
  from: -0.9,
  to: 1.9,
  height: 0.36,
}

const roofPitch = MathUtils.degToRad(58)
const roofRise = 5.4
const roofRun = roofRise / Math.tan(roofPitch)
const eaveOverhang = 0.42

/** A steep hipped slate roof, flat-topped behind the front ridge. */
export const roof = {
  eaveY: upperFloor.top,
  ridgeY: upperFloor.top + roofRise,
  run: roofRun,
  slope: Math.tan(roofPitch),
  front: facadeZ + eaveOverhang,
  back: manorFootprint.minZ - eaveOverhang,
  minX: manorFootprint.minX - eaveOverhang,
  maxX: manorFootprint.maxX + eaveOverhang,
}

export const ridge = {
  minX: roof.minX + roof.run,
  maxX: roof.maxX - roof.run,
  y: roof.ridgeY,
  z: roof.front - roof.run,
}

/** Height of the main roof's front slope at depth `z`. */
export function roofHeightAt(z: number) {
  return roof.eaveY + (roof.front - z) * roof.slope
}

/** Depth where the main roof's front slope reaches height `y`. */
export function roofDepthAt(y: number) {
  return roof.front - (y - roof.eaveY) / roof.slope
}

/** A steep gable over the portal bay, with a round lace window. */
export const frontGable = {
  halfWidth: 1.75,
  apexY: roof.eaveY + 4.1,
  z: upperFloor.z,
  overhang: 0.3,
  lift: 0.1,
  oculus: { y: roof.eaveY + 1.45, radius: 0.46, ring: 0.09, hood: 0.07 },
}

const dormerBase = roof.eaveY

export const dormer = {
  halfWidth: 0.66,
  frontZ: facadeZ - 0.12,
  bottom: dormerBase + 0.4,
  wallTop: dormerBase + 1.98,
  apexY: dormerBase + 3.0,
  overhang: 0.14,
  lift: 0.07,
  window: lancet(0.21, dormerBase + 1.06, dormerBase + 1.56),
}

export const dormers = [-13, -6.2, 6.2, 13].map((centerX) => ({
  id: `dormer-${centerX}`,
  centerX,
}))

export type ChimneySpec = {
  id: string
  x: number
  z: number
  halfWidth: number
  halfDepth: number
  top: number
  pots: number
}

export const chimneys: readonly ChimneySpec[] = [
  { x: -9.6, top: 2.4, pots: 2, halfWidth: 0.56 },
  { x: 3.7, top: 2.9, pots: 3, halfWidth: 0.7 },
  { x: 12.6, top: 2.2, pots: 2, halfWidth: 0.52 },
].map((spec) => ({
  ...spec,
  id: `chimney-${spec.x}`,
  z: ridge.z - 0.28,
  halfDepth: 0.38,
  top: ridge.y + spec.top,
}))

export const chimney = {
  bottom: ridge.y - 1.6,
  capHeight: 0.24,
  capOut: 0.09,
  pot: { radius: 0.12, height: 0.5, spacing: 0.36 },
}

/** A slender round tower on the west corner, under a witch's-hat roof. */
const towerRadius = 1.85

export const tower = {
  x: manorFootprint.minX - towerRadius + 0.05,
  z: facadeZ - 0.9,
  radius: towerRadius,
  bottom: -0.05,
  top: roof.eaveY + 3.3,
  corbel: { height: 0.46, out: 0.2 },
  bands: [stringCourse.bottom, cornice.bottom],
  roofOut: 0.34,
  roofHeight: 7.8,
  /** Faces turn this far from the front, towards the visitor. */
  facing: 0.42,
  windows: [
    { id: "tower-slit", spec: lancet(0.12, 1.5, 2.45), glow: "dark" },
    { id: "tower-upper", spec: lancet(0.22, 5.75, 6.85), glow: "dark" },
    {
      id: "tower-top",
      spec: lancet(0.2, roof.eaveY + 1.0, roof.eaveY + 1.9),
      glow: "candle",
    },
  ],
} as const

export const towerApex: Point = [
  tower.x,
  tower.top + tower.corbel.height + tower.roofHeight,
  tower.z,
]

export type FinialSpec = {
  id: string
  base: Point
  height: number
  pearl: number
}

export const finials: readonly FinialSpec[] = [
  {
    id: "ridge-west",
    base: [ridge.minX, ridge.y, ridge.z],
    height: 1.15,
    pearl: 0.075,
  },
  {
    id: "ridge-east",
    base: [ridge.maxX, ridge.y, ridge.z],
    height: 1.15,
    pearl: 0.075,
  },
  {
    id: "gable",
    base: [0, frontGable.apexY + frontGable.lift, frontGable.z + 0.12],
    height: 0.95,
    pearl: 0.065,
  },
  ...dormers.map(
    ({ id, centerX }): FinialSpec => ({
      id: `${id}-finial`,
      base: [centerX, dormer.apexY + dormer.lift, dormer.frontZ + 0.08],
      height: 0.55,
      pearl: 0.042,
    })
  ),
  { id: "tower", base: towerApex, height: 1.6, pearl: 0.09 },
]

/** Iron lace along the ridge, between the two ridge finials. */
export const cresting = {
  height: 0.78,
  tile: 0.62,
  minX: ridge.minX + 0.12,
  maxX: ridge.maxX - 0.12,
  y: ridge.y + 0.05,
  z: ridge.z,
}

/** Where the moon hangs: up and to the east, away from the tower. */
export const moon = {
  azimuth: MathUtils.degToRad(29),
  elevation: MathUtils.degToRad(33),
  radius: MathUtils.degToRad(1.25),
}
