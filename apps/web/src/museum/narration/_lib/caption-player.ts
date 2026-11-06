import {
  cueIndexAt,
  type NarrationCue,
} from "@/museum/narration/_lib/narration-cues"
import {
  voiceTiming,
  type NarrationPlayer,
} from "@/museum/narration/_lib/narration-player"

type CaptionPlayerOptions = {
  cues: readonly NarrationCue[]
  // Seconds before the first caption, once it may speak.
  firstDelay?: number
  onCue: (index: number) => void
  onEnd: () => void
}

const tickMs = 100

// Plays a line that has no recording yet: its captions run on a clock that
// pauses and resumes exactly like the voice would, so the story can be played
// before the audio exists.
export function createCaptionPlayer({
  cues,
  firstDelay = voiceTiming.firstLine,
  onCue,
  onEnd,
}: CaptionPlayerOptions): NarrationPlayer {
  const duration = cues.at(-1)?.end ?? 0
  let isWanted = false
  let hasStarted = false
  let hasEnded = false
  let position = 0
  let runningSince: number | null = null
  let startTimer: number | null = null
  let tickTimer: number | null = null

  function elapsed() {
    return runningSince === null
      ? position
      : position + (performance.now() - runningSince) / 1000
  }

  function clearTimers() {
    if (startTimer !== null) {
      window.clearTimeout(startTimer)
      startTimer = null
    }
    if (tickTimer !== null) {
      window.clearTimeout(tickTimer)
      tickTimer = null
    }
  }

  function finish() {
    hasEnded = true
    runningSince = null
    clearTimers()
    onCue(-1)
    onEnd()
  }

  function tick() {
    tickTimer = null
    const time = elapsed()
    if (time >= duration) {
      finish()
      return
    }
    onCue(cueIndexAt(cues, time))
    tickTimer = window.setTimeout(tick, tickMs)
  }

  function speak() {
    startTimer = null
    if (!isWanted || hasEnded) {
      return
    }
    if (hasStarted) {
      position = Math.max(0, position - voiceTiming.resumeLead)
    }
    hasStarted = true
    runningSince = performance.now()
    tick()
  }

  function hush() {
    position = elapsed()
    runningSince = null
    clearTimers()
    onCue(-1)
  }

  function sync(shouldSpeak: boolean) {
    if (shouldSpeak === isWanted || hasEnded) {
      return
    }
    isWanted = shouldSpeak
    if (!shouldSpeak) {
      hush()
      return
    }
    clearTimers()
    const delay = hasStarted ? voiceTiming.resume : firstDelay
    startTimer = window.setTimeout(speak, delay * 1000)
  }

  function dispose() {
    clearTimers()
    runningSince = null
  }

  return {
    sync,
    hasEnded: () => hasEnded,
    // Silent already: dropping it is enough.
    cutOff: dispose,
    dispose,
  }
}
