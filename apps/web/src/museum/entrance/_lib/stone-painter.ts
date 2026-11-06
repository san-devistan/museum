import {
  createRandom,
  fractalNoise,
  type HeightField,
  type Random,
} from "@/museum/_lib/relief/height-field"
import {
  clamp01,
  coarseGrid,
  gridAt,
  hexRgb,
  type Grid,
  type Rgb,
  type Size,
} from "@/museum/entrance/_lib/stone-grid"

export type AshlarColors = {
  stone: string
  shade: string
  mortar: string
  rust: string
  lichen: string
}

/** A crack in facade metres: where it starts, which way it runs, how far. */
export type Crack = { x: number; y: number; angle: number; length: number }

export type AshlarSpec = {
  size: Size
  meters: readonly [number, number]
  /** Facade coordinates of the canvas' bottom-left corner. */
  origin: readonly [number, number]
  seed: number
  colors: AshlarColors
  cracks: readonly Crack[]
}

type Block = {
  start: number
  end: number
  tone: number
  warmth: number
  chips: number
  chipRadius: number
}

type Course = { top: number; bottom: number; blocks: Block[] }

type Palette = Record<keyof AshlarColors, Rgb>

type Ashlar = {
  width: number
  values: Float32Array
  pixels: Uint8ClampedArray
  random: Random
  weather: Grid
  jitter: Grid
  lichen: Grid
  palette: Palette
}

export type StoneSurface = {
  field: HeightField
  pixels: Uint8ClampedArray
}

const courseRange = [0.3, 0.42] as const
const blockRange = [0.5, 1.15] as const

function layoutBlocks(random: Random, width: number, pxPerMeter: number) {
  const blocks: Block[] = []
  const origin = Math.round(random() * width)
  const minimum = blockRange[0] * pxPerMeter
  let start = origin
  while (start < origin + width) {
    const length =
      (blockRange[0] + (blockRange[1] - blockRange[0]) * random()) * pxPerMeter
    let end = Math.round(start + length)
    if (origin + width - end < minimum) {
      end = origin + width
    }
    blocks.push({
      start,
      end,
      tone: random(),
      warmth: random() ** 3,
      chips: Math.floor(random() * 16) & Math.floor(random() * 16),
      chipRadius: 5 + random() * 12,
    })
    start = end
  }
  return blocks
}

function layoutCourses(random: Random, size: Size, pxPerMeter: number) {
  const courses: Course[] = []
  let bottom = size.height
  while (bottom > 0) {
    const courseHeight =
      (courseRange[0] + (courseRange[1] - courseRange[0]) * random()) *
      pxPerMeter
    const top = Math.max(0, Math.round(bottom - courseHeight))
    courses.push({
      top,
      bottom,
      blocks: layoutBlocks(random, size.width, pxPerMeter),
    })
    bottom = top
  }
  return courses
}

function writePixel(ashlar: Ashlar, index: number, color: Rgb, light: number) {
  const offset = index * 4
  ashlar.pixels[offset] = color[0] * light
  ashlar.pixels[offset + 1] = color[1] * light
  ashlar.pixels[offset + 2] = color[2] * light
  ashlar.pixels[offset + 3] = 255
}

function mortarPixel(ashlar: Ashlar, index: number, isChip: boolean) {
  const grit = ashlar.random()
  if (isChip) {
    ashlar.values[index] = 0.3 + 0.08 * grit
    writePixel(ashlar, index, ashlar.palette.shade, 0.7 + 0.3 * grit)
    return
  }
  ashlar.values[index] = 0.14 + 0.05 * grit
  writePixel(ashlar, index, ashlar.palette.mortar, 0.8 + 0.4 * grit)
}

function facePixel(
  ashlar: Ashlar,
  block: Block,
  at: { index: number; x: number; y: number; bevel: number }
) {
  const { palette } = ashlar
  const grit = ashlar.random()
  const weather = gridAt(ashlar.weather, at.x, at.y)
  const round = at.bevel * (2 - at.bevel)
  ashlar.values[at.index] =
    0.46 + 0.3 * round + 0.16 * weather + 0.06 * (grit - 0.5)
  const tone = clamp01(0.5 + 0.3 * block.tone + 0.9 * weather)
  const warm = block.warmth * 0.25
  const lichen = clamp01((gridAt(ashlar.lichen, at.x, at.y) - 0.26) * 3) * 0.3
  const light = (0.62 + 0.38 * round) * (0.88 + 0.24 * grit)
  const offset = at.index * 4
  for (let channel = 0; channel < 3; channel += 1) {
    const stone =
      (palette.shade[channel] ?? 0) +
      ((palette.stone[channel] ?? 0) - (palette.shade[channel] ?? 0)) * tone
    const warmed = stone + ((palette.rust[channel] ?? 0) - stone) * warm
    const crusted = warmed + ((palette.lichen[channel] ?? 0) - warmed) * lichen
    ashlar.pixels[offset + channel] = crusted * light
  }
  ashlar.pixels[offset + 3] = 255
}

function isChipped(block: Block, dx: number, dy: number, corner: number) {
  if (((block.chips >> corner) & 1) === 0) {
    return false
  }
  return dx * dx + dy * dy < block.chipRadius * block.chipRadius
}

function paintBlock(ashlar: Ashlar, course: Course, block: Block) {
  for (let y = course.top; y < course.bottom; y += 1) {
    const fromTop = y - course.top
    const fromBottom = course.bottom - 1 - y
    for (let px = block.start; px < block.end; px += 1) {
      const x = px % ashlar.width
      const index = y * ashlar.width + x
      const fromLeft = px - block.start
      const fromRight = block.end - 1 - px
      const dx = Math.min(fromLeft, fromRight)
      const dy = Math.min(fromTop, fromBottom)
      const edge = Math.min(dx, dy)
      const joint = 1 + 1.8 * clamp01(gridAt(ashlar.jitter, x, y) + 0.5)
      const corner =
        (fromLeft < fromRight ? 0 : 1) + (fromTop < fromBottom ? 0 : 2)
      const isChip = isChipped(block, dx, dy, corner)
      if (edge < joint || isChip) {
        mortarPixel(ashlar, index, isChip)
      } else {
        const bevel = clamp01((edge - joint) / 6)
        facePixel(ashlar, block, { index, x, y, bevel })
      }
    }
  }
}

function stampCrack(ashlar: Ashlar, crack: Crack, toPixel: PixelMapper) {
  const [startX, startY] = toPixel(crack.x, crack.y)
  const steps = Math.round(crack.length * toPixel.pxPerMeter)
  let x = startX
  let y = startY
  let angle = crack.angle
  for (let step = 0; step < steps; step += 1) {
    angle += (ashlar.random() - 0.5) * 0.7
    x += Math.cos(angle)
    y -= Math.sin(angle)
    const reach = step / steps < 0.6 ? 1 : 0
    for (let oy = -reach; oy <= reach; oy += 1) {
      const row = Math.round(y) + oy
      const column = (Math.round(x) + ashlar.width * 4) % ashlar.width
      const index = row * ashlar.width + column
      if (index >= 0 && index < ashlar.values.length) {
        ashlar.values[index] = Math.min(ashlar.values[index] ?? 0, 0.12)
        writePixel(ashlar, index, ashlar.palette.mortar, 0.6)
      }
    }
  }
}

type PixelMapper = ((x: number, y: number) => readonly [number, number]) & {
  pxPerMeter: number
}

export function facadePixelMapper(spec: AshlarSpec): PixelMapper {
  const pxPerMeter = spec.size.width / spec.meters[0]
  return Object.assign(
    (x: number, y: number) =>
      [
        (x - spec.origin[0]) * pxPerMeter,
        spec.size.height - (y - spec.origin[1]) * pxPerMeter,
      ] as const,
    { pxPerMeter }
  )
}

function createAshlar(spec: AshlarSpec, random: Random): Ashlar {
  const { size } = spec
  return {
    width: size.width,
    values: new Float32Array(size.width * size.height),
    pixels: new Uint8ClampedArray(size.width * size.height * 4),
    random,
    weather: coarseGrid(
      fractalNoise(random, { x: 9, y: 6, octaves: 4 }),
      size,
      4
    ),
    jitter: coarseGrid(
      fractalNoise(random, { x: 96, y: 64, octaves: 2 }),
      size,
      2
    ),
    lichen: coarseGrid(
      fractalNoise(random, { x: 14, y: 9, octaves: 4 }),
      size,
      4
    ),
    palette: {
      stone: hexRgb(spec.colors.stone),
      shade: hexRgb(spec.colors.shade),
      mortar: hexRgb(spec.colors.mortar),
      rust: hexRgb(spec.colors.rust),
      lichen: hexRgb(spec.colors.lichen),
    },
  }
}

/** Weathered ashlar courses with chipped arrises, lichen and cracks. */
export function paintAshlar(spec: AshlarSpec): StoneSurface {
  const random = createRandom(spec.seed)
  const ashlar = createAshlar(spec, random)
  const toPixel = facadePixelMapper(spec)
  for (const course of layoutCourses(random, spec.size, toPixel.pxPerMeter)) {
    for (const block of course.blocks) {
      paintBlock(ashlar, course, block)
    }
  }
  for (const crack of spec.cracks) {
    stampCrack(ashlar, crack, toPixel)
  }
  return {
    field: { ...spec.size, values: ashlar.values },
    pixels: ashlar.pixels,
  }
}

export type LimestoneColors = { base: string; shade: string }

/** Pale dressed stone, grimed in its hollows and streaked by rain. */
export function paintLimestone(spec: {
  size: Size
  seed: number
  colors: LimestoneColors
}): StoneSurface {
  const { size } = spec
  const random = createRandom(spec.seed)
  const weather = coarseGrid(
    fractalNoise(random, { x: 9, y: 9, octaves: 5 }),
    size,
    2
  )
  const runs = coarseGrid(
    fractalNoise(random, { x: 28, y: 3, octaves: 3 }),
    size,
    2
  )
  const base = hexRgb(spec.colors.base)
  const shade = hexRgb(spec.colors.shade)
  const values = new Float32Array(size.width * size.height)
  const pixels = new Uint8ClampedArray(size.width * size.height * 4)
  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      const index = y * size.width + x
      const grit = random()
      const pit = grit > 0.993 ? 0.3 : 0
      const relief = gridAt(weather, x, y)
      const run = Math.max(0, gridAt(runs, x, y))
      values[index] = 0.5 + 0.3 * relief + 0.06 * (grit - 0.5) - pit
      const clean = clamp01(0.78 + 0.6 * relief - 0.75 * run - pit * 2)
      const light = 0.9 + 0.2 * grit
      const offset = index * 4
      for (let channel = 0; channel < 3; channel += 1) {
        const dark = shade[channel] ?? 0
        pixels[offset + channel] =
          (dark + ((base[channel] ?? 0) - dark) * clean) * light
      }
      pixels[offset + 3] = 255
    }
  }
  return { field: { ...size, values }, pixels }
}

export function putPixels(
  context: CanvasRenderingContext2D,
  surface: StoneSurface
) {
  const { width, height } = surface.field
  const image = context.createImageData(width, height)
  image.data.set(surface.pixels)
  context.putImageData(image, 0, 0)
}
