import type {
  LineTrack,
  NarrationTrack,
} from "@/museum/narration/_lib/narration-cues"
import type { NarrationPlayer } from "@/museum/narration/_lib/narration-player"
import type {
  CaptionPlacement,
  NarrationLine,
} from "@/museum/narration/_lib/narration-store"
import { createTrackPlayer } from "@/museum/narration/_lib/track-player"

// The head of the story's line queue. `serial` counts the lines spoken before
// it, so each queued line is told apart even when the same id comes twice.
export type QueuedLine = {
  id: string
  serial: number
}

export type NarrationScene = {
  // Exploring the gallery: the intro and the works may speak.
  isListening: boolean
  // Story lines may also speak outside, as the visitor walks out.
  canSpeakLines: boolean
  photographId: string | null
  line: QueuedLine | null
  isIntroDone: boolean
}

type NarrationDirectorOptions = {
  intro: NarrationTrack
  workTrack: (workId: string) => NarrationTrack | null
  lineTrack: (lineId: string) => LineTrack | null
  shouldPreloadIntro: boolean
  onLine: (line: NarrationLine | null) => void
  onIntroEnd: () => void
  onLineEnd: () => void
}

export type NarrationDirector = {
  sync: (scene: NarrationScene) => void
  dispose: () => void
}

type Voice = {
  key: string
  track: LineTrack
  placement: CaptionPlacement
  // Set for story lines, which play once and are then dropped.
  lineSerial: number | null
}

const introKey = "intro"
const linePrefix = "line:"

function lineKey(serial: number) {
  return `${linePrefix}${serial}`
}

const silentScene: NarrationScene = {
  isListening: false,
  canSpeakLines: false,
  photographId: null,
  line: null,
  isIntroDone: false,
}

// One voice at a time. A photograph in view speaks first; a story line waits
// for it to finish or pause, then speaks once; the intro fills the silence
// until it ends. The intro and the works keep their place when cut off, so
// they resume where they stopped and never replay once finished. A line that
// has started is short, so it finishes before anything else speaks, unless
// the story drops it from its queue (the goodbye after midnight cuts in):
// then it fades out quickly and the next line speaks. The ikebanas' whispers
// are not voices here: they breathe over all of this on their own channel.
export function createNarrationDirector({
  intro,
  workTrack,
  lineTrack,
  shouldPreloadIntro,
  onLine,
  onIntroEnd,
  onLineEnd,
}: NarrationDirectorOptions): NarrationDirector {
  const players = new Map<string, NarrationPlayer>()
  let activeKey: string | null = null
  let scene = silentScene
  let lastLineSerial = -1

  const introVoice: Voice = {
    key: introKey,
    track: { ...intro, tone: "voice" },
    placement: "center",
    lineSerial: null,
  }

  function workVoice(workId: string): Voice | null {
    const track = workTrack(workId)
    return track
      ? {
          // Keyed by recording: works that share one (Fashion Chaos I and
          // II) share its place, so it never plays twice in a row.
          key: `work:${track.src}`,
          track: { ...track, tone: "voice" },
          placement: "beside-card",
          lineSerial: null,
        }
      : null
  }

  function lineVoice(line: QueuedLine | null): Voice | null {
    if (!line || line.serial <= lastLineSerial) {
      return null
    }
    const track = lineTrack(line.id)
    return track
      ? {
          key: lineKey(line.serial),
          track,
          placement: "center",
          lineSerial: line.serial,
        }
      : null
  }

  function isFinished(key: string) {
    return players.get(key)?.hasEnded() ?? false
  }

  function choose(): Voice | null {
    const line = scene.canSpeakLines ? lineVoice(scene.line) : null
    if (line?.key === activeKey || !scene.isListening) {
      return line
    }
    if (scene.photographId !== null) {
      const work = workVoice(scene.photographId)
      return work && !isFinished(work.key) ? work : line
    }
    if (line) {
      return line
    }
    return scene.isIntroDone || isFinished(introKey) ? null : introVoice
  }

  function apply(voice: Voice | null) {
    const key = voice?.key ?? null
    if (key === activeKey) {
      return
    }
    activeKey = key
    onLine(null)
    if (voice) {
      playerFor(voice)
    }
    for (const [playerKey, player] of players) {
      player.sync(playerKey === activeKey)
    }
  }

  function handleEnd(voice: Voice) {
    if (voice.lineSerial !== null) {
      lastLineSerial = Math.max(lastLineSerial, voice.lineSerial)
      players.get(voice.key)?.dispose()
      players.delete(voice.key)
      onLineEnd()
    } else if (voice.key === introKey) {
      onIntroEnd()
    }
    apply(choose())
  }

  function playerFor(voice: Voice) {
    const existing = players.get(voice.key)
    if (existing) {
      return existing
    }
    const { key, track, placement } = voice
    const onCue = (cueIndex: number) => {
      if (key === activeKey) {
        const cue = cueIndex >= 0 ? track.cues[cueIndex] : null
        onLine(
          cue ? { cueIndex, text: cue.text, placement, tone: track.tone } : null
        )
      }
    }
    const onEnd = () => {
      handleEnd(voice)
    }
    const player = createTrackPlayer(track, { onCue, onEnd })
    players.set(key, player)
    return player
  }

  // A line no longer at the head of the queue, yet not ended, was dropped
  // from it: it fades out for good.
  function cutOffDroppedLines() {
    const headKey = scene.line ? lineKey(scene.line.serial) : null
    for (const [key, player] of players) {
      if (key.startsWith(linePrefix) && key !== headKey) {
        player.cutOff()
        players.delete(key)
        if (key === activeKey) {
          activeKey = null
          onLine(null)
        }
      }
    }
  }

  // A queued line with nothing to play (no text, no audio) must not hold up
  // the lines behind it.
  function skipSilentLine() {
    const { line } = scene
    if (line && line.serial > lastLineSerial && !lineTrack(line.id)) {
      lastLineSerial = line.serial
      onLineEnd()
    }
  }

  if (shouldPreloadIntro) {
    playerFor(introVoice)
  }

  return {
    sync: (next) => {
      scene = next
      skipSilentLine()
      cutOffDroppedLines()
      apply(choose())
    },
    dispose: () => {
      for (const player of players.values()) {
        player.dispose()
      }
      players.clear()
      activeKey = null
      onLine(null)
    },
  }
}
