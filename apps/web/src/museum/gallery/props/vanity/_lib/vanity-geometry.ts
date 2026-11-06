import {
  ellipsePoints,
  lathe,
  mergeParts,
  tube,
  type Profile,
} from "@/museum/gallery/props/_lib/prop-geometry"
import {
  finial,
  turnedLeg,
  turnedPole,
} from "@/museum/gallery/props/_lib/turned-wood"
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

export const vanityTop = 0.77
const slab = 0.03
const apron = { height: 0.11, width: 1.06, depth: 0.42 }
const legHeight = vanityTop - slab - apron.height
const apronY = legHeight + apron.height / 2
const drawerFront = apron.depth / 2 + 0.006

const mirror = {
  center: new Vector3(0, 1.19, -0.17),
  glass: { x: 0.22, y: 0.31 },
  tilt: -0.07,
  postX: 0.34,
}

function mirrorFrame() {
  const ring = tube(
    ellipsePoints(mirror.glass.x + 0.016, mirror.glass.y + 0.016, 24),
    0.018,
    { radial: 8, perPoint: 3, isClosed: true }
  )
  const crest = finial(mirror.glass.y + 0.02, 0.028)
  const pins = [-1, 1].map((side) =>
    new CylinderGeometry(0.009, 0.009, mirror.postX - mirror.glass.x, 8)
      .rotateZ(Math.PI / 2)
      .translate((side * (mirror.postX + mirror.glass.x)) / 2, 0, 0)
  )
  return [ring, crest, ...pins].map((part) =>
    part
      .rotateX(mirror.tilt)
      .translate(mirror.center.x, mirror.center.y, mirror.center.z)
  )
}

export function buildVanityWood() {
  const legs = [-1, 1].flatMap((sideX) =>
    [-1, 1].map((sideZ) =>
      turnedLeg(legHeight, 0.028).translate(sideX * 0.52, 0, sideZ * 0.18)
    )
  )
  const drawers = [
    [-0.36, 0.26],
    [0, 0.4],
    [0.36, 0.26],
  ].map(([x = 0, width = 0]) =>
    new BoxGeometry(width, 0.075, 0.012).translate(x, apronY, drawerFront)
  )
  const posts = [-1, 1].flatMap((side) => [
    turnedPole({
      from: vanityTop,
      to: 1.42,
      girth: 0.014,
      rings: [0.9, 1.3],
    }).translate(side * mirror.postX, 0, mirror.center.z),
    finial(1.42, 0.02).translate(side * mirror.postX, 0, mirror.center.z),
  ])
  return mergeParts([
    new RoundedBoxGeometry(1.15, slab, 0.5, 2, 0.01).translate(
      0,
      vanityTop - slab / 2,
      0
    ),
    new BoxGeometry(apron.width, apron.height, apron.depth).translate(
      0,
      apronY,
      0
    ),
    ...drawers,
    ...legs,
    ...posts,
    ...mirrorFrame(),
  ])
}

// The oval glass, with UVs spanning it once for the foxing texture.
export function buildMirrorGlass() {
  const shape = new Shape()
  shape.absellipse(0, 0, mirror.glass.x, mirror.glass.y, 0, Math.PI * 2)
  const geometry = new ShapeGeometry(shape, 48)
  const position = geometry.getAttribute("position")
  const uvs = new Float32Array(position.count * 2)
  for (let index = 0; index < position.count; index += 1) {
    uvs[index * 2] = position.getX(index) / (mirror.glass.x * 2) + 0.5
    uvs[index * 2 + 1] = position.getY(index) / (mirror.glass.y * 2) + 0.5
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  return geometry
    .translate(0, 0, 0.004)
    .rotateX(mirror.tilt)
    .translate(mirror.center.x, mirror.center.y, mirror.center.z)
}

const pearlRadius = 0.0056

// The necklace she took off, in a loose loop, plus the drawers' knobs.
export function pearlMatrices() {
  const curve = new CatmullRomCurve3(
    [
      new Vector3(-0.42, 0, 0.07),
      new Vector3(-0.35, 0, 0.0),
      new Vector3(-0.24, 0, 0.02),
      new Vector3(-0.16, 0, 0.09),
      new Vector3(-0.19, 0, 0.17),
      new Vector3(-0.29, 0, 0.19),
      new Vector3(-0.39, 0, 0.15),
    ],
    true
  )
  const count = Math.floor(curve.getLength() / (pearlRadius * 2.05))
  const matrix = new Matrix4()
  const matrices: number[] = []
  for (let index = 0; index < count; index += 1) {
    const point = curve.getPointAt(index / count)
    const size = pearlRadius * (0.92 + ((index * 7) % 5) * 0.035)
    matrix
      .makeScale(size, size, size)
      .setPosition(point.x, vanityTop + size, point.z)
    matrices.push(...matrix.elements)
  }
  for (const x of [-0.36, 0, 0.36]) {
    matrix
      .makeScale(0.01, 0.01, 0.01)
      .setPosition(x, apronY, drawerFront + 0.014)
    matrices.push(...matrix.elements)
  }
  return Float32Array.from(matrices)
}

const dishProfile: Profile = [
  [0, 0],
  [0.05, 0],
  [0.062, 0.006],
  [0.068, 0.02],
  [0.064, 0.022],
  [0.056, 0.01],
  [0, 0.008],
]

export const puffSpot = new Vector3(0.3, vanityTop, 0.05)

export function buildDish() {
  return lathe(dishProfile, 32).translate(puffSpot.x, puffSpot.y, puffSpot.z)
}

// A swansdown puff: a squashed sphere with a ruffled, uneven rim.
export function buildPuff() {
  const puff = new SphereGeometry(0.05, 28, 14)
  const position = puff.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const angle = Math.atan2(z, x)
    const fluff =
      1 + Math.sin(angle * 11) * 0.03 + Math.sin(angle * 5 + 1) * 0.02
    position.setXYZ(index, x * fluff, position.getY(index) * 0.4, z * fluff)
  }
  puff.computeVertexNormals()
  return puff.translate(puffSpot.x, puffSpot.y + 0.028, puffSpot.z)
}

export function buildPuffBow() {
  return new TorusGeometry(0.011, 0.003, 6, 16)
    .scale(1.4, 1, 1)
    .translate(puffSpot.x, puffSpot.y + 0.058, puffSpot.z)
}

const lipstickAt = new Vector3(0.12, vanityTop, 0.13)

// A silver lipstick case with its cap off and lying beside it.
export function buildLipstickCase() {
  const caseProfile: Profile = [
    [0, 0],
    [0.0095, 0],
    [0.0095, 0.03],
    [0.0105, 0.032],
    [0.0105, 0.036],
    [0.0085, 0.038],
    [0.0085, 0.05],
    [0, 0.05],
  ]
  const cap = new CylinderGeometry(0.0108, 0.0108, 0.042, 16)
    .rotateZ(Math.PI / 2)
    .rotateY(0.5)
    .translate(lipstickAt.x + 0.05, vanityTop + 0.0108, lipstickAt.z + 0.02)
  return mergeParts([
    lathe(caseProfile, 16).translate(lipstickAt.x, lipstickAt.y, lipstickAt.z),
    cap,
  ])
}

export function buildLipstickBullet() {
  const radius = 0.0068
  const height = 0.024
  const bullet = new CylinderGeometry(radius, radius, height, 16, 1)
  const position = bullet.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    if (position.getY(index) > 0) {
      const x = position.getX(index)
      position.setY(index, height / 2 - (x + radius) * 0.85)
    }
  }
  bullet.computeVertexNormals()
  return bullet.translate(
    lipstickAt.x,
    lipstickAt.y + 0.05 + height / 2 - 0.004,
    lipstickAt.z
  )
}
