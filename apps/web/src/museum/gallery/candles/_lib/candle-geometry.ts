import {
  candleRadius,
  mountMatrix,
  sconceCups,
  torchere,
  torchereCupOffsets,
  type Candle,
  type CandleSet,
} from "@/museum/gallery/candles/_lib/candle-layout"
import {
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

type Profile = readonly (readonly [number, number])[]

function lathe(profile: Profile, segments: number) {
  return new LatheGeometry(
    profile.map(([radius, y]) => new Vector2(radius, y)),
    segments
  )
}

function tube(points: readonly Vector3[], radius: number) {
  return new TubeGeometry(
    new CatmullRomCurve3([...points]),
    points.length * 6,
    radius,
    6,
    false
  )
}

const bobecheProfile: Profile = [
  [0.012, -0.016],
  [0.04, -0.007],
  [0.052, 0.002],
  [0.05, 0.006],
  [0.026, 0.002],
  [0.025, 0.022],
  [0.02, 0.026],
  [0, 0.026],
]

function bobeche(at: Vector3) {
  return lathe(bobecheProfile, 16).translate(at.x, at.y - 0.026, at.z)
}

const shaftProfile: Profile = [
  [0, 0.2],
  [0.055, 0.2],
  [0.064, 0.226],
  [0.05, 0.262],
  [0.024, 0.292],
  [0.017, 0.5],
  [0.034, 0.53],
  [0.04, 0.56],
  [0.03, 0.592],
  [0.015, 0.62],
  [0.013, 1.0],
  [0.03, 1.03],
  [0.035, 1.06],
  [0.022, 1.09],
  [0.013, 1.12],
  [0.013, 1.35],
  [0.03, 1.372],
  [0.12, 1.398],
  [0.132, 1.415],
  [0.112, 1.418],
  [0.03, 1.412],
  [0.024, 1.43],
  [0, 1.432],
]

function tripodLeg(angle: number) {
  const points = [
    new Vector3(0.02, 0.26, 0),
    new Vector3(0.09, 0.22, 0),
    new Vector3(0.18, 0.1, 0),
    new Vector3(0.23, 0.025, 0),
    new Vector3(0.29, 0.02, 0),
    new Vector3(0.31, 0.05, 0),
    new Vector3(0.285, 0.065, 0),
  ]
  return tube(points, 0.012).rotateY(angle)
}

function torchereArm(angle: number) {
  const points = [
    new Vector3(0.012, 1.3, 0),
    new Vector3(0.08, 1.262, 0),
    new Vector3(0.16, 1.3, 0),
    new Vector3(torchere.armRadius, 1.4, 0),
    new Vector3(torchere.armRadius, torchere.armY - 0.03, 0),
  ]
  return tube(points, 0.0075).rotateY(-angle)
}

function torchereParts(origin: Vector3) {
  const parts = [
    lathe(shaftProfile, 20),
    ...[0, 1, 2].map((index) => tripodLeg((index / 3) * Math.PI * 2 + 0.3)),
    ...[0, 1, 2, 3].map((index) =>
      torchereArm((index / 4) * Math.PI * 2 + Math.PI / 4)
    ),
    ...torchereCupOffsets.map((offset) => bobeche(offset)),
  ]
  return parts.map((part) => part.translate(origin.x, origin.y, origin.z))
}

function cartouche() {
  const shape = new Shape()
  shape.moveTo(0, -0.24)
  shape.bezierCurveTo(0.05, -0.17, 0.085, -0.06, 0.07, 0.04)
  shape.bezierCurveTo(0.06, 0.13, 0.03, 0.2, 0, 0.26)
  shape.bezierCurveTo(-0.03, 0.2, -0.06, 0.13, -0.07, 0.04)
  shape.bezierCurveTo(-0.085, -0.06, -0.05, -0.17, 0, -0.24)
  return new ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 12,
  })
}

function sconceArm(cup: Vector3) {
  const side = Math.sign(cup.x)
  const points =
    side === 0
      ? [
          new Vector3(0, -0.02, 0.02),
          new Vector3(0, 0.03, 0.09),
          new Vector3(0, 0.15, 0.15),
          new Vector3(0, cup.y - 0.02, cup.z),
        ]
      : [
          new Vector3(0, -0.06, 0.02),
          new Vector3(side * 0.07, -0.1, 0.1),
          new Vector3(side * 0.16, -0.03, 0.17),
          new Vector3(cup.x, cup.y - 0.03, cup.z),
        ]
  return tube(points, 0.0075)
}

function sconceParts(matrix: Matrix4) {
  const parts = [
    cartouche(),
    ...sconceCups.flatMap(([cup]) => [sconceArm(cup), bobeche(cup)]),
  ]
  return parts.map((part) => part.applyMatrix4(matrix))
}

function unindexed(geometry: BufferGeometry) {
  if (!geometry.index) {
    return geometry
  }
  const flat = geometry.toNonIndexed()
  geometry.dispose()
  return flat
}

// Black iron for every girandole and torchère of a set, merged in place.
export function buildCandleIron(set: CandleSet) {
  const parts = [
    ...set.sconces.flatMap((mount) => sconceParts(mountMatrix(mount))),
    ...set.torcheres.flatMap((origin) => torchereParts(origin)),
  ].map((part) => {
    const flat = unindexed(part)
    flat.deleteAttribute("uv")
    return flat
  })
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  return merged
}

export const candleGeometry = new CylinderGeometry(
  candleRadius,
  candleRadius * 1.05,
  1,
  12
).translate(0, 0.5, 0)

export const dripGeometry = new SphereGeometry(1, 8, 6)

const identity = new Quaternion()

export function candleMatrices(candles: readonly Candle[]) {
  const matrix = new Matrix4()
  const array = new Float32Array(candles.length * 16)
  candles.forEach((candle, index) => {
    matrix.compose(candle.base, identity, new Vector3(1, candle.height, 1))
    matrix.toArray(array, index * 16)
  })
  return array
}

// Two wax runs down the side of every candle, below its rim.
export function dripMatrices(candles: readonly Candle[]) {
  const matrix = new Matrix4()
  const drips = candles.flatMap((candle, index) =>
    [0, 1].map((run) => {
      const angle = index * 2.3 + run * 2.6
      const length = 0.018 + ((index * 7 + run * 3) % 5) * 0.008
      const position = new Vector3(
        candle.base.x + Math.cos(angle) * candleRadius,
        candle.base.y + candle.height - length * 0.8,
        candle.base.z + Math.sin(angle) * candleRadius
      )
      return { position, scale: new Vector3(0.006, length, 0.006) }
    })
  )
  const array = new Float32Array(drips.length * 16)
  drips.forEach((drip, index) => {
    matrix.compose(drip.position, identity, drip.scale)
    matrix.toArray(array, index * 16)
  })
  return { count: drips.length, array }
}
