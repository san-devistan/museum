import {
  createHeightField,
  createRandom,
  fractalNoise,
  periodicNoise,
  type HeightField,
} from "@/museum/_lib/relief/height-field"

type Size = { width: number; height: number }

export function carpetField(size: Size, seed: number): HeightField {
  const random = createRandom(seed)
  const tufts = Float32Array.from({ length: size.width * size.height }, () =>
    random()
  )
  const loops = periodicNoise(random, { x: 96, y: 96 })
  const clumps = fractalNoise(random, { x: 32, y: 32, octaves: 2 })
  const pile = fractalNoise(random, { x: 4, y: 4, octaves: 2 })
  return createHeightField(size, (x, y) => {
    const u = x / size.width
    const v = y / size.height
    const loop = Math.abs(loops(u, v))
    const tuft = tufts[y * size.width + x] ?? 0
    return (
      0.5 +
      0.4 * (0.5 - loop) +
      0.18 * clumps(u, v) +
      0.08 * pile(u, v) +
      0.12 * (tuft - 0.5)
    )
  })
}

export function plasterField(size: Size, seed: number): HeightField {
  const random = createRandom(seed)
  const grain = Float32Array.from({ length: size.width * size.height }, () =>
    random()
  )
  const weave = periodicNoise(random, { x: 96, y: 192 })
  const slub = fractalNoise(random, { x: 8, y: 16, octaves: 4 })
  return createHeightField(size, (x, y) => {
    const u = x / size.width
    const v = y / size.height
    const thread =
      Math.sin((x / size.width) * Math.PI * 2 * 160) *
      Math.sin((y / size.height) * Math.PI * 2 * 320)
    return (
      0.5 +
      0.18 * ((grain[y * size.width + x] ?? 0) - 0.5) +
      0.12 * weave(u, v) +
      0.22 * slub(u, v) +
      0.06 * thread
    )
  })
}

export function woodField(size: Size, seed: number): HeightField {
  const random = createRandom(seed)
  const warp = fractalNoise(random, { x: 3, y: 1, octaves: 3 })
  const fibre = periodicNoise(random, { x: 256, y: 4 })
  const pores = Float32Array.from({ length: size.width * size.height }, () =>
    random()
  )
  const rings = 28
  return createHeightField(size, (x, y) => {
    const u = x / size.width
    const v = y / size.height
    const phase = (u + 0.06 * warp(u, v)) * rings
    const ring = phase - Math.floor(phase)
    const latewood = ring ** 3
    const pore = (pores[y * size.width + x] ?? 0) > 0.985 ? -0.25 : 0
    return 0.5 + 0.35 * latewood + 0.12 * fibre(u, v) + pore
  })
}

// Wood planks whose grain runs along u, for mouldings and beams laid lengthwise.
export function boardField(size: Size, seed: number): HeightField {
  const random = createRandom(seed)
  const warp = fractalNoise(random, { x: 1, y: 3, octaves: 3 })
  const fibre = periodicNoise(random, { x: 4, y: 256 })
  const figure = fractalNoise(random, { x: 2, y: 6, octaves: 2 })
  const pores = Float32Array.from({ length: size.width * size.height }, () =>
    random()
  )
  const rings = 14
  return createHeightField(size, (x, y) => {
    const u = x / size.width
    const v = y / size.height
    const phase = (v + 0.09 * warp(u, v)) * rings
    const ring = phase - Math.floor(phase)
    const latewood = ring ** 3
    const pore = (pores[y * size.width + x] ?? 0) > 0.985 ? -0.25 : 0
    return (
      0.5 + 0.32 * latewood + 0.12 * fibre(u, v) + 0.14 * figure(u, v) + pore
    )
  })
}

export function cottonField(size: Size, seed: number): HeightField {
  const random = createRandom(seed)
  const fuzz = Float32Array.from({ length: size.width * size.height }, () =>
    random()
  )
  const slub = fractalNoise(random, { x: 32, y: 32, octaves: 3 })
  return createHeightField(size, (x, y) => {
    const twist =
      Math.sin(((x + y) / size.width) * Math.PI * 2 * 48) * 0.5 + 0.5
    return (
      0.5 +
      0.25 * twist +
      0.2 * slub(x / size.width, y / size.height) +
      0.25 * ((fuzz[y * size.width + x] ?? 0) - 0.5)
    )
  })
}

export function marbleField(size: Size, seed: number): HeightField {
  const random = createRandom(seed)
  const veins = fractalNoise(random, { x: 3, y: 3, octaves: 5 })
  const pits = Float32Array.from({ length: size.width * size.height }, () =>
    random()
  )
  return createHeightField(size, (x, y) => {
    const u = x / size.width
    const v = y / size.height
    const vein = 1 - Math.abs(Math.sin((u + v + 2 * veins(u, v)) * Math.PI * 4))
    const pit = (pits[y * size.width + x] ?? 0) > 0.992 ? -0.2 : 0
    return 0.5 + 0.18 * vein ** 6 + pit
  })
}

export function ashlarField(size: Size, seed: number): HeightField {
  const random = createRandom(seed)
  const grit = Float32Array.from({ length: size.width * size.height }, () =>
    random()
  )
  const weather = fractalNoise(random, { x: 6, y: 6, octaves: 4 })
  const courses = 4
  const blocksPerCourse = 2
  const joint = 0.012
  return createHeightField(size, (x, y) => {
    const u = x / size.width
    const v = y / size.height
    const row = Math.floor(v * courses)
    const shifted = u * blocksPerCourse + (row % 2) * 0.5
    const inBlockU = shifted - Math.floor(shifted)
    const inBlockV = v * courses - row
    const edge = Math.min(
      inBlockU / blocksPerCourse,
      (1 - inBlockU) / blocksPerCourse,
      inBlockV / courses,
      (1 - inBlockV) / courses
    )
    const mortar =
      edge < joint ? 0 : Math.min(1, (edge - joint) / (joint * 0.8))
    return (
      0.28 +
      0.5 * mortar +
      0.12 * weather(u, v) +
      0.08 * ((grit[y * size.width + x] ?? 0) - 0.5)
    )
  })
}
