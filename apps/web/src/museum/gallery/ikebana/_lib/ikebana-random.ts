export type Random = {
  next: () => number
  range: (min: number, max: number) => number
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
  }
}

type NoisePoint = { x: number; y: number; z: number }

export function hashNoise({ x, y, z }: NoisePoint, seed: number) {
  let hash =
    Math.imul(Math.round(x * 1000), 374761393) ^
    Math.imul(Math.round(y * 1000), 668265263) ^
    Math.imul(Math.round(z * 1000), 1440662683) ^
    Math.imul(seed, 1274126177)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  hash ^= hash >>> 16
  return (hash >>> 0) / 4294967296
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}
