import { sharedAudioContext } from "@/museum/narration/_lib/shared-audio-context"

// The hush of a long skirt brushing past: filtered noise, barely there.
const rustle = { seconds: 1.3, gain: 0.05, frequency: 1100, q: 0.8 }

export function playRustle() {
  try {
    const context = sharedAudioContext()
    const length = Math.floor(context.sampleRate * rustle.seconds)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) {
      samples[index] = Math.random() * 2 - 1
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = rustle.frequency
    filter.Q.value = rustle.q
    const gain = context.createGain()
    const now = context.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(rustle.gain, now + 0.35)
    gain.gain.linearRampToValueAtTime(0, now + rustle.seconds)
    source.connect(filter).connect(gain).connect(context.destination)
    source.start(now)
    source.stop(now + rustle.seconds)
  } catch {
    // Without Web Audio she passes in silence.
    return
  }
}
