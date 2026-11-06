import { meteredPlane } from "@/museum/_lib/metered-box"
import { facet, rod, type Bounds } from "@/museum/entrance/_lib/geometry-parts"
import {
  cresting,
  dormer,
  dormers,
  finials,
  frontGable,
  ridge,
  roof,
  roofDepthAt,
} from "@/museum/entrance/_lib/manor-upper-layout"

/** The gable's roof reaches out over the main eave so no gap opens there. */
const gableFront = roof.front + 0.04
const gableEave = frontGable.halfWidth + 0.3
const gableTop = frontGable.apexY + frontGable.lift
/** Where the gable's ridge dies into the main slope. */
const gableValley: Bounds = [0, gableTop, roofDepthAt(gableTop)]

const eaveWest: Bounds = [roof.minX, roof.eaveY, roof.front]
const eaveEast: Bounds = [roof.maxX, roof.eaveY, roof.front]
const backEast: Bounds = [roof.maxX, roof.eaveY, roof.back]
const backWest: Bounds = [roof.minX, roof.eaveY, roof.back]
const ridgeWest: Bounds = [ridge.minX, ridge.y, ridge.z]
const ridgeEast: Bounds = [ridge.maxX, ridge.y, ridge.z]
const deckBack = roof.back + roof.run
const deckEast: Bounds = [ridge.maxX, ridge.y, deckBack]
const deckWest: Bounds = [ridge.minX, ridge.y, deckBack]

/**
 * The hipped roof as one closed lid. Its front slope is split along the
 * gable's valleys, so the gable wall can rise through the eave.
 */
function mainRoof() {
  const valleyWest: Bounds = [-gableEave, roof.eaveY, roof.front]
  const valleyEast: Bounds = [gableEave, roof.eaveY, roof.front]
  const overGable: Bounds = [0, ridge.y, ridge.z]
  const frontUv = { origin: eaveWest }
  return [
    facet([eaveWest, valleyWest, gableValley, overGable, ridgeWest], frontUv),
    facet([valleyEast, eaveEast, ridgeEast, overGable, gableValley], frontUv),
    facet([eaveEast, backEast, deckEast, ridgeEast]),
    facet([backEast, backWest, deckWest, deckEast]),
    facet([backWest, eaveWest, ridgeWest, deckWest]),
    facet([ridgeWest, ridgeEast, deckEast, deckWest]),
    facet([eaveWest, backWest, backEast, eaveEast]),
  ]
}

type PitchSpec = {
  centerX: number
  eaveHalf: number
  eaveY: number
  apexY: number
  front: number
  back: number
}

/** Two slopes meeting in a ridge that runs back into the main roof. */
function pitchedRoof(spec: PitchSpec) {
  const west: Bounds = [spec.centerX - spec.eaveHalf, spec.eaveY, spec.front]
  const east: Bounds = [spec.centerX + spec.eaveHalf, spec.eaveY, spec.front]
  const apex: Bounds = [spec.centerX, spec.apexY, spec.front]
  const back = (point: Bounds): Bounds => [point[0], point[1], spec.back]
  return [
    facet([back(west), west, apex, back(apex)]),
    facet([east, back(east), back(apex), apex]),
  ]
}

const gableSpec: PitchSpec = {
  centerX: 0,
  eaveHalf: gableEave,
  eaveY: roof.eaveY,
  apexY: gableTop,
  front: gableFront,
  back: gableValley[2] - 0.3,
}

function dormerSpec(centerX: number): PitchSpec {
  const top = dormer.apexY + dormer.lift
  const rake = (dormer.apexY - dormer.wallTop) / dormer.halfWidth
  return {
    centerX,
    eaveHalf: dormer.halfWidth + dormer.overhang,
    eaveY: dormer.wallTop + dormer.lift - dormer.overhang * rake,
    apexY: top,
    front: dormer.frontZ + dormer.overhang,
    back: roofDepthAt(top) - 0.3,
  }
}

/** A dormer's slate cheeks, from its front back into the slope. */
function dormerCheeks(centerX: number) {
  const back = roofDepthAt(dormer.wallTop) - 0.2
  const { frontZ, bottom, wallTop, halfWidth } = dormer
  return [-1, 1].map((side) => {
    const x = centerX + side * halfWidth
    const [from, to] = side > 0 ? [frontZ, back] : [back, frontZ]
    return facet([
      [x, bottom, from],
      [x, bottom, to],
      [x, wallTop, to],
      [x, wallTop, from],
    ])
  })
}

function rakes(spec: PitchSpec, radius: number) {
  const apex: Bounds = [spec.centerX, spec.apexY + radius, spec.front]
  return [-1, 1].map((side) =>
    rod(
      [spec.centerX + side * spec.eaveHalf, spec.eaveY + radius, spec.front],
      apex,
      radius
    )
  )
}

function finialSpikes() {
  return finials.map(({ base, height }) =>
    rod(base, [base[0], base[1] + height, base[2]], [height * 0.05, 0.006])
  )
}

function roofLead() {
  const roll = 0.07
  const lift = (point: Bounds): Bounds => [point[0], point[1] + roll, point[2]]
  return [
    rod(lift(ridgeWest), lift(ridgeEast), roll),
    rod(lift(eaveWest), lift(ridgeWest), roll * 0.85),
    rod(lift(eaveEast), lift(ridgeEast), roll * 0.85),
    rod(
      [roof.minX, roof.eaveY - 0.05, roof.front + 0.05],
      [roof.maxX, roof.eaveY - 0.05, roof.front + 0.05],
      0.08
    ),
    ...rakes(gableSpec, 0.06),
    ...dormers.flatMap(({ centerX }) => rakes(dormerSpec(centerX), 0.045)),
    ...finialSpikes(),
  ]
}

/** The main roof, gable and dormer roofs, by material. */
export function roofParts() {
  return {
    slate: [
      ...mainRoof(),
      ...pitchedRoof(gableSpec),
      ...dormers.flatMap(({ centerX }) => [
        ...pitchedRoof(dormerSpec(centerX)),
        ...dormerCheeks(centerX),
      ]),
    ],
    lead: roofLead(),
  }
}

/** One strip of iron lace standing on the ridge roll. */
export function crestingGeometry() {
  const length = cresting.maxX - cresting.minX
  return meteredPlane(length, cresting.height)
    .clone()
    .translate(
      (cresting.minX + cresting.maxX) / 2,
      cresting.y + cresting.height / 2,
      cresting.z
    )
}

/** Pearls threaded on each finial, for the facade's pearl instances. */
export function finialPearls() {
  return finials.flatMap(({ base, height, pearl }) => [
    [base[0], base[1] + height * 0.42, base[2], pearl] as const,
    [base[0], base[1] + height * 0.72, base[2], pearl * 0.6] as const,
  ])
}
