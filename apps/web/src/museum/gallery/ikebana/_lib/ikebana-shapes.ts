import {
  gridIndices,
  meshFromArrays,
} from "@/museum/gallery/ikebana/_lib/ikebana-geometry"
import {
  lerp,
  smoothstep,
  type Random,
} from "@/museum/gallery/ikebana/_lib/ikebana-random"
import { Color, Euler, Quaternion, type BufferGeometry } from "three"

type SpatheOptions = {
  length: number
  cup: number
  curl: number
  veins: number
}

const heartAttach = -3
const heartLength = 29

function heartOutline(turn: number) {
  const x = 16 * Math.sin(turn) ** 3 * 0.74
  const y =
    -(
      13 * Math.cos(turn) -
      5 * Math.cos(2 * turn) -
      2 * Math.cos(3 * turn) -
      Math.cos(4 * turn)
    ) - heartAttach
  return { x, y }
}

export function createSpatheGeometry({
  length,
  cup,
  curl,
  veins,
}: SpatheOptions) {
  const rings = 12
  const sides = 48
  const scale = length / heartLength
  const positions: number[] = []
  for (let ring = 0; ring <= rings; ring += 1) {
    const spread = ring / rings
    for (let side = 0; side <= sides; side += 1) {
      const turn = (side / sides) * Math.PI * 2
      const outline = heartOutline(turn)
      const x = outline.x * spread * scale
      const y = outline.y * spread * scale
      const across = x / (length * 0.45)
      const along = Math.max(0, y / length)
      const vein = Math.cos(turn * 7) ** 12 * spread * veins
      const midrib = Math.exp(-((x / (length * 0.03)) ** 2)) * spread
      const z =
        cup * length * across * across -
        curl * length * along ** 2.4 +
        vein -
        midrib * veins * 1.4 -
        Math.max(0, -y / length) * cup * length * 0.6
      positions.push(x, y, z)
    }
  }
  return meshFromArrays(positions, gridIndices(rings, sides))
}

export function createCallaGeometry(size: number) {
  const rows = 14
  const columns = 22
  const positions: number[] = []
  for (let row = 0; row <= rows; row += 1) {
    const along = row / rows
    for (let column = 0; column <= columns; column += 1) {
      const around = column / columns
      const angle = lerp(-2.95, 2.95, around)
      const front = Math.max(0, Math.cos(angle)) ** 3
      const radius =
        size *
        (0.05 + 0.36 * along ** 1.7) *
        (0.92 + 0.2 * around) *
        (1 + 0.35 * along ** 5 * (1 - front))
      const lip = size * 0.42 * along ** 3 * front
      positions.push(
        Math.sin(angle) * radius,
        size * along + lip,
        Math.cos(angle) * radius + lip * 0.35
      )
    }
  }
  return meshFromArrays(positions, gridIndices(rows, columns))
}

type PetalOptions = {
  length: number
  width: number
  ruffle: number
  phase: number
  tint: number
}

type Palette = { bloom: Color; blush: Color }

function createPetal(
  { length, width, ruffle, phase, tint }: PetalOptions,
  palette: Palette
) {
  const rows = 4
  const columns = 7
  const positions: number[] = []
  const colors: number[] = []
  const color = new Color()
  for (let row = 0; row <= rows; row += 1) {
    const along = row / rows
    const span = width * (0.22 + 0.78 * along ** 0.65)
    for (let column = 0; column <= columns; column += 1) {
      const across = column / columns - 0.5
      const fringe = along ** 3 * 0.12 * Math.abs(Math.sin(column * 2.7))
      const y = length * (along + fringe)
      const z =
        ruffle * Math.sin(column * 2.1 + phase) * along ** 1.6 +
        width * 0.35 * across * across
      positions.push(across * span, y, z)
      color.copy(palette.bloom).lerp(palette.blush, tint * (1 - along) ** 1.5)
      colors.push(color.r, color.g, color.b)
    }
  }
  return meshFromArrays(positions, gridIndices(rows, columns), colors)
}

const bloomLayers = [
  { count: 5, tilt: 0.12, length: 0.5, offset: 0.04 },
  { count: 8, tilt: 0.45, length: 0.72, offset: 0.1 },
  { count: 11, tilt: 0.8, length: 0.9, offset: 0.17 },
  { count: 13, tilt: 1.1, length: 1, offset: 0.24 },
] as const

type BloomOptions = {
  size: number
  random: Random
  palette: Palette
}

export function createBloomPetals({ size, random, palette }: BloomOptions) {
  const petals: BufferGeometry[] = []
  const rotation = new Quaternion()
  const euler = new Euler(0, 0, 0, "YXZ")
  for (const [layerIndex, layer] of bloomLayers.entries()) {
    for (let index = 0; index < layer.count; index += 1) {
      const yaw =
        ((index + random.next() * 0.6) / layer.count) * Math.PI * 2 +
        layerIndex * 0.7
      const petal = createPetal(
        {
          length: size * layer.length * random.range(0.85, 1.1),
          width: size * random.range(0.55, 0.75),
          ruffle: size * random.range(0.1, 0.18),
          phase: random.range(0, Math.PI * 2),
          tint: smoothstep(1.3, 0, layer.tilt) * 0.9 + 0.15,
        },
        palette
      )
      euler.set(layer.tilt + random.range(-0.15, 0.15), yaw, 0)
      rotation.setFromEuler(euler)
      const reach = size * layer.offset
      petals.push(
        petal
          .applyQuaternion(rotation)
          .translate(Math.sin(yaw) * reach, 0, Math.cos(yaw) * reach)
      )
    }
  }
  return petals
}
