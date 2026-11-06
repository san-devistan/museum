import { clamp } from "@/museum/player/_lib/clamp"
import {
  moveCircle,
  type CollisionWorld,
  type PlanarPoint,
} from "@/museum/player/_lib/player-collision"

export type MoveInput = {
  forward: number
  strafe: number
}

export type MotionState = {
  position: PlanarPoint
  velocity: PlanarPoint
  /** Rate of change of velocity, kept so speed eases in and out. */
  acceleration: PlanarPoint
}

type Axis = keyof PlanarPoint

export const playerTuning = {
  walkSpeed: 1.9,
  /** Share of walking speed when backing up or sidestepping. */
  backwardShare: 0.7,
  strafeShare: 0.85,
  /** Smoothing time setting off and stopping, seconds (critically damped). */
  startTime: 0.3,
  stopTime: 0.18,
  restSpeed: 0.02,
  maxFrameDelta: 0.05,
} as const

const blockedSlack = 1e-3
// Per-frame scratch, reused so the walk loop does not allocate.
const displacement: PlanarPoint = { x: 0, z: 0 }
const spring = { omega: 0, decay: 1, delta: 0 }

export function createMotionState(position: PlanarPoint): MotionState {
  return {
    position,
    velocity: { x: 0, z: 0 },
    acceleration: { x: 0, z: 0 },
  }
}

/**
 * Writes the velocity the input asks for into `out`. Speed follows an
 * ellipse: full ahead, slower sideways, slowest backing up.
 */
export function wishVelocity(
  input: MoveInput,
  yaw: number,
  out: PlanarPoint
): PlanarPoint {
  const length = Math.hypot(input.forward, input.strafe)
  if (length === 0) {
    out.x = 0
    out.z = 0
    return out
  }

  const forward = input.forward / length
  const strafe = input.strafe / length
  const reach = forward < 0 ? playerTuning.backwardShare : 1
  const speed =
    playerTuning.walkSpeed /
    Math.hypot(strafe / playerTuning.strafeShare, forward / reach)
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)

  out.x = (strafe * cos - forward * sin) * speed
  out.z = (-strafe * sin - forward * cos) * speed
  return out
}

function tuneSpring(smoothTime: number, delta: number) {
  const omega = 2 / smoothTime
  const step = omega * delta
  spring.omega = omega
  spring.delta = delta
  spring.decay =
    1 / (1 + step + 0.48 * step * step + 0.235 * step * step * step)
}

/**
 * Critically damped spring on one velocity axis (SmoothDamp): acceleration
 * builds up and fades out instead of jumping, so starts and stops have weight.
 */
function dampAxis(state: MotionState, axis: Axis, target: number) {
  const { omega, decay, delta } = spring
  const offset = state.velocity[axis] - target
  const push = (state.acceleration[axis] + omega * offset) * delta
  state.acceleration[axis] = (state.acceleration[axis] - omega * push) * decay
  state.velocity[axis] = target + (offset + push) * decay
}

function stopDead(state: MotionState) {
  state.velocity.x = 0
  state.velocity.z = 0
  state.acceleration.x = 0
  state.acceleration.z = 0
}

/** Keeps only the velocity a collision let through; walls don't wind it up. */
function limitToAchieved(
  state: MotionState,
  axis: Axis,
  achieved: number,
  delta: number
) {
  const desired = state.velocity[axis]
  const achievedVelocity = achieved / delta
  const limited =
    desired > 0
      ? clamp(achievedVelocity, 0, desired)
      : clamp(achievedVelocity, desired, 0)
  if (Math.abs(limited - desired) > blockedSlack) {
    state.acceleration[axis] = 0
  }
  state.velocity[axis] = limited
}

/** Eases velocity toward `target` with weight, then moves through the world. */
export function stepMotion(
  state: MotionState,
  target: PlanarPoint,
  delta: number,
  world: CollisionWorld
) {
  if (delta <= 0) {
    return
  }

  const isMoving = target.x !== 0 || target.z !== 0
  tuneSpring(isMoving ? playerTuning.startTime : playerTuning.stopTime, delta)
  dampAxis(state, "x", target.x)
  dampAxis(state, "z", target.z)
  const { velocity } = state
  if (
    !isMoving &&
    Math.hypot(velocity.x, velocity.z) < playerTuning.restSpeed
  ) {
    stopDead(state)
    return
  }

  const start = state.position
  displacement.x = velocity.x * delta
  displacement.z = velocity.z * delta
  const position = moveCircle(start, displacement, world)
  limitToAchieved(state, "x", position.x - start.x, delta)
  limitToAchieved(state, "z", position.z - start.z, delta)
  state.position = position
}
