import { useMuseumStore } from "@/museum/_lib/museum-store"
import { doorCreakLength } from "@/museum/gallery/doors/_lib/door-creak"
import { swingStart } from "@/museum/gallery/doors/_lib/door-motion"
import { playClockChimes } from "@/museum/gallery/midnight/_lib/clock-chimes"
import {
  afterMidnightLight,
  aimMidnightLight,
  settleMidnightLight,
} from "@/museum/gallery/midnight/_lib/midnight-light"
import {
  setCurtain,
  useMidnightScene,
} from "@/museum/gallery/midnight/_lib/midnight-scene"
import { voiceTiming } from "@/museum/narration/_lib/narration-player"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import {
  musicBoxLastNote,
  playMusicBoxTune,
} from "@/museum/story/_lib/wake-chime"

// The two scripted moments of the end of the visit, in seconds from their
// start. Sounds are scheduled on the audio clock up front; the rest are cues.

const chimes = { count: 12, gap: 1.15 }

// The ribbon door opens on the strike and creaks as it starts to swing. The
// epilogue waits for the creak to die down so it never covers « Minuit »
// (a line speaks a moment after it is queued).
const creakQuiet = swingStart("ribbon", false) + doorCreakLength + 0.3

export const midnightTiming = (() => {
  const blackout = 2
  const lastChime = blackout + (chimes.count - 1) * chimes.gap
  const tune = lastChime + 1.4
  // The lights come back as the last note rings.
  const strike = tune + musicBoxLastNote + 0.3
  return {
    // The visitor has walked away from the last work for this long.
    walkAway: 1.5,
    blackout,
    tune,
    strike,
    epilogue: strike + creakQuiet - voiceTiming.firstLine,
    done: strike + 4.5,
  }
})()

const keepTiming = {
  dim: 0,
  // « Alors restez. » waits for the front doors' soft creak to pass.
  line: 1.2,
  fade: 4.8,
  outside: 7.6,
  reveal: 8.1,
  done: 10.6,
} as const

type Cue = { at: number; run: () => void }

const pending = new Set<number>()

function schedule(cues: readonly Cue[]) {
  for (const cue of cues) {
    const timer = window.setTimeout(() => {
      pending.delete(timer)
      cue.run()
    }, cue.at * 1000)
    pending.add(timer)
  }
}

export function cancelMidnightCues() {
  for (const timer of pending) {
    window.clearTimeout(timer)
  }
  pending.clear()
}

// Twelve images awake: the lights die, the house clock strikes twelve in the
// dark, the music box plays its tune through, and the lights come back in her
// whole palette. Under reduced motion every change is a slow fade.
export function strikeMidnight(isStill: boolean) {
  const scene = useMidnightScene.getState()
  const story = useStoryStore.getState()
  if (scene.isStriking || story.midnight) {
    return
  }
  useMidnightScene.setState({ isStriking: true })
  setCurtain("black", isStill ? "soft" : "cut")
  aimMidnightLight({ level: 0, exposure: 0 }, isStill ? 1.6 : 0.15)
  playClockChimes({
    delay: midnightTiming.blackout,
    gap: chimes.gap,
    count: chimes.count,
  })
  playMusicBoxTune(midnightTiming.tune)
  schedule([
    {
      // The curtain lifts on a room barely there: no light but the night's.
      at: midnightTiming.blackout,
      run: () => {
        aimMidnightLight({ exposure: 0.3 }, 2.5)
        setCurtain("dim", "slow")
      },
    },
    {
      at: midnightTiming.strike,
      run: () => {
        useStoryStore.getState().strikeMidnight()
        setCurtain("clear", isStill ? "slow" : "soft")
        aimMidnightLight(
          { ...afterMidnightLight, exposure: 1 },
          isStill ? 4.5 : 3
        )
      },
    },
    {
      at: midnightTiming.epilogue,
      run: () => {
        // A visitor who has already walked out hears the goodbye instead.
        const now = useStoryStore.getState()
        if (
          useMuseumStore.getState().phase === "gallery" &&
          now.ending === null
        ) {
          now.queueLine("epilogue")
        }
      },
    },
    {
      at: midnightTiming.done,
      run: () => {
        useMidnightScene.setState({ isStriking: false })
      },
    },
  ])
}

// Ending B: the house keeps the visitor. The card has already rewritten
// itself; the chandeliers dim, the front doors close softly (the entrance
// reads the ending), the screen fades to black and the visitor is outside.
export function keepVisitor(isStill: boolean) {
  const story = useStoryStore.getState()
  if (useMidnightScene.getState().isKeeping || story.ending !== null) {
    return
  }
  story.stay()
  useMidnightScene.setState({ isKeeping: true })
  aimMidnightLight({ chandelier: 0.2 }, isStill ? 4.5 : 3.5)
  schedule([
    {
      at: keepTiming.line,
      run: () => {
        useStoryStore.getState().queueLine("ending-stay")
      },
    },
    {
      at: keepTiming.fade,
      run: () => {
        setCurtain("black", "slow")
      },
    },
    {
      at: keepTiming.outside,
      run: () => {
        useMuseumStore.getState().leaveGallery()
        settleMidnightLight(useStoryStore.getState().midnight)
      },
    },
    {
      at: keepTiming.reveal,
      run: () => {
        setCurtain("clear", "slow")
      },
    },
    {
      at: keepTiming.done,
      run: () => {
        useMidnightScene.setState({ isKeeping: false })
      },
    },
  ])
}
