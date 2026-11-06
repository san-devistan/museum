import { archCurve, resample, shift } from "@/museum/entrance/_lib/manor-arches"
import {
  facadeZ,
  lanternBody,
  lanterns,
  pearlString,
  plinth,
  portal,
} from "@/museum/entrance/_lib/manor-layout"
import { finialPearls } from "@/museum/entrance/_lib/roof-geometry"
import { Matrix4, SphereGeometry } from "three"

/** A short string of pearls hanging from each lantern's drop finial. */
function lanternTears() {
  const below = lanternBody.height / 2 + 0.128
  return lanterns.flatMap(({ center: [x, y, z] }) =>
    [0.0085, 0.0078, 0.007, 0.0062, 0.0054].map((size, index) => {
      const drop = below + index * 0.0165 + size
      return [x, y - drop, z, size] as const
    })
  )
}

/** Pearls sewn along the portal's inner edge, plus a boss in each spandrel. */
function pearlMatrices() {
  const { radius, spacing, inset, from } = pearlString
  const halfSpan = portal.doorHalf + inset
  const bottom = Math.max(from, plinth.capTop)
  const path = [
    [-halfSpan, bottom] as const,
    ...shift(archCurve(portal.arch(halfSpan)), [0, portal.springY]),
    [halfSpan, bottom] as const,
  ]
  const beadZ = facadeZ + portal.ringDepth + radius * 0.35
  const bossZ = facadeZ + portal.spandrelDepth + radius
  const beads = resample(path, spacing).map(
    ([x, y]) => [x, y, beadZ, radius] as const
  )
  const bosses = [-1, 1].map(
    (side) =>
      [side * portal.rosetteX, portal.rosetteY, bossZ, radius * 2.2] as const
  )
  const matrix = new Matrix4()
  return Float32Array.from(
    [...beads, ...bosses, ...lanternTears(), ...finialPearls()].flatMap(
      ([x, y, z, size]) => [
        ...matrix.makeScale(size, size, size).setPosition(x, y, z).elements,
      ]
    )
  )
}

const matrices = pearlMatrices()

export const pearlInstances = { count: matrices.length / 16, matrices }

export const pearlGeometry = new SphereGeometry(1, 14, 10)
