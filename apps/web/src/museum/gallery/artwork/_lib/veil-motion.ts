import type { VeilUniforms } from "@/museum/gallery/artwork/_lib/veil-material"
import type { WakeState } from "@/museum/story/_lib/wake-order"
import { MathUtils } from "three"

// One frame of a work's veil: it falls once the work is awake and stays
// pooled on the floor, glows while the work is next (and dims as it falls),
// and stirs while the visitor looks at it.

// Seconds for the veil to fall and settle, and how fast the glow and the
// stir follow the work's state.
const fallDuration = 2.1
const glowDamping = 1.6
const stirDamping = 2.2

export type VeilStep = {
  state: WakeState
  isLookedAt: boolean
  isStill: boolean
  delta: number
}

// Where a fall stands (0 hanging, 1 pooled). Under reduced motion the veil
// fades out of the frame, then fades in pooled on the floor.
export function setVeilFall(
  uniforms: VeilUniforms,
  progress: number,
  isStill: boolean
) {
  if (isStill) {
    uniforms.fall.value = progress < 0.5 ? 0 : 1
    uniforms.fade.value = 1 - Math.abs(progress * 2 - 1)
    return
  }
  uniforms.fall.value = progress
  uniforms.fade.value = 0
}

// Returns how far the veil has fallen (0 hanging, 1 pooled) after this frame.
export function stepVeil(
  uniforms: VeilUniforms,
  progress: number,
  step: VeilStep
) {
  const dt = Math.min(step.delta, 0.1)
  const next =
    step.state === "awake" ? Math.min(1, progress + dt / fallDuration) : 0
  setVeilFall(uniforms, next, step.isStill)
  uniforms.glow.value = MathUtils.damp(
    uniforms.glow.value,
    step.state === "next" ? 1 : 0,
    glowDamping,
    dt
  )
  uniforms.stir.value = MathUtils.damp(
    uniforms.stir.value,
    step.isLookedAt && step.state === "next" && !step.isStill ? 1 : 0,
    stirDamping,
    dt
  )
  return next
}
