// Candle flicker: a slow breathing plus a quick shiver, per candle seed.
export function candleFlicker(time: number, seed: number) {
  return (
    Math.sin(time * 6.1 + seed * 1.7) * 0.07 +
    Math.sin(time * 15.3 + seed * 4.1) * 0.04 +
    Math.sin(time * 1.3 + seed) * 0.05
  )
}
