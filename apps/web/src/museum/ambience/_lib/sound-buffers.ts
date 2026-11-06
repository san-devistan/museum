import {
  soundNames,
  soundUrls,
  type SoundName,
} from "@/museum/ambience/_lib/ambience-sounds"
import { AudioLoader } from "three"

export type AudibleSpan = { start: number; end: number }

type SpanOptions = { threshold: number; maxTrim: number }

/**
 * Loads every ambience sound. A file that fails is reported and skipped, so
 * the rest of the mix still plays.
 */
export function loadSounds(
  onLoad: (name: SoundName, buffer: AudioBuffer) => void
) {
  const loader = new AudioLoader()
  for (const name of soundNames) {
    loader.load(
      soundUrls[name],
      (buffer) => {
        onLoad(name, buffer)
      },
      undefined,
      (error) => {
        console.warn(`Ambience: could not load ${name}`, error)
      }
    )
  }
}

function isLoud(buffer: AudioBuffer, index: number, threshold: number) {
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    if (Math.abs(buffer.getChannelData(channel)[index] ?? 0) > threshold) {
      return true
    }
  }
  return false
}

/** Seconds where the sound actually starts and ends, ignoring silent edges. */
export function audibleSpan(
  buffer: AudioBuffer,
  { threshold, maxTrim }: SpanOptions
): AudibleSpan {
  const limit = Math.min(
    Math.floor(maxTrim * buffer.sampleRate),
    Math.floor(buffer.length / 2)
  )
  let first = 0
  while (first < limit && !isLoud(buffer, first, threshold)) {
    first += 1
  }
  let last = buffer.length - 1
  while (buffer.length - 1 - last < limit && !isLoud(buffer, last, threshold)) {
    last -= 1
  }
  return {
    start: first / buffer.sampleRate,
    end: (last + 1) / buffer.sampleRate,
  }
}
