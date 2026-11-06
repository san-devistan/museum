import type { Vec3 } from "@/museum/_lib/museum-layout"
import { entranceSign } from "@/museum/entrance/_lib/entrance-layout"
import {
  chandelierSpots,
  manorFootprint,
} from "@/museum/gallery/_lib/manor-plan"

export type Range = readonly [min: number, max: number]

/**
 * Master volume per sound (linear gain), the one place to balance the mix.
 * Beds stay low so the narrator's voice keeps the foreground.
 */
export const soundVolume = {
  exteriorNight: 0.8,
  neonBuzz: 1,
  neonCrackle: 0.45,
  galleryDrone: 0.55,
  carpetStep: 0.5,
  chandelierTinkle: 0.9,
  woodCreak: 0.6,
  whisper: 0.55,
} as const

/** Overall level, faded in on the first gesture and out when the tab hides. */
export const masterFade = { level: 1, fadeIn: 0.6, hide: 0.05, show: 0.3 }

/** Delay before suspending the audio context once the tab is hidden. */
export const suspendDelayMs = 250

/** Camera z where the mix is fully exterior or fully interior. */
export const crossfade = { outsideZ: 1.2, insideZ: -1.5, settle: 0.35 }

/** Exterior heard from inside: level and low-pass with doors open or shut. */
export const exteriorBleed = {
  open: { level: 0.35, cutoff: 2000 },
  shut: { level: 0.07, cutoff: 380 },
  outsideCutoff: 18_000,
  settle: 0.08,
}

/** Room tone holds back while the doors are still open. */
export const droneWhileOpen = 0.7

/** Beds dip while the narrator speaks. */
export const narrationDuck = { level: 0.65, settle: 0.8 }

/** Smallest change worth sending to an audio param. */
export const levelEpsilon = 0.001

export const neonEmitter = {
  position: entranceSign.center satisfies Vec3,
  refDistance: 2,
  rolloff: 1.2,
}

/** The crackle follows the sign's arcs; `level` spans a weak to a strong arc. */
export const neonCrackleTiming = {
  rate: [0.85, 1.2] satisfies Range,
  level: [0.4, 1] satisfies Range,
  audibleBelowInside: 0.6,
}

export const footstepTuning = {
  stride: 0.9,
  strideJitter: 0.06,
  maxCadence: 2.8,
  smoothing: 0.15,
  minSpeed: 0.55,
  teleport: 1.5,
  restartShare: 0.6,
  settleShare: 0.4,
  settleLevel: 0.55,
  rate: [0.88, 1.06] satisfies Range,
  level: [0.65, 1] satisfies Range,
  humanize: [0, 0.025] satisfies Range,
  onsetThreshold: 0.004,
  onsetLead: 0.008,
  voices: 4,
}

/** Edge trimming so mp3 encoder padding never gaps a loop. */
export const loopEdge = { threshold: 0.0003, maxTrim: 0.06 }

export const hauntTiming = {
  quietStart: [22, 34] satisfies Range,
  gap: [24, 55] satisfies Range,
  whisperCooldown: 140,
}

export const hauntWeights = {
  chandelier: 0.35,
  creak: 0.45,
  whisper: 0.2,
} as const

export type HauntKind = keyof typeof hauntWeights

const roomMargin = 0.6

// Anywhere in the manor: a sound behind you may come through a wall.
export const hauntBounds = {
  minX: manorFootprint.minX + roomMargin,
  maxX: manorFootprint.maxX - roomMargin,
  minZ: manorFootprint.minZ + roomMargin,
  maxZ: manorFootprint.maxZ - roomMargin - 0.3,
}

const [chandelierX, chandelierY, chandelierZ] = chandelierSpots[0]
  ?.position ?? [0, 4.5, -4]

// The Vestibule's big chandelier.
export const chandelierEmitter = {
  position: [chandelierX, chandelierY - 0.8, chandelierZ] satisfies Vec3,
  refDistance: 3,
  rolloff: 1,
  rate: [0.95, 1.08] satisfies Range,
}

/** Sounds placed behind the visitor: distance, height, and angle spread. */
export const behindEmitters = {
  creak: {
    distance: [5, 9] satisfies Range,
    height: [0.4, 3] satisfies Range,
    spread: 0.9,
    refDistance: 2,
    rolloff: 1,
    rate: [0.85, 1.1] satisfies Range,
  },
  whisper: {
    distance: [2.2, 3.6] satisfies Range,
    height: [1.5, 1.9] satisfies Range,
    spread: 0.6,
    refDistance: 1.5,
    rolloff: 1.2,
    rate: [0.92, 1.02] satisfies Range,
  },
}

export function randomIn([min, max]: Range) {
  return min + Math.random() * (max - min)
}
