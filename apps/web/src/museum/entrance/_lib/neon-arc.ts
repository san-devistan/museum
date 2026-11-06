import type { Random } from "@/museum/_lib/relief/height-field"

/** Flat `[x0, y0, x1, y1, …]` polyline, reshaped in place for every jitter. */
export type ArcPath = {
  points: Float32Array
  count: number
}

export type ArcEnds = {
  fromX: number
  fromY: number
  toX: number
  toY: number
}

const amplitudeFalloff = 0.55

export function createArcPath(depth: number): ArcPath {
  const count = 2 ** depth + 1
  return { points: new Float32Array(count * 2), count }
}

/** Midpoint-displacement bolt between two ends, written without allocating. */
export function shapeArc(
  path: ArcPath,
  ends: ArcEnds,
  random: Random,
  jag: number
) {
  const { points } = path
  const last = path.count - 1
  const chordX = ends.toX - ends.fromX
  const chordY = ends.toY - ends.fromY
  const length = Math.hypot(chordX, chordY) || 1
  const normalX = -chordY / length
  const normalY = chordX / length
  points[0] = ends.fromX
  points[1] = ends.fromY
  points[last * 2] = ends.toX
  points[last * 2 + 1] = ends.toY
  let amplitude = length * jag
  for (let step = last; step > 1; step /= 2) {
    for (let start = 0; start < last; start += step) {
      const from = start * 2
      const mid = (start + step / 2) * 2
      const to = (start + step) * 2
      const offset = (random() * 2 - 1) * amplitude
      points[mid] = (points[from] + points[to]) / 2 + normalX * offset
      points[mid + 1] =
        (points[from + 1] + points[to + 1]) / 2 + normalY * offset
    }
    amplitude *= amplitudeFalloff
  }
}
