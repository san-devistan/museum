import {
  levelEpsilon,
  loopEdge,
  randomIn,
  type Range,
} from "@/museum/ambience/_lib/ambience-tuning"
import { audibleSpan } from "@/museum/ambience/_lib/sound-buffers"
import { PositionalAudio, type Audio, type AudioListener } from "three"

type EmitterSpec = { refDistance: number; rolloff: number }

/** Any three.js audio voice, plain or positional. */
type Voice = Audio<AudioNode>

export type OneShot = {
  buffer: AudioBuffer
  level: number
  rate: number
  offset?: number
  delay?: number
}

const paramSettle = 0.03
const lastValues = new WeakMap<AudioParam, number>()

/** Glides an audio param, skipping changes too small to hear. */
export function glideParam(param: AudioParam, value: number, time: number) {
  const last = lastValues.get(param)
  if (last !== undefined && Math.abs(last - value) < levelEpsilon) {
    return
  }
  lastValues.set(param, value)
  param.setTargetAtTime(value, time, paramSettle)
}

function setParamNow(param: AudioParam, value: number, time: number) {
  lastValues.set(param, value)
  param.cancelScheduledValues(time)
  param.setValueAtTime(value, time)
}

export function silence<T extends Voice>(audio: T) {
  audio.gain.gain.value = 0
  lastValues.set(audio.gain.gain, 0)
  return audio
}

export function createEmitter(listener: AudioListener, spec: EmitterSpec) {
  const emitter = new PositionalAudio(listener)
  emitter.setDistanceModel("inverse")
  emitter.setRefDistance(spec.refDistance)
  emitter.setRolloffFactor(spec.rolloff)
  return emitter
}

/** Starts a seamless loop at a random point, trimmed of encoder padding. */
export function startLoop(audio: Voice, buffer: AudioBuffer) {
  const span = audibleSpan(buffer, loopEdge)
  audio.setBuffer(buffer)
  audio.setLoop(true)
  audio.setLoopStart(span.start)
  audio.setLoopEnd(span.end)
  audio.offset = randomIn([span.start, span.end] satisfies Range)
  audio.play()
}

export function playOneShot(audio: Voice, shot: OneShot) {
  if (audio.isPlaying) {
    audio.stop()
  }
  const time = audio.context.currentTime
  audio.setBuffer(shot.buffer)
  audio.setLoop(false)
  audio.offset = shot.offset ?? 0
  audio.setPlaybackRate(shot.rate)
  setParamNow(audio.gain.gain, shot.level, time)
  audio.play(shot.delay ?? 0)
}

export function stopAll(sounds: readonly Voice[]) {
  for (const sound of sounds) {
    if (sound.isPlaying) {
      sound.stop()
    }
    sound.disconnect()
    sound.gain.disconnect()
  }
}
