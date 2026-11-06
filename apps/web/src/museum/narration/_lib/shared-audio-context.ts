// One AudioContext for the story's own sounds (the wake chime, the whispers'
// softening), separate from the ambience engine's. It is created on first use,
// which always follows a click (the ribbon, the pointer lock), so the browser
// lets it run.
let context: AudioContext | null = null

export function sharedAudioContext() {
  context ??= new AudioContext()
  if (context.state === "suspended") {
    void context.resume()
  }
  return context
}

// Whispers sound closer and softer: the top end is rolled off a little.
const whisperSoftening = { frequency: 3800, q: 0.4 }

// Without Web Audio the whisper simply plays unfiltered.
export function softenVoice(audio: HTMLAudioElement): () => void {
  try {
    const audioContext = sharedAudioContext()
    const source = audioContext.createMediaElementSource(audio)
    const filter = audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = whisperSoftening.frequency
    filter.Q.value = whisperSoftening.q
    source.connect(filter).connect(audioContext.destination)
    return () => {
      source.disconnect()
      filter.disconnect()
    }
  } catch {
    return () => undefined
  }
}
