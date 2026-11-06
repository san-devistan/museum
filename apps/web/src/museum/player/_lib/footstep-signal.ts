/**
 * The player's footfalls, for anything that wants to land a sound on them.
 * Poll `footstepSignal.count` each frame, or subscribe with `onFootstep`.
 */

export type FootstepKind = "stride" | "settle"

export type Foot = "left" | "right"

export type FootstepSignal = {
  /** Steps landed so far; bumps exactly once per footfall, never resets. */
  count: number
  /** `stride` mid-walk, `settle` when the trailing foot comes down on a stop. */
  kind: FootstepKind
  foot: Foot
  /** Ground speed when the last foot landed, m/s. */
  stepSpeed: number
  /** Ground speed right now, m/s, refreshed every frame. */
  speed: number
}

type FootstepListener = (step: Readonly<FootstepSignal>) => void

const signal: FootstepSignal = {
  count: 0,
  kind: "stride",
  foot: "right",
  stepSpeed: 0,
  speed: 0,
}

const listeners = new Set<FootstepListener>()

/** Live view of the walk. Reused every frame; read it, don't keep it. */
export const footstepSignal: Readonly<FootstepSignal> = signal

/** Calls `listener` from the frame loop each time a foot lands. */
export function onFootstep(listener: FootstepListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function landFootstep(kind: FootstepKind, foot: Foot, speed: number) {
  signal.count += 1
  signal.kind = kind
  signal.foot = foot
  signal.stepSpeed = speed
  for (const listener of listeners) {
    listener(signal)
  }
}

export function trackGroundSpeed(speed: number) {
  signal.speed = speed
}

export function resetFootstepSignal() {
  signal.speed = 0
  signal.stepSpeed = 0
}
