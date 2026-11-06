import {
  createRandom,
  lerp,
  smoothstep,
} from "@/museum/gallery/ikebana/_lib/ikebana-random"
import type { LivingHead } from "@/museum/gallery/ikebana/_lib/living-geometry"
import type { LivingIkebanaRole } from "@/museum/gallery/ikebana/_lib/living-role"
import type { LivingUniforms } from "@/museum/gallery/ikebana/_lib/living-shader"
import {
  feedingColor,
  livingTuning,
  mouthPreference,
} from "@/museum/gallery/ikebana/_lib/living-tuning"
import { Color, Quaternion, Vector3 } from "three"

const { bud, turn, bloom, feed } = livingTuning
const fullTurn = Math.PI * 2

export type HeadMotion = {
  turn: Quaternion
  shift: Vector3
  // 0 to 1: offsets its breath, its opening and its bite.
  phase: number
  period: number
  open: number
  fold: number
  size: number
  // Share already eaten by its double.
  bitten: number
  flinch: number
  cycle: number
}

export type SnapState = {
  stage: "waiting" | "biting" | "done"
  time: number
  lure: number
  mouth: number
  from: number
}

export type LivingEvents = {
  bite: boolean
  snap: "jolt" | "quiet" | null
}

export type LivingState = {
  role: LivingIkebanaRole
  heads: readonly LivingHead[]
  motion: HeadMotion[]
  tints: Color[]
  uniforms: LivingUniforms
  isTable: boolean
  bloom: number
  feed: number
  // Head reaching for the other table ikebana, -1 while none.
  reacher: number
  snap: SnapState
  events: LivingEvents
}

export type LivingFrame = {
  delta: number
  time: number
  // The visitor's eye, in the ikebana's own space.
  camera: Vector3
  // 1 while looked at, 0 when far off-centre or out of view.
  watched: number
  // Metres to the visitor, along the floor.
  distance: number
  isStill: boolean
  isFeeding: boolean
  isMidnight: boolean
  // The other table ikebana's reaching head, in this one's space.
  partner: Vector3 | null
}

const roleSeeds: Record<LivingIkebanaRole, number> = {
  vestibule: 11,
  boudoir: 23,
  "table-left": 37,
  "table-right": 41,
}

export function createLivingState(
  role: LivingIkebanaRole,
  heads: readonly LivingHead[],
  uniforms: LivingUniforms
): LivingState {
  const random = createRandom(roleSeeds[role])
  return {
    role,
    heads,
    uniforms,
    motion: heads.map(() => ({
      turn: new Quaternion(),
      shift: new Vector3(),
      phase: random.next(),
      period: random.range(feed.minPeriod, feed.maxPeriod),
      open: 0,
      fold: bud.fold,
      size: bud.size,
      bitten: 0,
      flinch: 0,
      cycle: 0,
    })),
    tints: heads.map(
      (head, index) => new Color(feedingColor(head.kind, index))
    ),
    isTable: role === "table-left" || role === "table-right",
    bloom: 0,
    feed: 0,
    reacher: -1,
    snap: { stage: "waiting", time: 0, lure: 0, mouth: -1, from: bud.fold },
    events: { bite: false, snap: null },
  }
}

export function approach(value: number, target: number, step: number) {
  return value < target
    ? Math.min(target, value + step)
    : Math.max(target, value - step)
}

function advanceBloom(state: LivingState, frame: LivingFrame) {
  const isFeeding = state.isTable && frame.isFeeding
  const target = isFeeding || frame.isMidnight ? 1 : 0
  const step =
    frame.delta / (frame.isStill ? bloom.stillSeconds : bloom.seconds)
  state.bloom = approach(state.bloom, target, step)
  state.feed = approach(state.feed, isFeeding ? 1 : 0, step)
}

// Slow mouth: 1 wide open, 0 shut.
function chompMouth(cycle: number) {
  if (cycle < feed.openUntil) {
    return smoothstep(0, feed.openUntil, cycle)
  }
  return 1 - smoothstep(feed.openUntil, feed.shutAt, cycle)
}

function shapeHead(state: LivingState, frame: LivingFrame, index: number) {
  const motion = state.motion[index]
  if (!motion) {
    return
  }
  const start = bloom.stagger * motion.phase
  motion.open = smoothstep(start, start + 1 - bloom.stagger, state.bloom)
  const closed = 1 - motion.open
  let fold = lerp(bud.fold, 1, motion.open)
  let size = lerp(bud.size, 1, motion.open)
  const previousCycle = motion.cycle
  motion.cycle = (frame.time / motion.period + motion.phase) % 1
  if (!frame.isStill) {
    const breath = Math.sin(
      frame.time * bud.breathRate + motion.phase * fullTurn
    )
    fold += breath * bud.breathFold * closed
    size *= 1 + breath * bud.breathSize * (0.3 + 0.7 * closed)
    const mouth = lerp(feed.shutFold, feed.wideFold, chompMouth(motion.cycle))
    fold = lerp(fold, mouth, state.feed * motion.open)
  }
  const flinch = Math.max(0, motion.flinch) / feed.flinch
  motion.flinch -= frame.delta
  motion.fold = fold - 0.3 * flinch
  motion.size = size * (1 - feed.eatenSize * motion.bitten)
  if (
    index === state.reacher &&
    state.role === "table-right" &&
    !frame.isStill &&
    previousCycle < feed.biteAt &&
    motion.cycle >= feed.biteAt
  ) {
    state.events.bite = isWithinReach(state, frame, index)
  }
}

const scratch = {
  direction: new Vector3(),
  center: new Vector3(),
  aim: new Quaternion(),
  clamped: new Quaternion(),
  desired: new Vector3(),
  rest: new Vector3(),
}

// Where a head's middle is now, in the ikebana's space.
export function headCenter(state: LivingState, index: number, target: Vector3) {
  const head = state.heads[index]
  const motion = state.motion[index]
  if (!head || !motion) {
    return target.set(0, 0, 0)
  }
  return target
    .copy(head.center)
    .sub(head.pivot)
    .multiplyScalar(motion.size)
    .applyQuaternion(motion.turn)
    .add(head.pivot)
    .add(motion.shift)
}

function isWithinReach(state: LivingState, frame: LivingFrame, index: number) {
  const head = state.heads[index]
  if (!head || !frame.partner || state.feed < 0.5) {
    return false
  }
  const gap = headCenter(state, index, scratch.center).distanceTo(frame.partner)
  return gap < head.size * 2.4 + feed.reach
}

export function aimHead(
  state: LivingState,
  index: number,
  target: Vector3,
  rate: number
) {
  const head = state.heads[index]
  const motion = state.motion[index]
  if (!head || !motion || rate <= 0) {
    return
  }
  scratch.direction.copy(target).sub(head.pivot).sub(motion.shift).normalize()
  scratch.aim.setFromUnitVectors(head.face, scratch.direction)
  const angle = 2 * Math.acos(Math.min(1, Math.abs(scratch.aim.w)))
  const share = angle > turn.maxAngle ? turn.maxAngle / angle : 1
  scratch.clamped.identity().slerp(scratch.aim, share)
  motion.turn.slerp(scratch.clamped, 1 - Math.exp(-rate))
}

function turnHeads(state: LivingState, frame: LivingFrame) {
  if (frame.isStill) {
    return
  }
  const isNear = frame.distance < livingTuning.watch.range
  const watchRate = lerp(turn.rate, turn.watchedRate, frame.watched)
  for (let index = 0; index < state.heads.length; index += 1) {
    if (index === state.reacher && frame.partner && state.feed > 0) {
      aimHead(state, index, frame.partner, turn.feedingRate * frame.delta)
    } else if (isNear) {
      aimHead(state, index, frame.camera, watchRate * frame.delta)
    }
  }
}

// The eater cranes toward its double and thrusts as it bites; the double is
// drawn in, and flinches when bitten.
function leanReacher(state: LivingState, frame: LivingFrame) {
  const index = state.reacher
  const head = state.heads[index]
  const motion = state.motion[index]
  const { desired, direction } = scratch
  desired.set(0, 0, 0)
  if (head && motion && frame.partner && !frame.isStill) {
    direction.copy(frame.partner).sub(head.center)
    const distance = direction.length()
    direction.normalize()
    if (state.role === "table-right") {
      const gap = Math.max(0, distance - head.size * 1.6 - 0.02)
      const thrust =
        smoothstep(0.55, feed.biteAt, motion.cycle) *
        (1 - smoothstep(feed.shutAt, 0.95, motion.cycle))
      desired.copy(direction).multiplyScalar(Math.min(feed.lean, gap))
      desired.addScaledVector(direction, feed.thrust * thrust)
    } else {
      const flinch = Math.max(0, motion.flinch) / feed.flinch
      desired
        .copy(direction)
        .multiplyScalar(Math.min(feed.pull, distance * 0.3))
      desired.addScaledVector(direction, -0.035 * flinch)
    }
    desired.multiplyScalar(state.feed)
  }
  const ease = 1 - Math.exp(-4 * frame.delta)
  for (let other = 0; other < state.motion.length; other += 1) {
    state.motion[other]?.shift.lerp(
      other === index ? desired : scratch.rest,
      ease
    )
  }
}

// The head of this one that reaches for its double: the nearest, not glass.
export function pickReacher(state: LivingState, partner: Vector3) {
  let best = -1
  let bestScore = Number.POSITIVE_INFINITY
  for (const [index, head] of state.heads.entries()) {
    const score = head.center.distanceTo(partner) * mouthPreference[head.kind]
    if (score < bestScore) {
      best = index
      bestScore = score
    }
  }
  return best
}

export function advanceLiving(state: LivingState, frame: LivingFrame) {
  state.events.bite = false
  state.events.snap = null
  advanceBloom(state, frame)
  for (let index = 0; index < state.heads.length; index += 1) {
    shapeHead(state, frame, index)
  }
  turnHeads(state, frame)
  leanReacher(state, frame)
}

// The double lost a petal to the eater.
export function biteHead(state: LivingState, index: number) {
  const motion = state.motion[index]
  if (!motion) {
    return
  }
  motion.bitten = Math.min(1, motion.bitten + feed.bitePerBite)
  motion.flinch = feed.flinch
}

export function writeUniforms(state: LivingState) {
  const { livingTurn, livingPose, livingFold, livingTint } = state.uniforms
  const tintShare = state.isTable ? state.feed : 0
  for (let index = 0; index < state.motion.length; index += 1) {
    const motion = state.motion[index]
    if (!motion) {
      continue
    }
    const at = index * 4
    const tint = state.tints[index]
    livingTurn.value[at] = motion.turn.x
    livingTurn.value[at + 1] = motion.turn.y
    livingTurn.value[at + 2] = motion.turn.z
    livingTurn.value[at + 3] = motion.turn.w
    livingPose.value[at] = motion.shift.x
    livingPose.value[at + 1] = motion.shift.y
    livingPose.value[at + 2] = motion.shift.z
    livingPose.value[at + 3] = motion.size
    livingFold.value[at] = motion.fold
    livingTint.value[at] = tint?.r ?? 0
    livingTint.value[at + 1] = tint?.g ?? 0
    livingTint.value[at + 2] = tint?.b ?? 0
    livingTint.value[at + 3] = tintShare * motion.open
  }
}
