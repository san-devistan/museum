import { MathUtils } from "three"

const maxFrameDelta = 1 / 20

export const openingTiming = {
  ribbonDuration: 0.9,
  doorDelay: 0.6,
  doorDuration: 1.5,
  cameraDelay: 1.05,
  // The walk from the start camera, about 6 m to the hall.
  cameraDuration: 2.6,
}

export const reducedOpeningTiming = {
  ribbonDuration: 0.3,
  doorDelay: 0.2,
  doorDuration: 0.5,
  cameraDelay: 0.35,
  cameraDuration: 1.1,
}

export type OpeningTiming = typeof openingTiming

export const doorSlamTiming = {
  delay: 1.5,
  swing: 0.25,
  settle: 0.45,
  reopen: 1,
  // Ending B: the doors close by themselves, slowly, without a slam.
  softClose: 3.4,
}

export const slamDuration = doorSlamTiming.swing + doorSlamTiming.settle

const slamRebound = { height: 0.1, bounces: 2 }

export type LeavingTiming = {
  cameraDelay: number
  cameraDuration: number
  doorDelay: number
  doorDuration: number
  ribbonDelay: number
  ribbonDuration: number
}

export type LeavingProgress = {
  walk: number
  turn: number
  door: number
  ribbon: number
}

function easeInOutCubic(progress: number) {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
}

function easeInCubic(progress: number) {
  return progress ** 3
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3
}

function easeOutQuad(progress: number) {
  return 1 - (1 - progress) ** 2
}

function stageProgress(elapsed: number, delay: number, duration: number) {
  return MathUtils.clamp((elapsed - delay) / duration, 0, 1)
}

export function ribbonProgress(elapsed: number, timing: OpeningTiming) {
  return easeInOutCubic(stageProgress(elapsed, 0, timing.ribbonDuration))
}

export function doorProgress(elapsed: number, timing: OpeningTiming) {
  return easeOutCubic(
    stageProgress(elapsed, timing.doorDelay, timing.doorDuration)
  )
}

export function cameraProgress(elapsed: number, timing: OpeningTiming) {
  return easeInOutCubic(
    stageProgress(elapsed, timing.cameraDelay, timing.cameraDuration)
  )
}

export function openingDuration(timing: OpeningTiming) {
  return Math.max(
    timing.doorDelay + timing.doorDuration,
    timing.cameraDelay + timing.cameraDuration
  )
}

function mirrorTiming(timing: OpeningTiming): LeavingTiming {
  const total = openingDuration(timing)
  const mirroredDelay = (delay: number, duration: number) =>
    total - delay - duration

  return {
    cameraDelay: mirroredDelay(timing.cameraDelay, timing.cameraDuration),
    cameraDuration: timing.cameraDuration,
    doorDelay: mirroredDelay(timing.doorDelay, timing.doorDuration),
    doorDuration: timing.doorDuration,
    ribbonDelay: mirroredDelay(0, timing.ribbonDuration),
    ribbonDuration: timing.ribbonDuration,
  }
}

export const leavingTiming = mirrorTiming(openingTiming)

export const reducedLeavingTiming = mirrorTiming(reducedOpeningTiming)

export function leavingProgress(
  elapsed: number,
  timing: LeavingTiming
): LeavingProgress {
  const camera = stageProgress(
    elapsed,
    timing.cameraDelay,
    timing.cameraDuration
  )
  const door = stageProgress(elapsed, timing.doorDelay, timing.doorDuration)
  const ribbon = stageProgress(
    elapsed,
    timing.ribbonDelay,
    timing.ribbonDuration
  )

  return {
    walk: easeOutQuad(camera),
    turn: easeInOutCubic(camera),
    door: 1 - easeInOutCubic(door),
    ribbon: 1 - easeInOutCubic(ribbon),
  }
}

export function leavingDuration(timing: LeavingTiming) {
  return Math.max(
    timing.cameraDelay + timing.cameraDuration,
    timing.doorDelay + timing.doorDuration,
    timing.ribbonDelay + timing.ribbonDuration
  )
}

/** Door angle while slamming: accelerating swing shut, then damped rebounds. */
export function slamDoorAngle(elapsed: number) {
  if (elapsed < doorSlamTiming.swing) {
    return 1 - easeInCubic(elapsed / doorSlamTiming.swing)
  }
  const settle = stageProgress(
    elapsed,
    doorSlamTiming.swing,
    doorSlamTiming.settle
  )
  const bounce = Math.abs(Math.sin(settle * Math.PI * slamRebound.bounces))
  return slamRebound.height * bounce * (1 - settle) ** 2
}

export function reopenDoorAngle(elapsed: number, from: number) {
  return MathUtils.lerp(
    from,
    1,
    easeInOutCubic(stageProgress(elapsed, 0, doorSlamTiming.reopen))
  )
}

export function closeDoorAngle(elapsed: number, from: number) {
  return MathUtils.lerp(
    from,
    0,
    easeInOutCubic(stageProgress(elapsed, 0, doorSlamTiming.softClose))
  )
}

export function frameDelta(delta: number) {
  return MathUtils.clamp(delta, 0, maxFrameDelta)
}
