import { footstepTuning } from "@/museum/ambience/_lib/ambience-tuning"

export type StepKind = "stride" | "settle"

type PlanarPoint = { x: number; z: number }

/**
 * Walk cadence read from the camera alone. The position is low-passed first
 * so head bob and camera shake never count as steps.
 */
export type FootstepState = {
  position: PlanarPoint | null
  travelled: number
  nextStride: number
  isMoving: boolean
}

export function createFootsteps(): FootstepState {
  return {
    position: null,
    travelled: footstepTuning.stride * footstepTuning.restartShare,
    nextStride: footstepTuning.stride,
    isMoving: false,
  }
}

export function resetFootsteps(state: FootstepState) {
  Object.assign(state, createFootsteps())
}

function strideFor(speed: number) {
  const jitter = footstepTuning.strideJitter * (Math.random() * 2 - 1)
  const length = Math.max(
    footstepTuning.stride,
    speed / footstepTuning.maxCadence
  )
  return length * (1 + jitter)
}

function stop(state: FootstepState): StepKind | null {
  const shouldSettle =
    state.isMoving &&
    state.travelled > state.nextStride * footstepTuning.settleShare
  state.isMoving = false
  state.travelled = state.nextStride * footstepTuning.restartShare
  return shouldSettle ? "settle" : null
}

export function advanceFootsteps(
  state: FootstepState,
  target: PlanarPoint,
  delta: number
): StepKind | null {
  const previous = state.position
  if (delta <= 0) {
    return null
  }
  if (
    !previous ||
    Math.hypot(target.x - previous.x, target.z - previous.z) >
      footstepTuning.teleport
  ) {
    resetFootsteps(state)
    state.position = { x: target.x, z: target.z }
    return null
  }

  const follow = 1 - Math.exp(-delta / footstepTuning.smoothing)
  const next = {
    x: previous.x + (target.x - previous.x) * follow,
    z: previous.z + (target.z - previous.z) * follow,
  }
  const distance = Math.hypot(next.x - previous.x, next.z - previous.z)
  const speed = distance / delta
  state.position = next

  if (speed < footstepTuning.minSpeed) {
    return stop(state)
  }
  state.isMoving = true
  state.travelled += distance
  if (state.travelled < state.nextStride) {
    return null
  }
  state.travelled -= state.nextStride
  state.nextStride = strideFor(speed)
  return "stride"
}
