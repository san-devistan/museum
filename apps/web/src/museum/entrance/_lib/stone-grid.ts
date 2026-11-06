import type { Sampler } from "@/museum/_lib/relief/height-field"

export type Size = { width: number; height: number }

export type Rgb = readonly [r: number, g: number, b: number]

/** A periodic noise sampled once on a coarse grid, read back bilinearly. */
export type Grid = {
  width: number
  step: number
  values: Float32Array
}

export function coarseGrid(sampler: Sampler, size: Size, step: number): Grid {
  const width = Math.ceil(size.width / step) + 2
  const height = Math.ceil(size.height / step) + 2
  const values = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      values[y * width + x] = sampler(
        (x * step) / size.width,
        (y * step) / size.height
      )
    }
  }
  return { width, step, values }
}

export function gridAt(grid: Grid, x: number, y: number) {
  const gx = x / grid.step
  const gy = y / grid.step
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const tx = gx - x0
  const ty = gy - y0
  const index = y0 * grid.width + x0
  const a = grid.values[index] ?? 0
  const b = grid.values[index + 1] ?? 0
  const c = grid.values[index + grid.width] ?? 0
  const d = grid.values[index + grid.width + 1] ?? 0
  const top = a + (b - a) * tx
  return top + (c + (d - c) * tx - top) * ty
}

export function hexRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
