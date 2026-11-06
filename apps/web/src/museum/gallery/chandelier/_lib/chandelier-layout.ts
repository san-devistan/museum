import { Vector3 } from "three"

export const chandelierSize = { radius: 0.75, drop: 1.25 } as const

export type ProfilePoint = readonly [number, number]

export type TubePath = {
  points: Vector3[]
  radius: number
}

const armCount = 8
const yAxis = new Vector3(0, 1, 0)

export const chandelierLayout = {
  armCount,
  tipRadius: 0.66,
  dishY: -0.74,
  dishRadius: 0.058,
  crownY: -0.36,
  chain: { top: -0.09, step: 0.042, links: 5 },
  candle: { radius: 0.015, height: 0.12, baseY: -0.72 },
  flame: { width: 0.05, height: 0.062, baseY: -0.602 },
  lightY: -0.58,
  light: { intensity: 24, distance: 14, decay: 2 },
} as const

export const armAngles = Array.from(
  { length: armCount },
  (_, index) => (index / armCount) * Math.PI * 2
)

export const halfStepAngles = armAngles.map(
  (angle) => angle + Math.PI / armCount
)

export function radialPoint(radius: number, y: number, angle: number) {
  return new Vector3(radius, y, 0).applyAxisAngle(yAxis, angle)
}

export function radialDirection(angle: number) {
  return new Vector3(1, 0, 0).applyAxisAngle(yAxis, angle)
}

export function tipPoint(angle: number, y: number = chandelierLayout.dishY) {
  return radialPoint(chandelierLayout.tipRadius, y, angle)
}

export const canopyProfile: readonly ProfilePoint[] = [
  [0, -0.072],
  [0.012, -0.07],
  [0.017, -0.062],
  [0.03, -0.054],
  [0.07, -0.042],
  [0.105, -0.026],
  [0.13, -0.012],
  [0.132, -0.003],
  [0, -0.003],
]

export const columnTopProfile: readonly ProfilePoint[] = [
  [0, -0.376],
  [0.014, -0.374],
  [0.03, -0.368],
  [0.084, -0.364],
  [0.088, -0.36],
  [0.084, -0.356],
  [0.03, -0.354],
  [0.012, -0.348],
  [0.012, -0.322],
  [0.028, -0.316],
  [0.031, -0.302],
  [0.018, -0.29],
  [0, -0.287],
]

export const columnBaseProfile: readonly ProfilePoint[] = [
  [0, -1.088],
  [0.018, -1.083],
  [0.028, -1.068],
  [0.022, -1.052],
  [0.012, -1.042],
  [0.014, -1.024],
  [0.032, -1.004],
  [0.052, -0.974],
  [0.07, -0.934],
  [0.082, -0.89],
  [0.088, -0.858],
  [0.092, -0.842],
  [0.092, -0.792],
  [0.064, -0.786],
  [0.03, -0.781],
  [0.016, -0.776],
  [0, -0.774],
]

export const crystalBulbProfile: readonly ProfilePoint[] = [
  [0, -0.778],
  [0.016, -0.776],
  [0.046, -0.766],
  [0.068, -0.738],
  [0.074, -0.702],
  [0.062, -0.656],
  [0.036, -0.618],
  [0.015, -0.594],
  [0, -0.591],
]

export const crystalVaseProfile: readonly ProfilePoint[] = [
  [0, -0.594],
  [0.015, -0.592],
  [0.034, -0.578],
  [0.05, -0.548],
  [0.052, -0.516],
  [0.04, -0.488],
  [0.022, -0.466],
  [0.016, -0.442],
  [0.022, -0.42],
  [0.034, -0.4],
  [0.03, -0.384],
  [0.014, -0.377],
  [0, -0.376],
]

export const cupProfile: readonly ProfilePoint[] = [
  [0, -0.75],
  [0.012, -0.748],
  [0.014, -0.736],
  [0.03, -0.726],
  [0.04, -0.712],
  [0.042, -0.706],
  [0.034, -0.708],
  [0.016, -0.714],
]

export const dishProfile: readonly ProfilePoint[] = [
  [0.012, -0.012],
  [0.034, -0.009],
  [0.052, -0.002],
  [0.058, 0.003],
  [0.05, 0.002],
  [0.03, -0.003],
  [0.012, -0.006],
]

export const teardropProfile: readonly ProfilePoint[] = [
  [0, -1],
  [0.12, -0.97],
  [0.22, -0.88],
  [0.25, -0.76],
  [0.22, -0.6],
  [0.15, -0.4],
  [0.07, -0.18],
  [0, 0],
]

export const haloSize = 0.2

export const flameProfile: readonly ProfilePoint[] = [
  [0, 0],
  [0.22, 0.06],
  [0.34, 0.2],
  [0.32, 0.38],
  [0.2, 0.62],
  [0.08, 0.86],
  [0, 1],
]

type SpiralSpec = {
  center: ProfilePoint
  radius: number
  startAngle: number
  turns: number
  clockwise?: boolean
}

const spiralSteps = 20

function spiral({ center, radius, startAngle, turns, clockwise }: SpiralSpec) {
  const direction = clockwise ? -1 : 1
  return Array.from({ length: spiralSteps + 1 }, (_, step) => {
    const progress = step / spiralSteps
    const angle = startAngle + direction * progress * turns * Math.PI * 2
    const reach = radius * (1 - 0.7 * progress)
    return new Vector3(
      center[0] + Math.cos(angle) * reach,
      center[1] + Math.sin(angle) * reach,
      0
    )
  })
}

function planar(points: readonly ProfilePoint[]) {
  return points.map(([radius, y]) => new Vector3(radius, y, 0))
}

export const armPaths: readonly TubePath[] = [
  {
    radius: 0.0085,
    points: planar([
      [0.05, -0.8],
      [0.16, -0.85],
      [0.29, -0.888],
      [0.43, -0.89],
      [0.545, -0.865],
      [0.625, -0.818],
      [0.655, -0.778],
      [0.66, -0.748],
    ]),
  },
  {
    radius: 0.0055,
    points: [
      ...planar([
        [0.082, -0.362],
        [0.15, -0.37],
      ]),
      ...spiral({
        center: [0.205, -0.425],
        radius: 0.056,
        startAngle: Math.PI / 2,
        turns: 1.15,
        clockwise: true,
      }),
    ],
  },
  {
    radius: 0.0055,
    points: [
      ...planar([
        [0.37, -0.888],
        [0.33, -0.89],
      ]),
      ...spiral({
        center: [0.31, -0.93],
        radius: 0.04,
        startAngle: Math.PI / 2,
        turns: 1.1,
      }),
    ],
  },
]

export const crownCurlPath: TubePath = {
  radius: 0.005,
  points: [
    ...planar([
      [0.084, -0.36],
      [0.11, -0.364],
    ]),
    ...spiral({
      center: [0.128, -0.33],
      radius: 0.034,
      startAngle: -Math.PI / 2,
      turns: 0.95,
    }),
  ],
}
