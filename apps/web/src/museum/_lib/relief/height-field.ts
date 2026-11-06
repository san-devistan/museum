export type HeightField = {
  width: number
  height: number
  values: Float32Array
}

export type Random = () => number

export function createRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (value: number) => value * value * (3 - 2 * value)

const wrap = (value: number, size: number) => ((value % size) + size) % size

export type Sampler = (u: number, v: number) => number

export function periodicNoise(
  random: Random,
  cells: { x: number; y: number }
): Sampler {
  const lattice = Float32Array.from(
    { length: cells.x * cells.y },
    () => random() * 2 - 1
  )
  return (u, v) => {
    const x = u * cells.x
    const y = v * cells.y
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const tx = smooth(x - x0)
    const ty = smooth(y - y0)
    const left = wrap(x0, cells.x)
    const right = left + 1 === cells.x ? 0 : left + 1
    const upper = wrap(y0, cells.y) * cells.x
    const lower = upper + cells.x === lattice.length ? 0 : upper + cells.x
    const topLeft = lattice[upper + left] ?? 0
    const bottomLeft = lattice[lower + left] ?? 0
    const top = topLeft + ((lattice[upper + right] ?? 0) - topLeft) * tx
    const bottom =
      bottomLeft + ((lattice[lower + right] ?? 0) - bottomLeft) * tx
    return top + (bottom - top) * ty
  }
}

export function fractalNoise(
  random: Random,
  spec: { x: number; y: number; octaves: number }
): Sampler {
  const samplers: Sampler[] = []
  const weights: number[] = []
  let total = 0
  for (let octave = 0; octave < spec.octaves; octave += 1) {
    const weight = 0.5 ** octave
    samplers.push(
      periodicNoise(random, {
        x: spec.x * 2 ** octave,
        y: spec.y * 2 ** octave,
      })
    )
    weights.push(weight)
    total += weight
  }
  return (u, v) => {
    let sum = 0
    for (let octave = 0; octave < samplers.length; octave += 1) {
      sum += (samplers[octave]?.(u, v) ?? 0) * (weights[octave] ?? 0)
    }
    return sum / total
  }
}

export function createHeightField(
  size: { width: number; height: number },
  sample: (x: number, y: number) => number
): HeightField {
  const values = new Float32Array(size.width * size.height)
  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      values[y * size.width + x] = sample(x, y)
    }
  }
  return { ...size, values }
}

export function paintNormalMap(
  context: CanvasRenderingContext2D,
  spec: { field: HeightField; strength: number }
) {
  const { field, strength } = spec
  const { width, height, values } = field
  const output = context.createImageData(width, height)
  const pixels = output.data
  for (let y = 0; y < height; y += 1) {
    const row = y * width
    const above = (y === 0 ? height - 1 : y - 1) * width
    const below = (y === height - 1 ? 0 : y + 1) * width
    for (let x = 0; x < width; x += 1) {
      const left = x === 0 ? width - 1 : x - 1
      const right = x === width - 1 ? 0 : x + 1
      const dx =
        ((values[row + right] ?? 0) - (values[row + left] ?? 0)) * strength
      const dy =
        ((values[below + x] ?? 0) - (values[above + x] ?? 0)) * strength
      const scale = 127.5 / Math.sqrt(dx * dx + dy * dy + 1)
      const offset = (row + x) * 4
      pixels[offset] = Math.round(127.5 - dx * scale)
      pixels[offset + 1] = Math.round(127.5 + dy * scale)
      pixels[offset + 2] = Math.round(127.5 + scale)
      pixels[offset + 3] = 255
    }
  }
  context.putImageData(output, 0, 0)
}

export function paintHeightGrey(
  context: CanvasRenderingContext2D,
  spec: { field: HeightField; low: number; high: number }
) {
  const { field, low, high } = spec
  const output = context.createImageData(field.width, field.height)
  for (let index = 0; index < field.values.length; index += 1) {
    const value = field.values[index] ?? 0
    const grey = Math.round(
      (low + (high - low) * Math.min(1, Math.max(0, value))) * 255
    )
    const offset = index * 4
    output.data[offset] = grey
    output.data[offset + 1] = grey
    output.data[offset + 2] = grey
    output.data[offset + 3] = 255
  }
  context.putImageData(output, 0, 0)
}
