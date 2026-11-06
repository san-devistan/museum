import type { DoorKind } from "@/museum/gallery/_lib/manor-plan"
import { MathUtils } from "three"

// How a locked door opens once its lock is met, as a function of the
// seconds since then. Every value runs 0 to 1:
// - ribbon: the bow slides off and falls (ribbon doors);
// - seam: light shows round the leaf (the wallpaper door);
// - swing: the leaves turn on their hinges.
export type DoorPose = { ribbon: number; seam: number; swing: number }

type Stage = { delay: number; duration: number }

type DoorTimeline = {
  // A beat after the image wakes, so its veil lifts first.
  ribbon: Stage | null
  seam: Stage | null
  swing: Stage
  ease: (progress: number) => number
}

const easeOutCubic = (progress: number) => {
  const rest = 1 - progress
  return 1 - rest * rest * rest
}

const easeInOutCubic = (progress: number) => {
  if (progress < 0.5) {
    return 4 * progress * progress * progress
  }
  const rest = -2 * progress + 2
  return 1 - (rest * rest * rest) / 2
}

const timelines: Record<Exclude<DoorKind, "archway">, DoorTimeline> = {
  ribbon: {
    ribbon: { delay: 1.4, duration: 0.9 },
    seam: null,
    swing: { delay: 2, duration: 1.7 },
    ease: easeOutCubic,
  },
  panel: {
    ribbon: null,
    seam: null,
    swing: { delay: 1.6, duration: 2.2 },
    ease: easeInOutCubic,
  },
  wallpaper: {
    ribbon: null,
    seam: { delay: 1.4, duration: 1.8 },
    swing: { delay: 3.4, duration: 2.2 },
    ease: easeInOutCubic,
  },
}

// Under reduced motion the ribbon and the seam only fade, and the door is
// simply open afterwards, without a swing.
const stillTimelines: Record<Exclude<DoorKind, "archway">, DoorTimeline> = {
  ribbon: {
    ribbon: { delay: 1.4, duration: 0.6 },
    seam: null,
    swing: { delay: 2, duration: 0 },
    ease: easeOutCubic,
  },
  panel: {
    ribbon: null,
    seam: null,
    swing: { delay: 1.6, duration: 0 },
    ease: easeOutCubic,
  },
  wallpaper: {
    ribbon: null,
    seam: { delay: 1.4, duration: 0.8 },
    swing: { delay: 2.4, duration: 0 },
    ease: easeOutCubic,
  },
}

function stage(elapsed: number, timing: Stage | null) {
  if (!timing) {
    return 0
  }
  if (timing.duration <= 0) {
    return elapsed >= timing.delay ? 1 : 0
  }
  return MathUtils.clamp((elapsed - timing.delay) / timing.duration, 0, 1)
}

export function doorPose(
  kind: DoorKind,
  elapsed: number,
  isStill: boolean,
  pose: DoorPose
) {
  if (kind === "archway") {
    pose.ribbon = 1
    pose.seam = 0
    pose.swing = 1
    return pose
  }
  const timeline = (isStill ? stillTimelines : timelines)[kind]
  pose.ribbon = stage(elapsed, timeline.ribbon)
  pose.swing = timeline.ease(stage(elapsed, timeline.swing))
  // The light fades again as the door opens on the lit room behind it.
  pose.seam = stage(elapsed, timeline.seam) * (1 - pose.swing)
  return pose
}

// Seconds from the lock opening to the door at rest, open.
export function doorOpeningLength(kind: DoorKind) {
  if (kind === "archway") {
    return 0
  }
  const { swing } = timelines[kind]
  return swing.delay + swing.duration
}

// When the swing starts: the creak, and the rooms behind start to draw.
export function swingStart(kind: DoorKind, isStill: boolean) {
  if (kind === "archway") {
    return 0
  }
  return (isStill ? stillTimelines : timelines)[kind].swing.delay
}
