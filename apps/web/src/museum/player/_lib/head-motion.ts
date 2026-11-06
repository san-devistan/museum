import { clamp } from "@/museum/player/_lib/clamp"
import type { Foot, FootstepKind } from "@/museum/player/_lib/footstep-signal"
import type { PlanarPoint } from "@/museum/player/_lib/player-collision"
import type { LookAngles } from "@/museum/player/_lib/player-look"
import { playerTuning } from "@/museum/player/_lib/player-motion"

type Gait = "walking" | "stopping" | "ready"

/**
 * Head motion layered on the walk: a bob synced to distance walked, slow
 * breathing while standing, and a lean into strafes and fast turns. `side`,
 * `up`, `pitch` and `roll` are this frame's offsets in the view's frame.
 */
export type HeadMotion = {
  /** Gait cycle, one turn per two steps: right foot lands at 0, left at π. */
  stride: number
  /** 0 standing to 1 at walking pace, eased so the bob fades in and out. */
  walk: number
  gait: Gait
  /** Stopping put the trailing foot down, so the other foot leads next. */
  hasSettled: boolean
  /** Foot that landed last. */
  foot: Foot
  /** Ground speed, m/s. */
  speed: number
  /** Seconds of breathing; never reset so the rhythm never jumps. */
  breath: number
  /** Last view yaw, to measure turn speed. */
  yaw: number
  /** Smoothed turn speed, rad/s. */
  turnRate: number
  /** Roll into strafes and turns, radians. */
  lean: number
  side: number
  up: number
  pitch: number
  roll: number
}

export const headTuning = {
  /** Metres per footfall. */
  stepLength: 0.75,
  /** Feet start above this ground speed (m/s) and stop below the next. */
  startSpeed: 0.2,
  standSpeed: 0.12,
  /** Stopping this far into a step still puts the trailing foot down. */
  settleShare: 0.4,
  /** Share of a step before the first footfall when setting off. */
  firstStep: 0.45,
  /** How fast the bob follows the pace, 1/s. */
  walkFollow: 6,
  /** Bob, metres peak to peak; lowest as each foot lands. */
  bobHeight: 0.022,
  /** Rounds the bottom of the bob so a landing dips rather than clicks. */
  bobSoftness: 0.15,
  /** Sway over two steps, metres each way. */
  swayWidth: 0.012,
  /** Roll riding along with the sway, radians (~0.3°). */
  swayRoll: 0.005,
  /** Nose dip as a foot lands, radians (~0.2°). */
  stepNod: 0.0035,
  /** Seconds per breath. */
  breathPeriod: 4.6,
  /** Breathing rise in metres and pitch in radians (~0.15°). */
  breathHeight: 0.003,
  breathPitch: 0.0026,
  /** The head tips up a beat after the chest rises, radians of phase. */
  breathLag: 0.6,
  /** Breaths swell and fade by this share over this many seconds. */
  breathDrift: 0.25,
  breathDriftPeriod: 17,
  /** Share of breathing left at full walking pace. */
  walkingBreath: 0.3,
  /** Roll into a full-speed strafe, radians (~0.8°). */
  strafeLean: 0.014,
  /** Roll per rad/s of turning (~0.8° at a brisk 3 rad/s). */
  turnLean: 0.0045,
  maxLean: 0.026,
  turnFollow: 10,
  leanFollow: 5,
} as const

const halfTurn = Math.PI
const fullTurn = Math.PI * 2
const restWalk = 0.02
const softPeak = Math.hypot(1, headTuning.bobSoftness) - headTuning.bobSoftness

export function createHeadMotion(yaw: number): HeadMotion {
  return {
    stride: halfTurn * (1 - headTuning.firstStep),
    walk: 0,
    gait: "ready",
    hasSettled: false,
    foot: "right",
    speed: 0,
    breath: 0,
    yaw,
    turnRate: 0,
    lean: 0,
    side: 0,
    up: 0,
    pitch: 0,
    roll: 0,
  }
}

function ease(rate: number, delta: number) {
  return 1 - Math.exp(-rate * delta)
}

function stride(head: HeadMotion, delta: number): FootstepKind | null {
  head.gait = "walking"
  head.hasSettled = false
  const before = head.stride
  const after = before + (head.speed * delta * halfTurn) / headTuning.stepLength
  head.stride = after % fullTurn
  if (Math.floor(after / halfTurn) === Math.floor(before / halfTurn)) {
    return null
  }
  head.foot = head.stride < halfTurn ? "right" : "left"
  return "stride"
}

function stop(head: HeadMotion): FootstepKind | null {
  head.gait = "stopping"
  const lifted = (head.stride % halfTurn) / halfTurn
  head.hasSettled = lifted >= headTuning.settleShare
  if (!head.hasSettled) {
    return null
  }
  head.foot = head.stride < halfTurn ? "left" : "right"
  return "settle"
}

/** Once the bob has faded, line the gait up so the next step lands soon. */
function prime(head: HeadMotion) {
  head.gait = "ready"
  const stance = head.stride < halfTurn ? 0 : halfTurn
  const next = head.hasSettled ? (stance + halfTurn) % fullTurn : stance
  head.stride = next + halfTurn * (1 - headTuning.firstStep)
}

function stepFeet(head: HeadMotion, delta: number) {
  const isWalking = head.gait === "walking"
  const threshold = isWalking ? headTuning.standSpeed : headTuning.startSpeed
  if (head.speed >= threshold) {
    return stride(head, delta)
  }
  if (isWalking) {
    return stop(head)
  }
  if (head.gait === "stopping" && head.walk < restWalk) {
    prime(head)
  }
  return null
}

function gaitPose(head: HeadMotion) {
  const swing = Math.sin(head.stride)
  const softness = headTuning.bobSoftness
  const lift = (Math.hypot(swing, softness) - softness) / softPeak
  const { walk } = head
  head.side = walk * headTuning.swayWidth * swing
  head.up = walk * headTuning.bobHeight * (lift - 0.5)
  head.pitch = -walk * headTuning.stepNod * (1 - lift) ** 2
  head.roll = -walk * headTuning.swayRoll * swing
}

function breathPose(head: HeadMotion, delta: number) {
  head.breath += delta
  const cycle = (head.breath / headTuning.breathPeriod) * fullTurn
  const drift = (head.breath / headTuning.breathDriftPeriod) * fullTurn
  const swell = 1 + headTuning.breathDrift * Math.sin(drift)
  const calm = 1 - head.walk * (1 - headTuning.walkingBreath)
  const depth = calm * swell
  head.up += depth * headTuning.breathHeight * Math.sin(cycle)
  head.pitch +=
    depth * headTuning.breathPitch * Math.sin(cycle - headTuning.breathLag)
}

/**
 * Negative roll tips the head right: into a strafe to the right, and into a
 * right turn (yaw falling).
 */
function leanPose(
  head: HeadMotion,
  view: LookAngles,
  velocity: PlanarPoint,
  delta: number
) {
  const yawRate = (view.yaw - head.yaw) / delta
  head.yaw = view.yaw
  head.turnRate +=
    (yawRate - head.turnRate) * ease(headTuning.turnFollow, delta)
  const lateral =
    velocity.x * Math.cos(view.yaw) - velocity.z * Math.sin(view.yaw)
  const strafe = (lateral / playerTuning.walkSpeed) * headTuning.strafeLean
  const target = clamp(
    head.turnRate * headTuning.turnLean - strafe,
    -headTuning.maxLean,
    headTuning.maxLean
  )
  head.lean += (target - head.lean) * ease(headTuning.leanFollow, delta)
  head.roll += head.lean
}

/** Advances the head one frame; returns the step that landed, if any. */
export function stepHeadMotion(
  head: HeadMotion,
  velocity: PlanarPoint,
  view: LookAngles,
  delta: number
): FootstepKind | null {
  if (delta <= 0) {
    return null
  }
  head.speed = Math.hypot(velocity.x, velocity.z)
  const pace = Math.min(head.speed / playerTuning.walkSpeed, 1)
  head.walk += (pace - head.walk) * ease(headTuning.walkFollow, delta)
  const step = stepFeet(head, delta)
  gaitPose(head)
  breathPose(head, delta)
  leanPose(head, view, velocity, delta)
  return step
}
