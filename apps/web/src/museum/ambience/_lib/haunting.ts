import {
  behindEmitters,
  hauntBounds,
  hauntTiming,
  hauntWeights,
  randomIn,
  type HauntKind,
} from "@/museum/ambience/_lib/ambience-tuning"
import { MathUtils, Vector3, type Camera } from "three"

/**
 * Rare unsettling one-shots. The clock only runs while the visitor explores,
 * starts with a quiet stretch, and spaces events tens of seconds apart.
 */
export type HauntState = {
  clock: number
  nextAt: number
  last: HauntKind | null
  lastWhisperAt: number
}

function isHauntKind(key: string): key is HauntKind {
  return key in hauntWeights
}

const hauntKinds = Object.keys(hauntWeights).filter(isHauntKind)

export function createHaunting(): HauntState {
  return {
    clock: 0,
    nextAt: randomIn(hauntTiming.quietStart),
    last: null,
    lastWhisperAt: Number.NEGATIVE_INFINITY,
  }
}

export function resetHaunting(state: HauntState) {
  Object.assign(state, createHaunting())
}

function pickHaunt(state: HauntState, canWhisper: boolean): HauntKind {
  const isWhisperReady =
    canWhisper &&
    state.clock - state.lastWhisperAt >= hauntTiming.whisperCooldown
  const options = hauntKinds.filter(
    (kind) => kind !== state.last && (kind !== "whisper" || isWhisperReady)
  )
  const total = options.reduce((sum, kind) => sum + hauntWeights[kind], 0)
  let roll = Math.random() * total
  for (const kind of options) {
    roll -= hauntWeights[kind]
    if (roll <= 0) {
      return kind
    }
  }
  return options.at(-1) ?? "creak"
}

export function advanceHaunting(
  state: HauntState,
  delta: number,
  canWhisper: boolean
): HauntKind | null {
  state.clock += delta
  if (state.clock < state.nextAt) {
    return null
  }
  const kind = pickHaunt(state, canWhisper)
  state.last = kind
  state.nextAt = state.clock + randomIn(hauntTiming.gap)
  if (kind === "whisper") {
    state.lastWhisperAt = state.clock
  }
  return kind
}

const facing = new Vector3()

/** A spot behind the visitor, a little to one side, kept inside the room. */
export function behindVisitor(
  camera: Camera,
  kind: keyof typeof behindEmitters,
  target: Vector3
) {
  const spec = behindEmitters[kind]
  camera.getWorldDirection(facing)
  const angle =
    Math.atan2(-facing.x, -facing.z) + (Math.random() * 2 - 1) * spec.spread
  const distance = randomIn(spec.distance)
  return target.set(
    MathUtils.clamp(
      camera.position.x + Math.sin(angle) * distance,
      hauntBounds.minX,
      hauntBounds.maxX
    ),
    randomIn(spec.height),
    MathUtils.clamp(
      camera.position.z + Math.cos(angle) * distance,
      hauntBounds.minZ,
      hauntBounds.maxZ
    )
  )
}
