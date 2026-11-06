import { AudioContext as SharedAudioContext } from "three"

// A short, soft, wet snap, synthesised: a moist lip smack falling in pitch, a
// tiny click of petals meeting, a muffled body thump and a damp tail. The
// quiet one (reduced motion) keeps only the thump and the tail, low; a nibble
// is the smack alone.

let noise: AudioBuffer | null = null

function noiseBuffer(context: BaseAudioContext) {
  if (noise?.sampleRate === context.sampleRate) {
    return noise
  }
  const length = Math.round(context.sampleRate * 0.3)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1
  }
  noise = buffer
  return buffer
}

type Voice = {
  context: AudioContext
  output: AudioNode
  start: number
}

type Envelope = { peak: number; attack: number; release: number }

function envelope(voice: Voice, { peak, attack, release }: Envelope) {
  const gain = voice.context.createGain()
  const { start } = voice
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + release)
  gain.connect(voice.output)
  return gain
}

type Sweep = { from: number; to: number; seconds: number }

function sweep(voice: Voice, { from, to, seconds }: Sweep, level: Envelope) {
  const oscillator = voice.context.createOscillator()
  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(from, voice.start)
  oscillator.frequency.exponentialRampToValueAtTime(to, voice.start + seconds)
  oscillator.connect(envelope(voice, level))
  oscillator.start(voice.start)
  oscillator.stop(voice.start + level.attack + level.release + 0.02)
}

type Hiss = { type: BiquadFilterType; frequency: number; q: number }

function hiss(voice: Voice, filter: Hiss, level: Envelope) {
  const source = voice.context.createBufferSource()
  source.buffer = noiseBuffer(voice.context)
  const shaping = voice.context.createBiquadFilter()
  shaping.type = filter.type
  shaping.frequency.value = filter.frequency
  shaping.Q.value = filter.q
  source.connect(shaping)
  shaping.connect(envelope(voice, level))
  source.start(voice.start)
  source.stop(voice.start + level.attack + level.release + 0.02)
}

function wetSnap(voice: Voice) {
  // The smack, and the lips parting again a breath later.
  sweep(
    voice,
    { from: 1150, to: 170, seconds: 0.05 },
    { peak: 0.55, attack: 0.002, release: 0.085 }
  )
  sweep(
    { ...voice, start: voice.start + 0.045 },
    { from: 720, to: 230, seconds: 0.04 },
    { peak: 0.16, attack: 0.003, release: 0.06 }
  )
  hiss(
    voice,
    { type: "bandpass", frequency: 3200, q: 1.3 },
    { peak: 0.4, attack: 0.001, release: 0.014 }
  )
}

function dampBody(voice: Voice, level: number) {
  sweep(
    voice,
    { from: 130, to: 62, seconds: 0.11 },
    { peak: 0.38 * level, attack: 0.004, release: 0.13 }
  )
  hiss(
    voice,
    { type: "lowpass", frequency: 1300, q: 0.7 },
    { peak: 0.14 * level, attack: 0.012, release: 0.17 }
  )
}

// three's typings name its own class here; at runtime it is the browser's
// context, shared with the ambience.
function sharedContext() {
  const context: unknown = SharedAudioContext.getContext()
  return context instanceof globalThis.AudioContext ? context : null
}

export type SnapSound = "jolt" | "quiet" | "nibble"

const levels: Record<SnapSound, number> = { jolt: 0.9, quiet: 0.35, nibble: 1 }

export function playSnapSound(kind: SnapSound, volume = 1) {
  const context = sharedContext()
  if (context?.state !== "running") {
    return
  }
  const output = context.createGain()
  output.gain.value = levels[kind] * volume
  output.connect(context.destination)
  const voice = { context, output, start: context.currentTime + 0.005 }
  if (kind !== "quiet") {
    wetSnap(voice)
  }
  if (kind !== "nibble") {
    dampBody(voice, kind === "quiet" ? 0.6 : 1)
  }
  globalThis.setTimeout(() => output.disconnect(), 600)
}
