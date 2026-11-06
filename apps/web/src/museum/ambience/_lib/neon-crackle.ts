import { neonSignal } from "@/museum/entrance/_lib/neon-signal"

/**
 * Follows the failing sign: one crackle for each arc it throws, as hard as
 * the arc. A steady sign (reduced motion, after midnight) stays silent.
 */
export type CrackleState = { heard: number }

export function createCrackle(): CrackleState {
  return { heard: neonSignal.crackles }
}

/** The strength (0 to 1) of an arc thrown since the last call, or 0. */
export function advanceCrackle(state: CrackleState) {
  if (state.heard === neonSignal.crackles) {
    return 0
  }
  state.heard = neonSignal.crackles
  return neonSignal.strength
}
