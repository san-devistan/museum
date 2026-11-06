import {
  crossfade,
  droneWhileOpen,
  exteriorBleed,
  narrationDuck,
  soundVolume,
} from "@/museum/ambience/_lib/ambience-tuning"
import { MathUtils } from "three"

/**
 * Smoothed mix drivers. `inside` follows the camera through the doorway,
 * `shut` snaps with the door slam, `duck` dips under the narrator.
 */
export type BedMix = { inside: number; shut: number; duck: number }

export type BedInput = {
  cameraZ: number
  isDoorShut: boolean
  isNarrating: boolean
  delta: number
}

export type BedLevels = {
  exterior: number
  exteriorCutoff: number
  drone: number
  neon: number
  outside: number
}

export function createBedMix(): BedMix {
  return { inside: 0, shut: 0, duck: 1 }
}

function settle(current: number, target: number, seconds: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-dt / seconds))
}

function walkedIn(cameraZ: number) {
  return MathUtils.smoothstep(
    crossfade.outsideZ - cameraZ,
    0,
    crossfade.outsideZ - crossfade.insideZ
  )
}

export function advanceBedMix(mix: BedMix, input: BedInput) {
  const inside = input.isDoorShut ? 1 : walkedIn(input.cameraZ)
  mix.inside = settle(mix.inside, inside, crossfade.settle, input.delta)
  mix.shut = settle(
    mix.shut,
    input.isDoorShut ? 1 : 0,
    exteriorBleed.settle,
    input.delta
  )
  mix.duck = settle(
    mix.duck,
    input.isNarrating ? narrationDuck.level : 1,
    narrationDuck.settle,
    input.delta
  )
}

function logLerp(from: number, to: number, amount: number) {
  return from * (to / from) ** amount
}

export function bedLevels({ inside, shut, duck }: BedMix): BedLevels {
  const { open, shut: closed } = exteriorBleed
  const bleed = MathUtils.lerp(open.level, closed.level, shut)
  const bleedCutoff = logLerp(open.cutoff, closed.cutoff, shut)
  const outside = 1 - inside
  return {
    exterior:
      soundVolume.exteriorNight *
      MathUtils.lerp(1, bleed, inside) *
      MathUtils.lerp(1, duck, inside),
    exteriorCutoff: logLerp(exteriorBleed.outsideCutoff, bleedCutoff, inside),
    drone:
      soundVolume.galleryDrone *
      Math.sin((inside * Math.PI) / 2) *
      MathUtils.lerp(droneWhileOpen, 1, shut) *
      duck,
    neon: soundVolume.neonBuzz * outside * outside,
    outside,
  }
}
