import { lerp, smoothstep } from "@/museum/gallery/ikebana/_lib/ikebana-random"
import {
  aimHead,
  approach,
  headCenter,
  type HeadMotion,
  type LivingFrame,
  type LivingState,
} from "@/museum/gallery/ikebana/_lib/living-motion"
import { livingMemory } from "@/museum/gallery/ikebana/_lib/living-registry"
import {
  livingTuning,
  mouthPreference,
} from "@/museum/gallery/ikebana/_lib/living-tuning"
import { Vector3 } from "three"

const { snap: tuning } = livingTuning
const flareFold = 1.25
const soundAt = (tuning.flare + tuning.shut) / 2

const scratch = { center: new Vector3(), lunge: new Vector3() }

function floorDistance(from: Vector3, to: Vector3) {
  return Math.hypot(from.x - to.x, from.z - to.z)
}

// The bud that becomes a mouth: near the visitor, big, callas and blooms first.
function pickMouth(state: LivingState, camera: Vector3) {
  let best = -1
  let bestScore = Number.POSITIVE_INFINITY
  for (const [index, head] of state.heads.entries()) {
    const score =
      (head.center.distanceTo(camera) * mouthPreference[head.kind]) /
      Math.sqrt(head.size)
    if (score < bestScore) {
      best = index
      bestScore = score
    }
  }
  return best
}

// Moves the mouth toward the visitor, from where it rests.
function reachFor(state: LivingState, frame: LivingFrame, amount: number) {
  const { mouth } = state.snap
  const head = state.heads[mouth]
  const motion = state.motion[mouth]
  if (!head || !motion) {
    return
  }
  scratch.lunge.copy(frame.camera).sub(head.center).normalize()
  motion.shift.copy(scratch.lunge).multiplyScalar(amount)
}

// As the visitor leans in, the bud turns to them, swells and parts its lips;
// too close, and it bites.
function waitForVisitor(state: LivingState, frame: LivingFrame) {
  const { snap } = state
  if (livingMemory.snapped.has(state.role) || state.bloom > 0.2) {
    snap.stage = "done"
    return
  }
  const isLooking = frame.watched > 0.5
  if (snap.mouth < 0 && isLooking && frame.distance < tuning.lure) {
    snap.mouth = pickMouth(state, frame.camera)
  }
  const motion = state.motion[snap.mouth]
  if (!motion) {
    return
  }
  const center = headCenter(state, snap.mouth, scratch.center)
  const distance = floorDistance(center, frame.camera)
  const lure = isLooking
    ? 1 - smoothstep(tuning.distance, tuning.lure, distance)
    : 0
  snap.lure = approach(snap.lure, lure, frame.delta * tuning.lureRate)
  motion.fold += snap.lure * tuning.lureFold
  if (!frame.isStill) {
    motion.size *= 1 + snap.lure * tuning.lureSwell
    aimHead(state, snap.mouth, frame.camera, 1.5 * snap.lure * frame.delta)
    reachFor(state, frame, tuning.lureLean * snap.lure)
  }
  if (distance < tuning.distance && frame.watched > 0.6) {
    snap.stage = "biting"
    snap.time = 0
    snap.from = motion.fold
    livingMemory.snapped.add(state.role)
    if (frame.isStill) {
      state.events.snap = "quiet"
    }
  }
}

function biteFold(motion: HeadMotion, from: number, time: number) {
  if (time < tuning.flare) {
    return lerp(from, flareFold, smoothstep(0, tuning.flare, time))
  }
  if (time < tuning.shut) {
    return lerp(
      flareFold,
      tuning.bite,
      smoothstep(tuning.flare, tuning.shut, time)
    )
  }
  const after = time - tuning.shut
  const chew = Math.abs(Math.sin(after * 18)) * Math.exp(-after * 3) * 0.07
  return lerp(
    tuning.bite + chew,
    motion.fold,
    smoothstep(1.2, tuning.end, time)
  )
}

function lungeCurve(time: number) {
  if (time < tuning.flare) {
    return 0
  }
  if (time < tuning.shut) {
    return smoothstep(tuning.flare, tuning.shut, time)
  }
  const after = time - tuning.shut
  return Math.exp(-after * 5) * Math.cos(after * 13)
}

function bite(state: LivingState, frame: LivingFrame) {
  const { snap } = state
  const motion = state.motion[snap.mouth]
  if (!motion) {
    snap.stage = "done"
    return
  }
  const previous = snap.time
  snap.time += frame.delta
  const time = snap.time
  if (frame.isStill) {
    const close = smoothstep(0, tuning.stillClose, time)
    motion.fold = lerp(snap.from, motion.fold, close)
    snap.stage = time >= tuning.stillClose ? "done" : "biting"
    return
  }
  if (time < tuning.shut) {
    aimHead(state, snap.mouth, frame.camera, 14 * frame.delta)
  }
  const settle = 1 - smoothstep(0.4, tuning.end, time)
  motion.fold = biteFold(motion, snap.from, time)
  motion.size *= 1 + tuning.lureSwell * settle
  reachFor(
    state,
    frame,
    tuning.lureLean * settle + tuning.lunge * lungeCurve(time)
  )
  if (previous < soundAt && time >= soundAt) {
    state.events.snap = "jolt"
  }
  if (time >= tuning.end) {
    snap.stage = "done"
  }
}

export function advanceSnap(state: LivingState, frame: LivingFrame) {
  if (state.role !== "boudoir") {
    return
  }
  switch (state.snap.stage) {
    case "waiting": {
      waitForVisitor(state, frame)
      break
    }
    case "biting": {
      bite(state, frame)
      break
    }
    case "done": {
      break
    }
  }
}
