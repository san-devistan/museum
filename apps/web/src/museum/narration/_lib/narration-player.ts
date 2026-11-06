import {
  cueIndexAt,
  type NarrationCue,
} from "@/museum/narration/_lib/narration-cues"
import { softenVoice } from "@/museum/narration/_lib/shared-audio-context"

type NarrationPlayerOptions = {
  src: string
  cues: readonly NarrationCue[]
  // Loudness once faded in, from 0 to 1.
  volume?: number
  soften?: boolean
  // Seconds before the first words, once it may speak.
  firstDelay?: number
  onCue: (index: number) => void
  onEnd?: () => void
}

export type NarrationPlayer = {
  sync: (shouldSpeak: boolean) => void
  hasEnded: () => boolean
  // Fades out quickly and lets go for good, without ever ending: for a line
  // dropped from the queue while it plays.
  cutOff: () => void
  dispose: () => void
}

export const voiceTiming = {
  firstLine: 1,
  resume: 0.8,
  resumeLead: 0.35,
  // A first start only smooths the click, so its first words are heard.
  firstFadeIn: 0.15,
  fadeIn: 1.2,
  fadeOut: 1.2,
  cutOff: 1,
}

function easeInOut(progress: number) {
  return progress * progress * (3 - 2 * progress)
}

export function createNarrationPlayer({
  src,
  cues,
  volume = 1,
  soften = false,
  firstDelay = voiceTiming.firstLine,
  onCue,
  onEnd,
}: NarrationPlayerOptions): NarrationPlayer {
  const audio = new Audio(src)
  audio.preload = "auto"
  let isWanted = false
  let hasStarted = false
  let stoppedAt: number | null = null
  let fadeFrame: number | null = null
  let resumeTimer: number | null = null
  let releaseSoftening: (() => void) | null = null

  function cancelFade() {
    if (fadeFrame !== null) {
      cancelAnimationFrame(fadeFrame)
      fadeFrame = null
    }
  }

  function cancelResume() {
    if (resumeTimer !== null) {
      window.clearTimeout(resumeTimer)
      resumeTimer = null
    }
  }

  function fadeTo(target: number, seconds: number, onDone?: () => void) {
    cancelFade()
    const from = audio.volume
    const startedAt = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / (seconds * 1000))
      audio.volume = from + (target - from) * easeInOut(progress)
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step)
        return
      }
      fadeFrame = null
      onDone?.()
    }
    fadeFrame = requestAnimationFrame(step)
  }

  async function speak() {
    resumeTimer = null
    if (!isWanted || audio.ended) {
      return
    }
    if (!audio.paused) {
      stoppedAt = null
      fadeTo(volume, voiceTiming.fadeIn)
      return
    }
    const isResuming = stoppedAt !== null
    if (stoppedAt !== null) {
      audio.currentTime = Math.max(0, stoppedAt - voiceTiming.resumeLead)
      stoppedAt = null
    }
    hasStarted = true
    if (soften) {
      releaseSoftening ??= softenVoice(audio)
    }
    cancelFade()
    audio.volume = 0
    try {
      await audio.play()
    } catch {
      return
    }
    // Hushed or cut off while it started: that fade has the last word.
    if (!isWanted) {
      return
    }
    fadeTo(volume, isResuming ? voiceTiming.fadeIn : voiceTiming.firstFadeIn)
  }

  function hush() {
    if (audio.paused) {
      return
    }
    stoppedAt ??= audio.currentTime
    fadeTo(0, voiceTiming.fadeOut, () => {
      audio.pause()
    })
  }

  function sync(shouldSpeak: boolean) {
    if (shouldSpeak === isWanted) {
      return
    }
    isWanted = shouldSpeak
    cancelResume()
    if (shouldSpeak) {
      const delay = hasStarted ? voiceTiming.resume : firstDelay
      resumeTimer = window.setTimeout(() => {
        void speak()
      }, delay * 1000)
    } else {
      hush()
    }
  }

  const handleTime = () => {
    onCue(audio.paused ? -1 : cueIndexAt(cues, audio.currentTime))
  }
  const handleEnd = () => {
    handleTime()
    onEnd?.()
  }
  audio.addEventListener("timeupdate", handleTime)
  audio.addEventListener("pause", handleTime)
  audio.addEventListener("ended", handleEnd)

  function dispose() {
    cancelResume()
    cancelFade()
    audio.removeEventListener("timeupdate", handleTime)
    audio.removeEventListener("pause", handleTime)
    audio.removeEventListener("ended", handleEnd)
    audio.pause()
    audio.removeAttribute("src")
    audio.load()
    releaseSoftening?.()
    releaseSoftening = null
  }

  function cutOff() {
    isWanted = false
    cancelResume()
    audio.removeEventListener("ended", handleEnd)
    if (audio.paused) {
      dispose()
      return
    }
    fadeTo(0, voiceTiming.cutOff, dispose)
  }

  return {
    sync,
    hasEnded: () => audio.ended,
    cutOff,
    dispose,
  }
}
