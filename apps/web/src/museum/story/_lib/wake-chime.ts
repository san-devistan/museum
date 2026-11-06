import { sharedAudioContext } from "@/museum/narration/_lib/shared-audio-context"

// The twelve wakes play a little music-box tune, one note per pearl, so the
// last pearl resolves it. Frequencies in Hz (D major, around the fifth octave).
const tune = [
  880, 739.99, 659.25, 587.33, 739.99, 880, 987.77, 880, 739.99, 659.25, 739.99,
  1174.66,
] as const

// A soft glass bell: a few slightly inharmonic partials that die away fast,
// a quiet octave sparkle just after, and a short echo.
const partials = [
  { ratio: 1, gain: 1, decay: 2.4 },
  { ratio: 2.01, gain: 0.32, decay: 1.3 },
  { ratio: 3.03, gain: 0.1, decay: 0.7 },
  { ratio: 4.2, gain: 0.05, decay: 0.4 },
] as const

const chime = {
  level: 0.11,
  attack: 0.006,
  sparkleDelay: 0.07,
  sparkleGain: 0.22,
  brightness: 5200,
  echoDelay: 0.24,
  echoFeedback: 0.28,
  echoLevel: 0.22,
} as const

function ring(
  context: AudioContext,
  output: AudioNode,
  frequency: number,
  at: number
) {
  for (const partial of partials) {
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = "sine"
    oscillator.frequency.value = frequency * partial.ratio
    envelope.gain.setValueAtTime(0, at)
    envelope.gain.linearRampToValueAtTime(partial.gain, at + chime.attack)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + partial.decay)
    oscillator.connect(envelope).connect(output)
    oscillator.start(at)
    oscillator.stop(at + partial.decay + 0.05)
  }
}

function chimeBus(context: AudioContext) {
  const bus = context.createGain()
  bus.gain.value = chime.level
  const tone = context.createBiquadFilter()
  tone.type = "lowpass"
  tone.frequency.value = chime.brightness
  const echo = context.createDelay(1)
  echo.delayTime.value = chime.echoDelay
  const feedback = context.createGain()
  feedback.gain.value = chime.echoFeedback
  const echoLevel = context.createGain()
  echoLevel.gain.value = chime.echoLevel
  bus.connect(tone).connect(context.destination)
  tone.connect(echo).connect(feedback).connect(echo)
  echo.connect(echoLevel).connect(context.destination)
  return { bus, nodes: [bus, tone, echo, feedback, echoLevel] }
}

const longestRing = Math.max(...partials.map((partial) => partial.decay))
const releaseAfterMs = (longestRing + 2) * 1000

// `pearl` is the index of the pearl that just joined the necklace (0 to 11).
export function playWakeChime(pearl: number) {
  try {
    const context = sharedAudioContext()
    const frequency = tune[Math.min(Math.max(pearl, 0), tune.length - 1)]
    const { bus, nodes } = chimeBus(context)
    const sparkle = context.createGain()
    sparkle.gain.value = chime.sparkleGain
    sparkle.connect(bus)
    const now = context.currentTime + 0.02
    ring(context, bus, frequency, now)
    ring(context, sparkle, frequency * 2, now + chime.sparkleDelay)
    window.setTimeout(() => {
      for (const node of [sparkle, ...nodes]) {
        node.disconnect()
      }
    }, releaseAfterMs)
  } catch {
    // No Web Audio: the pearl still lights up, silently.
  }
}

// At midnight the music box plays its whole tune, in tune at last, and slows
// into the last note.
const melody = { gap: 0.34, lastGap: 0.62 } as const

// Seconds from the tune's first note to its last.
export const musicBoxLastNote = (tune.length - 2) * melody.gap + melody.lastGap

// Plays the twelve notes `delay` seconds from now.
export function playMusicBoxTune(delay = 0) {
  try {
    const context = sharedAudioContext()
    const { bus, nodes } = chimeBus(context)
    const sparkle = context.createGain()
    sparkle.gain.value = chime.sparkleGain
    sparkle.connect(bus)
    const start = context.currentTime + 0.02 + delay
    tune.forEach((frequency, index) => {
      const isLast = index === tune.length - 1
      const at =
        start +
        Math.min(index, tune.length - 2) * melody.gap +
        (isLast ? melody.lastGap : 0)
      ring(context, bus, frequency, at)
      ring(context, sparkle, frequency * 2, at + chime.sparkleDelay)
    })
    window.setTimeout(
      () => {
        for (const node of [sparkle, ...nodes]) {
          node.disconnect()
        }
      },
      (delay + musicBoxLastNote) * 1000 + releaseAfterMs
    )
  } catch {
    // No Web Audio: midnight goes on in silence.
  }
}
