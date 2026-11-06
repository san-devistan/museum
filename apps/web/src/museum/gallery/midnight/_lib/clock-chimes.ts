import { sharedAudioContext } from "@/museum/narration/_lib/shared-audio-context"

// The house clock striking twelve: a deep bronze bell, synthesized (no
// recording). Each strike is a few inharmonic partials, the low hum ringing
// longest, a short metallic clang on the hit, and a big dark room around it.

type Partial = { ratio: number; gain: number; decay: number; beat: number }

// Ratios to the strike note, after a tuned church bell: hum, prime, minor
// third, fifth, nominal, then the bright upper partials that die first.
const partials: readonly Partial[] = [
  { ratio: 0.5, gain: 0.55, decay: 7.5, beat: 0.35 },
  { ratio: 1, gain: 0.8, decay: 5.5, beat: 0.5 },
  { ratio: 1.19, gain: 0.42, decay: 4, beat: 0 },
  { ratio: 1.5, gain: 0.2, decay: 3, beat: 0 },
  { ratio: 2, gain: 0.55, decay: 3.4, beat: 0.8 },
  { ratio: 2.52, gain: 0.16, decay: 2.1, beat: 0 },
  { ratio: 2.66, gain: 0.1, decay: 1.7, beat: 0 },
  { ratio: 3.01, gain: 0.14, decay: 1.5, beat: 0 },
  { ratio: 4.1, gain: 0.07, decay: 0.9, beat: 0 },
  { ratio: 5.4, gain: 0.04, decay: 0.5, beat: 0 },
]

const bell = {
  // G2: low enough to feel in the floor.
  note: 98,
  level: 0.2,
  attack: 0.005,
  brightness: 2600,
  clang: { gain: 0.22, decay: 0.05, frequency: 1700, q: 0.9 },
  room: { seconds: 3.2, wet: 0.42, dry: 0.85 },
} as const

const longestRing = Math.max(...partials.map((partial) => partial.decay))

function noiseBuffer(context: AudioContext, seconds: number) {
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * seconds),
    context.sampleRate
  )
  const samples = buffer.getChannelData(0)
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.random() * 2 - 1
  }
  return buffer
}

// A dark hall: decaying stereo noise, its top end rolled off as it fades.
function roomResponse(context: AudioContext) {
  const length = Math.ceil(context.sampleRate * bell.room.seconds)
  const response = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const samples = response.getChannelData(channel)
    let smooth = 0
    for (let index = 0; index < length; index += 1) {
      const progress = index / length
      const fade = (1 - progress) * (1 - progress) * (1 - progress)
      smooth += (Math.random() * 2 - 1 - smooth) * (0.6 - 0.5 * progress)
      samples[index] = smooth * fade
    }
  }
  return response
}

type Strike = { clang: AudioBuffer; at: number; velocity: number }

function strike(
  context: AudioContext,
  output: AudioNode,
  { clang, at, velocity }: Strike
) {
  for (const partial of partials) {
    const voices = partial.beat > 0 ? [-partial.beat, partial.beat] : [0]
    for (const detune of voices) {
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      const peak = (partial.gain * velocity) / voices.length
      oscillator.type = "sine"
      oscillator.frequency.value = bell.note * partial.ratio + detune
      envelope.gain.setValueAtTime(0, at)
      envelope.gain.linearRampToValueAtTime(peak, at + bell.attack)
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + partial.decay)
      oscillator.connect(envelope).connect(output)
      oscillator.start(at)
      oscillator.stop(at + partial.decay + 0.05)
    }
  }
  const hit = context.createBufferSource()
  hit.buffer = clang
  const band = context.createBiquadFilter()
  band.type = "bandpass"
  band.frequency.value = bell.clang.frequency
  band.Q.value = bell.clang.q
  const envelope = context.createGain()
  envelope.gain.setValueAtTime(bell.clang.gain * velocity, at)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + bell.clang.decay)
  hit.connect(band).connect(envelope).connect(output)
  hit.start(at)
  hit.stop(at + bell.clang.decay + 0.02)
}

type ChimeSchedule = {
  // Seconds from now to the first strike.
  delay: number
  gap: number
  count: number
}

// Schedules every strike at once on the audio clock, so they keep time even
// if frames stall in the dark.
export function playClockChimes({ delay, gap, count }: ChimeSchedule) {
  try {
    const context = sharedAudioContext()
    const bus = context.createGain()
    bus.gain.value = bell.level
    const tone = context.createBiquadFilter()
    tone.type = "lowpass"
    tone.frequency.value = bell.brightness
    const dry = context.createGain()
    dry.gain.value = bell.room.dry
    const room = context.createConvolver()
    room.buffer = roomResponse(context)
    const wet = context.createGain()
    wet.gain.value = bell.room.wet
    bus.connect(tone)
    tone.connect(dry).connect(context.destination)
    tone.connect(room).connect(wet).connect(context.destination)
    const clang = noiseBuffer(context, 0.1)
    const start = context.currentTime + 0.02 + delay
    for (let index = 0; index < count; index += 1) {
      // The hand that pulls the bell is not a machine.
      const velocity = 0.92 + 0.08 * Math.sin(index * 2.3)
      strike(context, bus, { clang, at: start + index * gap, velocity })
    }
    const end = delay + (count - 1) * gap + longestRing + bell.room.seconds
    window.setTimeout(
      () => {
        for (const node of [bus, tone, dry, room, wet]) {
          node.disconnect()
        }
      },
      (end + 1) * 1000
    )
  } catch {
    // No Web Audio: midnight strikes in silence.
  }
}
