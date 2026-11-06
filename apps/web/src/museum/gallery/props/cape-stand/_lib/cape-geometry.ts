import {
  laceFieldMeters,
  laceHem,
} from "@/museum/gallery/props/_lib/lace-textures"
import {
  bowGeometry,
  mergeParts,
  tube,
} from "@/museum/gallery/props/_lib/prop-geometry"
import {
  finial,
  turnedBase,
  turnedPole,
} from "@/museum/gallery/props/_lib/turned-wood"
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three"

export const cape = {
  neckY: 1.6,
  shoulderY: 1.5,
  hemY: 0.36,
  neck: { x: 0.075, z: 0.07 },
  shoulder: { x: 0.235, z: 0.13 },
  hem: { x: 0.265, z: 0.215 },
  folds: 9,
  foldDepth: 0.024,
} as const

const columns = 56
const rows = 48
const shoulderShare = 0.1

type Ellipse = { x: number; z: number }

function blend(from: Ellipse, to: Ellipse, amount: number): Ellipse {
  return {
    x: from.x + (to.x - from.x) * amount,
    z: from.z + (to.z - from.z) * amount,
  }
}

// Longer at the back, as a cape falls.
function hemAt(angle: number) {
  return cape.hemY - 0.07 * ((1 - Math.cos(angle)) / 2)
}

function capePoint(t: number, angle: number) {
  if (t < shoulderShare) {
    const k = t / shoulderShare
    const reach = blend(cape.neck, cape.shoulder, Math.sin((k * Math.PI) / 2))
    const y = cape.neckY - (cape.neckY - cape.shoulderY) * k * k
    return { y, reach, fold: 0 }
  }
  const u = (t - shoulderShare) / (1 - shoulderShare)
  const y = cape.shoulderY - u * (cape.shoulderY - hemAt(angle))
  const reach = blend(cape.shoulder, cape.hem, 1 - (1 - u) ** 1.7)
  const fold =
    Math.sin(angle * cape.folds + 0.6 * Math.sin(angle * 3) + u * 0.8) *
    cape.foldDepth *
    u ** 0.8
  return { y, reach, fold }
}

type Grid = {
  positions: number[]
  uvs: number[]
  hemUvs: number[]
  indices: number[]
}

function quads(grid: Grid, size: { columns: number; rows: number }) {
  for (let row = 0; row < size.rows; row += 1) {
    for (let column = 0; column < size.columns; column += 1) {
      const a = row * (size.columns + 1) + column
      const b = a + 1
      const c = a + size.columns + 1
      const d = c + 1
      grid.indices.push(a, c, b, b, c, d)
    }
  }
}

function toGeometry(grid: Grid) {
  const geometry = new BufferGeometry()
  geometry.setIndex(grid.indices)
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(grid.positions, 3)
  )
  geometry.setAttribute("uv", new Float32BufferAttribute(grid.uvs, 2))
  geometry.setAttribute("uv1", new Float32BufferAttribute(grid.hemUvs, 2))
  geometry.computeVertexNormals()
  return geometry
}

// The cape over the shoulders and down to a scalloped hem, open at the
// front (+z) below the bow.
function capeBody() {
  const grid: Grid = { positions: [], uvs: [], hemUvs: [], indices: [] }
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows
    const gap = 0.08 + 0.4 * t * t
    for (let column = 0; column <= columns; column += 1) {
      const s = column / columns
      const angle = gap + s * (Math.PI * 2 - gap * 2)
      const { y, reach, fold } = capePoint(t, angle)
      grid.positions.push(
        Math.sin(angle) * (reach.x + fold),
        y,
        Math.cos(angle) * (reach.z + fold * 0.8)
      )
      const around = angle * 0.22
      grid.uvs.push(
        around / laceFieldMeters,
        (cape.neckY - y) / laceFieldMeters
      )
      grid.hemUvs.push(
        around / laceHem.width,
        (y - hemAt(angle)) / laceHem.height
      )
    }
  }
  quads(grid, { columns, rows })
  return toGeometry(grid)
}

// A ruffled lace collar standing round the neck, scallops up.
function capeCollar() {
  const grid: Grid = { positions: [], uvs: [], hemUvs: [], indices: [] }
  const collarRows = 6
  const collarColumns = 72
  const height = 0.065
  for (let row = 0; row <= collarRows; row += 1) {
    const t = row / collarRows
    const y = cape.neckY - 0.012 + t * height
    for (let column = 0; column <= collarColumns; column += 1) {
      const angle = 0.12 + (column / collarColumns) * (Math.PI * 2 - 0.24)
      const ruffle = Math.sin(angle * 16) * 0.012 * t
      const flare = 0.035 * t * t
      grid.positions.push(
        Math.sin(angle) * (cape.neck.x + flare + ruffle),
        y,
        Math.cos(angle) * (cape.neck.z + flare + ruffle)
      )
      grid.uvs.push(angle * 0.3, t * 0.4)
      grid.hemUvs.push(
        (angle * 0.09) / laceHem.width,
        ((1 - t) * height) / laceHem.height
      )
    }
  }
  quads(grid, { columns: collarColumns, rows: collarRows })
  return toGeometry(grid)
}

export function buildCapeLace() {
  return mergeParts(
    [capeBody(), capeCollar()],
    ["position", "normal", "uv", "uv1"]
  )
}

// Tied at the throat, its tails lying down the front of the cape.
export function buildCapeBow() {
  return bowGeometry({ width: 0.024, loop: 0.05, tail: 0.24 })
    .rotateX(-0.42)
    .translate(0, cape.neckY - 0.012, cape.neck.z + 0.016)
}

const poleTop = 1.62

// Turned stand: round foot, ringed pole, shoulder yoke and a knob on top.
export function buildCapeStand() {
  const yoke = tube(
    [
      new Vector3(-0.215, 1.468, 0),
      new Vector3(-0.12, 1.512, 0),
      new Vector3(0, 1.528, 0),
      new Vector3(0.12, 1.512, 0),
      new Vector3(0.215, 1.468, 0),
    ],
    0.017,
    { radial: 8 }
  )
  return mergeParts([
    turnedBase(0.24, 0.07),
    turnedPole({ from: 0.07, to: poleTop, girth: 0.016, rings: [0.26, 0.92] }),
    finial(poleTop, 0.022),
    yoke,
  ])
}
