export type NarrationCue = {
  start: number
  end: number
  text: string
}

export type NarrationTrack = {
  src: string
  cues: readonly NarrationCue[]
}

// Whispers (the ikebanas) play quieter and closer, with smaller captions.
export type VoiceTone = "voice" | "whisper"

// A story line. Until its MP3 is recorded (`src` is null), its text plays as
// captions alone, paced like speech.
export type LineTrack = {
  src: string | null
  cues: readonly NarrationCue[]
  tone: VoiceTone
}

const captionLinger = 0.6

export function cueIndexAt(cues: readonly NarrationCue[], time: number) {
  for (let index = cues.length - 1; index >= 0; index -= 1) {
    const cue = cues[index]
    if (cue.start <= time) {
      return time <= cue.end + captionLinger ? index : -1
    }
  }
  return -1
}
