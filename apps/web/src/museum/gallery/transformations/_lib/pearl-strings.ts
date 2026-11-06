import { createRandom } from "@/museum/_lib/relief/height-field"
import type { ChandelierSpot } from "@/museum/gallery/_lib/manor-plan"
import {
  armAngles,
  chandelierLayout,
  halfStepAngles,
  radialPoint,
} from "@/museum/gallery/chandelier/_lib/chandelier-layout"
import { SphereGeometry, Vector3 } from "three"

// Strings of pearls that lower slowly from a chandelier, from Abysses and
// celle qui vient du dedans: one under each arm's dish and a longer one
// between each pair of arms.

export type PearlString = {
  top: Vector3
  length: number
  delay: number
  phase: number
  count: number
}

export const pearlSize = { radius: 0.0095, spacing: 0.027 }
export const lowerDuration = 8
export const swaySettle = 3

const innerRadius = 0.36
const innerY = -0.52

export function pearlStrings(spot: ChandelierSpot): PearlString[] {
  const random = createRandom(613)
  const origin = new Vector3(...spot.position)
  const hang = (
    point: Vector3,
    length: readonly [number, number]
  ): PearlString => {
    const reach = length[0] + (length[1] - length[0]) * random()
    return {
      top: point.multiplyScalar(spot.scale).add(origin),
      length: reach,
      delay: random() * 2.5,
      phase: random() * Math.PI * 2,
      count: Math.floor(reach / pearlSize.spacing) + 1,
    }
  }
  return [
    ...armAngles.map((angle) =>
      hang(
        radialPoint(
          chandelierLayout.tipRadius,
          chandelierLayout.dishY - 0.03,
          angle
        ),
        [0.45, 0.85]
      )
    ),
    ...halfStepAngles.map((angle) =>
      hang(radialPoint(innerRadius, innerY, angle), [0.9, 1.35])
    ),
  ]
}

export function pearlCount(strings: readonly PearlString[]) {
  return strings.reduce((total, string) => total + string.count, 0)
}

export function lowerLength(strings: readonly PearlString[]) {
  return (
    strings.reduce((latest, string) => Math.max(latest, string.delay), 0) +
    lowerDuration +
    swaySettle
  )
}

// Small and few-sided: hundreds of them hang at once.
export const pearlBead = new SphereGeometry(1, 8, 6)

// Writes every pearl's matrix for `elapsed` seconds after the chapter woke:
// each string pays out from the top, swaying a little as it comes down.
export function writePearls(
  strings: readonly PearlString[],
  elapsed: number,
  isStill: boolean,
  out: { [index: number]: number }
) {
  let index = 0
  for (const string of strings) {
    const time = Math.min(
      Math.max(elapsed - string.delay, 0),
      lowerDuration + swaySettle
    )
    const lowered = isStill ? 1 : Math.min(1, time / lowerDuration)
    const eased = 1 - (1 - lowered) * (1 - lowered)
    const length = string.length * eased
    const calm = isStill
      ? 0
      : Math.max(0, 1 - Math.max(0, time - lowerDuration) / swaySettle)
    const swayX = Math.sin(time * 1.3 + string.phase) * 0.05 * calm
    const swayZ = Math.cos(time * 1.1 + string.phase) * 0.04 * calm
    for (let bead = 0; bead < string.count; bead += 1) {
      const fromBottom = bead * pearlSize.spacing
      const isOut = fromBottom <= length
      const depth =
        Math.max(0, length - fromBottom) / Math.max(string.length, 1e-6)
      const offset = index * 16
      const radius = isOut ? pearlSize.radius : 0
      out[offset] = radius
      out[offset + 5] = radius
      out[offset + 10] = radius
      out[offset + 12] = string.top.x + swayX * depth
      out[offset + 13] = string.top.y - length + fromBottom
      out[offset + 14] = string.top.z + swayZ * depth
      out[offset + 15] = 1
      index += 1
    }
  }
}
