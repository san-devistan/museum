export const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

/**
 * Candle brightness around 1: a quick flutter, plus the odd gutter when a
 * draught finds the flame. Pure, so lights and flames can share it.
 */
export function candleFlicker(time: number, phase: number) {
  const t = time + phase
  const flutter =
    Math.sin(t * 7.3) * 0.06 +
    Math.sin(t * 13.7 + 1.1) * 0.04 +
    Math.sin(t * 23.1 + 2.3) * 0.025
  const draught = Math.sin(t * 0.63) * Math.sin(t * 1.37 + 0.4)
  return 1 + flutter - Math.max(0, draught - 0.55) * 0.9
}
