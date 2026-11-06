import doorCreakSound from "@/museum/entrance/door-creak.mp3"

// The front door's creak, for the manor's own doors as they swing: softer
// the further the visitor stands from them.
const reach = { full: 3, silent: 22, floor: 0.18, peak: 0.85 }

// Seconds of the creak that are heard; the file's tail is silence.
export const doorCreakLength = 1.9

let preloaded: HTMLAudioElement | null = null

export function preloadDoorCreak() {
  preloaded ??= new Audio(doorCreakSound)
  preloaded.preload = "auto"
}

export function playDoorCreak(distance: number) {
  const audio = new Audio(doorCreakSound)
  const fall = (distance - reach.full) / (reach.silent - reach.full)
  audio.volume =
    reach.peak * Math.min(1, Math.max(reach.floor, 1 - Math.max(0, fall)))
  // Refused before any click, or without sound: the door still swings.
  audio.play().catch(() => undefined)
}
