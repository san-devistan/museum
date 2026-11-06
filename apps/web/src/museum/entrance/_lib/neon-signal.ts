/**
 * What the failing sign just did, for the sounds that follow it. The sign
 * bumps `crackles` on every arc; a listener compares it with the count it
 * last heard. A steady sign (reduced motion, after midnight) never bumps it.
 */
export const neonSignal = {
  crackles: 0,
  /** How hard the latest arc hit, 0 to 1. */
  strength: 0,
}

export function signalCrackle(strength: number) {
  neonSignal.crackles += 1
  neonSignal.strength = strength
}
