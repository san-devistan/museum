import { clamp } from "@/museum/player/_lib/clamp"

export type LookAngles = {
  yaw: number
  pitch: number
}

export const lookTuning = {
  sensitivity: 0.0022,
  maxPitch: (85 * Math.PI) / 180,
  maxEventDelta: 300,
  /** How fast the view catches the mouse, 1/s: ~45 ms of weight. */
  follow: 22,
} as const

export function clampPitch(pitch: number) {
  return clamp(pitch, -lookTuning.maxPitch, lookTuning.maxPitch)
}

/** Turns where the mouse points; the view eases after it in `followLook`. */
export function applyLookDelta(
  look: LookAngles,
  movementX: number,
  movementY: number
) {
  const limit = lookTuning.maxEventDelta
  const deltaX = clamp(movementX, -limit, limit)
  const deltaY = clamp(movementY, -limit, limit)

  look.yaw -= deltaX * lookTuning.sensitivity
  look.pitch = clampPitch(look.pitch - deltaY * lookTuning.sensitivity)
}

export function followLook(view: LookAngles, look: LookAngles, delta: number) {
  const kept = Math.exp(-lookTuning.follow * delta)
  view.yaw = look.yaw + (view.yaw - look.yaw) * kept
  view.pitch = look.pitch + (view.pitch - look.pitch) * kept
}
