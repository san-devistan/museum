import type { LivingHeadKind } from "@/museum/gallery/ikebana/_lib/living-geometry"

// Distances in metres, angles in radians, times in seconds.
export const livingTuning = {
  bud: {
    // Share of the open petal angle a closed bud keeps, and its size.
    fold: 0.2,
    size: 0.8,
    // A slow breath: about one every 7 s.
    breathRate: 0.9,
    breathFold: 0.04,
    breathSize: 0.035,
  },
  watch: {
    // Off-centre angle under which the visitor is looking at it, and over
    // which they are not.
    lookedAt: 0.42,
    lookedAway: 0.72,
    // Heads only follow a visitor this close.
    range: 9,
    // Height of the arrangement's middle above its base.
    middle: 0.55,
  },
  turn: {
    maxAngle: 0.85,
    // Per second, eased: unwatched, watched ("almost" still) and feeding.
    rate: 0.45,
    watchedRate: 0.01,
    feedingRate: 1.4,
  },
  bloom: {
    seconds: 3.5,
    stillSeconds: 6,
    // Heads open one after another over this share of the bloom.
    stagger: 0.4,
  },
  whisper: { distance: 2.2 },
  snap: {
    // The bud parts its lips as the visitor comes from `lure` to `distance`.
    lure: 1.9,
    distance: 0.9,
    lureFold: 0.5,
    lureRate: 1.4,
    // It swells and cranes toward the visitor while it waits.
    lureSwell: 1,
    lureLean: 0.14,
    flare: 0.07,
    shut: 0.13,
    // Fold when shut tight, past a bud.
    bite: 0.03,
    lunge: 0.16,
    stillClose: 0.9,
    end: 2.2,
    // Camera trauma: felt as trauma², so 0.5 is a small jolt.
    jolt: 0.5,
  },
  feed: {
    // A slow mouth: opens over most of the cycle, snaps shut, rests.
    minPeriod: 3.2,
    maxPeriod: 5.2,
    openUntil: 0.68,
    shutAt: 0.76,
    biteAt: 0.74,
    shutFold: 0.42,
    wideFold: 1.12,
    // The eater cranes its neck toward its double.
    lean: 0.27,
    thrust: 0.04,
    // The double is drawn in a little.
    pull: 0.07,
    // Heads closer than their sizes plus this can bite.
    reach: 0.09,
    bitePerBite: 0.07,
    eatenSize: 0.3,
    flinch: 0.5,
  },
} as const

// The dining table leaves about 0.2 m around each centrepiece, so the table
// pair stands at three-quarter size (vessel and flowers within that radius).
export const tableScale = 0.75

// Pop colours from Cannibal flowers: saturated pink lilies, yellow blooms.
export const feedingColors = {
  pink: "#ff2f8c",
  candy: "#ff86bd",
  yellow: "#ffd21a",
  pollen: "#ffe45c",
} as const

const kindColors: Record<LivingHeadKind, readonly string[]> = {
  calla: [feedingColors.pink],
  spathe: [feedingColors.pink],
  crystal: [feedingColors.candy],
  bloom: [feedingColors.yellow],
  allium: [feedingColors.pink, feedingColors.yellow],
}

export function feedingColor(kind: LivingHeadKind, index: number) {
  const colors = kindColors[kind]
  return colors[index % colors.length] ?? feedingColors.pink
}

// Which head becomes a mouth (lower is likelier): callas and blooms close
// like lips, glass hardly.
export const mouthPreference: Record<LivingHeadKind, number> = {
  calla: 0.7,
  bloom: 0.75,
  allium: 1.2,
  spathe: 1.3,
  crystal: 3,
}
