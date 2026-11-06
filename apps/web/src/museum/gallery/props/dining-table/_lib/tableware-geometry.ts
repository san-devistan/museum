import {
  lathe,
  mergeParts,
  tube,
  type Profile,
} from "@/museum/gallery/props/_lib/prop-geometry"
import {
  candelabraSpot,
  cakeSpot,
  guestPlace,
  herPlace,
  table,
} from "@/museum/gallery/props/dining-table/_lib/dining-layout"
import {
  BoxGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Vector3,
  type BufferGeometry,
} from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

const top = table.top

const plateProfile: Profile = [
  [0, 0.002],
  [0.075, 0.002],
  [0.08, 0],
  [0.086, 0.004],
  [0.1, 0.008],
  [0.124, 0.016],
  [0.13, 0.018],
  [0.128, 0.02],
  [0.12, 0.018],
  [0.098, 0.011],
  [0.08, 0.007],
  [0, 0.007],
]

const standProfile: Profile = [
  [0, 0],
  [0.065, 0],
  [0.07, 0.006],
  [0.03, 0.02],
  [0.018, 0.03],
  [0.016, 0.07],
  [0.03, 0.085],
  [0.14, 0.09],
  [0.15, 0.098],
  [0.145, 0.1],
  [0, 0.096],
]

// Height of the cake stand's plate above the cloth.
export const standTop = 0.096
// Height of the guest's folded napkin's top above the cloth.
export const napkinTop = 0.007 + 0.012

// Both plates and the cake stand.
export function buildPorcelain() {
  return mergeParts([
    lathe(plateProfile, 40).translate(herPlace.plate.x, top, herPlace.plate.z),
    lathe(plateProfile, 40).translate(
      guestPlace.plate.x,
      top,
      guestPlace.plate.z
    ),
    lathe(standProfile, 40).translate(cakeSpot.x, top, cakeSpot.z),
  ])
}

const glassProfile: Profile = [
  [0, 0],
  [0.034, 0],
  [0.035, 0.003],
  [0.006, 0.008],
  [0.0042, 0.02],
  [0.0042, 0.09],
  [0.012, 0.1],
  [0.03, 0.12],
  [0.04, 0.15],
  [0.041, 0.18],
  [0.038, 0.205],
]

export function buildGlasses() {
  return mergeParts(
    [herPlace.glass, guestPlace.glass].map((spot) =>
      lathe(glassProfile, 24).translate(spot.x, top, spot.z)
    )
  )
}

// What's left of her wine.
export function buildWine() {
  const wine: Profile = [
    [0, 0.108],
    [0.016, 0.112],
    [0.03, 0.124],
    [0.034, 0.132],
    [0, 0.132],
  ]
  return lathe(wine, 24).translate(herPlace.glass.x, top, herPlace.glass.z)
}

function fork(x: number, z: number, turn: number) {
  const parts = [
    new BoxGeometry(0.12, 0.003, 0.012).translate(-0.04, 0, 0),
    new BoxGeometry(0.05, 0.002, 0.024).translate(0.045, 0, 0),
    ...[-1, -0.33, 0.33, 1].map((k) =>
      new BoxGeometry(0.035, 0.002, 0.003).translate(0.085, 0.001, k * 0.009)
    ),
  ]
  return parts.map((part) => part.rotateY(turn).translate(x, top + 0.0025, z))
}

function knife(x: number, z: number, turn: number) {
  return [
    new BoxGeometry(0.1, 0.006, 0.013).translate(-0.05, 0.002, 0),
    new BoxGeometry(0.11, 0.002, 0.02).translate(0.055, 0, 0.003),
  ].map((part) => part.rotateY(turn).translate(x, top + 0.003, z))
}

const candelabraBase: Profile = [
  [0, 0],
  [0.07, 0],
  [0.072, 0.008],
  [0.05, 0.02],
  [0.025, 0.035],
  [0.016, 0.05],
  [0.011, 0.2],
  [0.022, 0.215],
  [0.012, 0.23],
  [0.012, 0.29],
  [0, 0.29],
]

const cup: Profile = [
  [0.008, -0.014],
  [0.032, -0.006],
  [0.038, 0.002],
  [0.034, 0.005],
  [0.016, 0.002],
  [0.015, 0.014],
  [0, 0.014],
]

// Candle cups on the candelabra, from its foot.
export const candelabraCups = [
  new Vector3(0, 0.3, 0),
  new Vector3(-0.15, 0.27, 0),
  new Vector3(0.15, 0.27, 0),
] as const

export const candleHeights = [0.17, 0.13, 0.14] as const

function candelabra() {
  const arms = [-1, 1].map((side) =>
    tube(
      [
        new Vector3(0, 0.2, 0),
        new Vector3(side * 0.06, 0.18, 0),
        new Vector3(side * 0.13, 0.2, 0),
        new Vector3(side * 0.15, 0.24, 0),
        new Vector3(side * 0.15, 0.255, 0),
      ],
      0.0065,
      { radial: 6 }
    )
  )
  const cups = candelabraCups.map((at) =>
    lathe(cup, 16).translate(at.x, at.y - 0.014, at.z)
  )
  return [lathe(candelabraBase, 24), ...arms, ...cups].map((part) =>
    part.translate(candelabraSpot.x, top, candelabraSpot.z)
  )
}

// Silver: the candelabra, the guest's cutlery, her knife, and the fork she
// left on her plate.
export function buildSilverware() {
  const { fork: guestFork, knife: guestKnife } = guestPlace
  return mergeParts([
    ...candelabra(),
    ...fork(guestFork.x, guestFork.z, Math.PI),
    ...knife(guestKnife.x, guestKnife.z, Math.PI),
    ...knife(herPlace.knife.x, herPlace.knife.z, 0),
    ...fork(herPlace.plate.x + 0.03, herPlace.plate.z - 0.04, 2.5).map((part) =>
      part.translate(0, 0.012, 0)
    ),
  ])
}

export function buildCandles() {
  return mergeParts(
    candelabraCups.map((at, index) => {
      const height = candleHeights[index] ?? 0.14
      return new CylinderGeometry(0.011, 0.0115, height, 12).translate(
        candelabraSpot.x + at.x,
        top + at.y + height / 2,
        candelabraSpot.z + at.z
      )
    })
  )
}

// Her napkin dropped crumpled by her plate, and the guest's folded under
// the card.
export function buildNapkins() {
  const crumpled = new IcosahedronGeometry(0.07, 3)
  const position = crumpled.getAttribute("position")
  const point = new Vector3()
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index)
    const ruck =
      1 +
      0.18 * Math.sin(point.x * 90 + point.z * 40) +
      0.12 * Math.sin(point.z * 120 - point.y * 60)
    point.multiplyScalar(ruck)
    point.y = Math.max(point.y * 0.32, -0.004)
    position.setXYZ(index, point.x, point.y, point.z)
  }
  crumpled.computeVertexNormals()
  const parts: BufferGeometry[] = [
    crumpled.translate(herPlace.napkin.x, top + 0.006, herPlace.napkin.z),
    new RoundedBoxGeometry(0.11, 0.012, 0.16, 2, 0.004).translate(
      guestPlace.plate.x,
      top + napkinTop - 0.006,
      guestPlace.plate.z
    ),
  ]
  return mergeParts(parts, ["position", "normal"])
}
