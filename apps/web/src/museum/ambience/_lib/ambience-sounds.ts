import carpetStep1 from "@/museum/ambience/sounds/carpet-step-1.mp3"
import carpetStep2 from "@/museum/ambience/sounds/carpet-step-2.mp3"
import carpetStep3 from "@/museum/ambience/sounds/carpet-step-3.mp3"
import chandelierTinkle from "@/museum/ambience/sounds/chandelier-tinkle.mp3"
import exteriorNight from "@/museum/ambience/sounds/exterior-night.mp3"
import galleryDrone from "@/museum/ambience/sounds/gallery-drone.mp3"
import neonBuzz from "@/museum/ambience/sounds/neon-buzz.mp3"
import neonCrackle from "@/museum/ambience/sounds/neon-crackle.mp3"
import whisper from "@/museum/ambience/sounds/whisper.mp3"
import woodCreak from "@/museum/ambience/sounds/wood-creak.mp3"

// Generated with `pnpm sound-effects <file>` (scripts/sound-effects).
export const soundUrls = {
  exteriorNight,
  neonBuzz,
  neonCrackle,
  galleryDrone,
  carpetStep1,
  carpetStep2,
  carpetStep3,
  chandelierTinkle,
  woodCreak,
  whisper,
} as const

export type SoundName = keyof typeof soundUrls

function isSoundName(key: string): key is SoundName {
  return key in soundUrls
}

export const soundNames = Object.keys(soundUrls).filter(isSoundName)

export const carpetSteps = [
  "carpetStep1",
  "carpetStep2",
  "carpetStep3",
] as const satisfies readonly SoundName[]
