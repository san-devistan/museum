import { doorFaceZ, type Point } from "@/museum/entrance/_lib/entrance-layout"

type Point2 = readonly [x: number, y: number]

export const ribbon = {
  width: 0.058,
  thickness: 0.004,
  lacingX: 0.12,
  rows: [0.92, 1.22, 1.52, 1.82],
  knotLift: 0.18,
  eyelet: { radius: 0.024, tube: 0.007 },
  hover: { glow: 0.35, damping: 12 },
}

const layerGap = 0.004
const baseZ = doorFaceZ + 0.008
const topRow = ribbon.rows.at(-1) ?? 0
const knot: Point2 = [0, topRow + ribbon.knotLift]

const left = -ribbon.lacingX
const right = ribbon.lacingX
const firstRow = ribbon.rows[0] ?? 0

export const ribbonKnot = {
  center: [knot[0], knot[1], baseZ + 5 * layerGap] satisfies Point,
}

export const eyelets: readonly Point[] = ribbon.rows.flatMap((row) => [
  [left, row, doorFaceZ + 0.002],
  [right, row, doorFaceZ + 0.002],
])

export const ribbonHitArea = {
  center: [0, (firstRow + knot[1]) / 2 + 0.05, baseZ + 0.02] satisfies Point,
  size: [0.62, knot[1] - firstRow + 0.5, 0.05] satisfies Point,
}
