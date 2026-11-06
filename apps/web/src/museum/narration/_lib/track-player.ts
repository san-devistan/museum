import { createCaptionPlayer } from "@/museum/narration/_lib/caption-player"
import type { LineTrack } from "@/museum/narration/_lib/narration-cues"
import {
  createNarrationPlayer,
  type NarrationPlayer,
} from "@/museum/narration/_lib/narration-player"

type TrackPlayerOptions = {
  firstDelay?: number
  onCue: (index: number) => void
  onEnd: () => void
}

// A whisper sits under the main voice, which may speak at the same time: its
// recordings are already quieter, and it plays softer still.
const whisperVolume = 0.7

// A recorded track plays its voice; a line not recorded yet plays its
// captions alone. Whispers come out quieter, with their top end rolled off.
export function createTrackPlayer(
  track: LineTrack,
  { firstDelay, onCue, onEnd }: TrackPlayerOptions
): NarrationPlayer {
  const isWhisper = track.tone === "whisper"
  return track.src
    ? createNarrationPlayer({
        src: track.src,
        cues: track.cues,
        volume: isWhisper ? whisperVolume : 1,
        soften: isWhisper,
        firstDelay,
        onCue,
        onEnd,
      })
    : createCaptionPlayer({ cues: track.cues, firstDelay, onCue, onEnd })
}
