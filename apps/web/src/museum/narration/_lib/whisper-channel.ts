import type { LineTrack } from "@/museum/narration/_lib/narration-cues"
import type { QueuedLine } from "@/museum/narration/_lib/narration-director"
import type { NarrationPlayer } from "@/museum/narration/_lib/narration-player"
import type { WhisperCaption } from "@/museum/narration/_lib/narration-store"
import { createTrackPlayer } from "@/museum/narration/_lib/track-player"

export type WhisperScene = {
  // Whispers speak whenever story lines may: paused with everything else.
  canSpeak: boolean
  // The head of the story's whisper queue, told apart like a story line.
  whisper: QueuedLine | null
}

type WhisperChannelOptions = {
  lineTrack: (lineId: string) => LineTrack | null
  onCaption: (caption: WhisperCaption | null) => void
  onWhisperEnd: () => void
}

export type WhisperChannel = {
  sync: (scene: WhisperScene) => void
  dispose: () => void
}

type Breath = {
  serial: number
  player: NarrationPlayer
}

// Breathed close to the visitor as they pass, not held back for the voice.
const firstDelay = 0.2

// The ikebanas' whispers play on their own, layered over whatever the main
// voice says (the intro, a work, a story line), so they never pause, delay or
// wait for it. One whisper at a time: the next waits for the one still
// breathing. A whisper dropped from its queue (a reset visit) fades out.
export function createWhisperChannel({
  lineTrack,
  onCaption,
  onWhisperEnd,
}: WhisperChannelOptions): WhisperChannel {
  let breath: Breath | null = null
  let lastSerial = -1

  function fadeOutDropped() {
    if (breath) {
      breath.player.cutOff()
      breath = null
      onCaption(null)
    }
  }

  function finish(serial: number) {
    lastSerial = Math.max(lastSerial, serial)
    if (breath?.serial === serial) {
      breath.player.dispose()
      breath = null
    }
    onWhisperEnd()
  }

  function breathe(whisper: QueuedLine): Breath | null {
    const { serial } = whisper
    const track = lineTrack(whisper.id)
    // Nothing to play: it must not hold up the whispers behind it.
    if (!track) {
      finish(serial)
      return null
    }
    const player = createTrackPlayer(
      { ...track, tone: "whisper" },
      {
        firstDelay,
        onCue: (cueIndex) => {
          if (breath?.serial !== serial) {
            return
          }
          const cue = cueIndex >= 0 ? track.cues[cueIndex] : null
          onCaption(cue ? { cueIndex, text: cue.text } : null)
        },
        onEnd: () => {
          finish(serial)
        },
      }
    )
    return { serial, player }
  }

  return {
    sync: ({ canSpeak, whisper }) => {
      if (breath && breath.serial !== whisper?.serial) {
        fadeOutDropped()
      }
      if (!breath && whisper && whisper.serial > lastSerial) {
        breath = breathe(whisper)
      }
      breath?.player.sync(canSpeak)
    },
    dispose: () => {
      breath?.player.dispose()
      breath = null
      onCaption(null)
    },
  }
}
