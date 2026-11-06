export type VelvetPaintOptions = {
  width: number
  height: number
  seed: number
  base: string
  highlight: string
  shadow: string
}

type Rgb = { r: number; g: number; b: number }
type Sampler = (u: number, v: number) => number
type Grid = { cellsX: number; cellsY: number }

function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function parseHex(color: string): Rgb {
  const digits = color.trim().replace("#", "")
  const short = digits.length === 3 || digits.length === 4
  const full = short
    ? digits.slice(0, 3).replaceAll(/./g, (digit) => digit + digit)
    : digits.slice(0, 6)
  const value = Number.parseInt(full.padEnd(6, "0"), 16)
  const safe = Number.isNaN(value) ? 0 : value
  return { r: (safe >> 16) & 255, g: (safe >> 8) & 255, b: safe & 255 }
}

function sampleColor(context: CanvasRenderingContext2D, color: string): Rgb {
  if (color.trim().startsWith("#")) return parseHex(color)
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return { r, g, b }
}

const smooth = (value: number) => value * value * (3 - 2 * value)

function createPeriodicNoise(random: () => number, grid: Grid): Sampler {
  const { cellsX, cellsY } = grid
  const values = Float32Array.from({ length: cellsX * cellsY }, random)
  return (u, v) => {
    const x = (u - Math.floor(u)) * cellsX
    const y = (v - Math.floor(v)) * cellsY
    const floorX = Math.floor(x)
    const floorY = Math.floor(y)
    const x0 = floorX >= cellsX ? floorX - cellsX : floorX
    const y0 = floorY >= cellsY ? floorY - cellsY : floorY
    const x1 = x0 + 1 === cellsX ? 0 : x0 + 1
    const row0 = y0 * cellsX
    const row1 = y0 + 1 === cellsY ? 0 : row0 + cellsX
    const tx = smooth(x - floorX)
    const ty = smooth(y - floorY)
    const topLeft = values[row0 + x0] ?? 0
    const bottomLeft = values[row1 + x0] ?? 0
    const top = topLeft + ((values[row0 + x1] ?? 0) - topLeft) * tx
    const bottom = bottomLeft + ((values[row1 + x1] ?? 0) - bottomLeft) * tx
    return top + (bottom - top) * ty
  }
}

function createFbm(random: () => number, grid: Grid, octaves: number): Sampler {
  const layers = Array.from({ length: octaves }, (_, index) =>
    createPeriodicNoise(random, {
      cellsX: grid.cellsX * 2 ** index,
      cellsY: grid.cellsY * 2 ** index,
    })
  )
  return (u, v) => {
    let sum = 0
    let total = 0
    let weight = 1
    for (const layer of layers) {
      sum += layer(u, v) * weight
      total += weight
      weight *= 0.55
    }
    return sum / total
  }
}

function wrapBlur(
  source: Float32Array,
  size: { width: number; height: number },
  radius: number
): Float32Array {
  const { width, height } = size
  const horizontal = new Float32Array(source.length)
  const result = new Float32Array(source.length)
  const span = radius * 2 + 1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      for (let k = -radius; k <= radius; k += 1) {
        sum += source[y * width + ((x + k + width) % width)] ?? 0
      }
      horizontal[y * width + x] = sum / span
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      for (let k = -radius; k <= radius; k += 1) {
        sum += horizontal[((y + k + height) % height) * width + x] ?? 0
      }
      result[y * width + x] = sum / span
    }
  }
  return result
}

function createFibers(
  random: () => number,
  width: number,
  height: number
): Float32Array {
  const raw = Float32Array.from(
    { length: width * height },
    () => random() - 0.5
  )
  const soft = wrapBlur(raw, { width, height }, 1)
  return raw.map((value, index) => value * 0.55 + (soft[index] ?? 0) * 1.8)
}

function createStreaks(
  random: () => number,
  width: number,
  height: number
): Float32Array {
  const raw = Float32Array.from(
    { length: width * height },
    () => random() - 0.5
  )
  const result = new Float32Array(raw.length)
  const reach = Math.max(4, Math.round(height / 40))
  const lean = 0.18
  const leanX = Int32Array.from({ length: reach * 2 + 1 }, (_, index) =>
    Math.round((index - reach) * lean)
  )
  const norm = 1 / Math.sqrt(reach * 2 + 1)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      for (let tap = 0; tap < leanX.length; tap += 1) {
        const sx = (x + (leanX[tap] ?? 0) + width) % width
        const sy = (y + tap - reach + height) % height
        sum += raw[sy * width + sx] ?? 0
      }
      result[y * width + x] = sum * norm
    }
  }
  return result
}

function centered(values: Float32Array): Float32Array {
  let mean = 0
  for (let index = 0; index < values.length; index += 1) {
    mean += values[index] ?? 0
  }
  mean /= values.length || 1
  let spread = 0
  for (let index = 0; index < values.length; index += 1) {
    spread = Math.max(spread, Math.abs((values[index] ?? 0) - mean))
  }
  const scale = 1 / (spread || 1)
  const result = new Float32Array(values.length)
  for (let index = 0; index < values.length; index += 1) {
    result[index] = ((values[index] ?? 0) - mean) * scale
  }
  return result
}

function sampleField(
  sampler: Sampler,
  width: number,
  height: number
): Float32Array {
  const values = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      values[y * width + x] = sampler(x / width, y / height)
    }
  }
  return values
}

function createCreases(random: () => number): Sampler {
  const warpX = createFbm(random, { cellsX: 2, cellsY: 2 }, 3)
  const warpY = createFbm(random, { cellsX: 2, cellsY: 2 }, 3)
  const folds = createFbm(random, { cellsX: 3, cellsY: 4 }, 3)
  return (u, v) => {
    const n = folds(u + warpX(u, v) * 0.6, v + warpY(u, v) * 0.6)
    return (1 - Math.abs(2 * n - 1)) ** 3
  }
}

export function paintVelvet(
  context: CanvasRenderingContext2D,
  options: VelvetPaintOptions
): void {
  const { width, height } = options
  const random = createRandom(options.seed)
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  const base = sampleColor(context, options.base)
  const highlight = sampleColor(context, options.highlight)
  const shadow = sampleColor(context, options.shadow)
  const crush = centered(
    sampleField(createFbm(random, { cellsX: 3, cellsY: 3 }, 4), width, height)
  )
  const sheen = centered(
    sampleField(createFbm(random, { cellsX: 2, cellsY: 5 }, 3), width, height)
  )
  const creases = centered(sampleField(createCreases(random), width, height))
  const fibers = centered(createFibers(random, width, height))
  const streaks = centered(createStreaks(random, width, height))
  const output = context.createImageData(width, height)
  const pixels = output.data
  for (let index = 0; index < width * height; index += 1) {
    const pile =
      0.48 * (crush[index] ?? 0) +
      0.2 * (sheen[index] ?? 0) +
      0.22 * (creases[index] ?? 0) +
      0.05 * (streaks[index] ?? 0) +
      0.05 * (fibers[index] ?? 0)
    const lift = Math.max(0, pile) * 0.18
    const shade = Math.max(0, -pile) * 0.36
    const fiber =
      1 + (fibers[index] ?? 0) * 0.075 + (streaks[index] ?? 0) * 0.03
    const litR = base.r + (highlight.r - base.r) * lift
    const litG = base.g + (highlight.g - base.g) * lift
    const litB = base.b + (highlight.b - base.b) * lift
    const offset = index * 4
    pixels[offset] = (litR + (shadow.r - litR) * shade) * fiber
    pixels[offset + 1] = (litG + (shadow.g - litG) * shade) * fiber
    pixels[offset + 2] = (litB + (shadow.b - litB) * shade) * fiber
    pixels[offset + 3] = 255
  }
  context.putImageData(output, 0, 0)
  context.restore()
}
