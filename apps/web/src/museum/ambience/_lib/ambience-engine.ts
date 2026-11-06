import {
  carpetSteps,
  type SoundName,
} from "@/museum/ambience/_lib/ambience-sounds"
import {
  behindEmitters,
  chandelierEmitter,
  exteriorBleed,
  footstepTuning,
  masterFade,
  neonCrackleTiming,
  neonEmitter,
  randomIn,
  soundVolume,
  suspendDelayMs,
  type HauntKind,
  type Range,
} from "@/museum/ambience/_lib/ambience-tuning"
import {
  createEmitter,
  glideParam,
  playOneShot,
  silence,
  startLoop,
  stopAll,
} from "@/museum/ambience/_lib/audio-voices"
import {
  advanceBedMix,
  bedLevels,
  createBedMix,
} from "@/museum/ambience/_lib/bed-mix"
import {
  advanceFootsteps,
  createFootsteps,
  resetFootsteps,
  type StepKind,
} from "@/museum/ambience/_lib/footsteps"
import {
  advanceHaunting,
  behindVisitor,
  createHaunting,
  resetHaunting,
} from "@/museum/ambience/_lib/haunting"
import {
  advanceCrackle,
  createCrackle,
} from "@/museum/ambience/_lib/neon-crackle"
import { audibleSpan, loadSounds } from "@/museum/ambience/_lib/sound-buffers"
import {
  Audio,
  AudioListener,
  Group,
  Vector3,
  type Camera,
  type Object3D,
  type PositionalAudio,
} from "three"

export type AmbienceFrame = {
  camera: Camera
  delta: number
  isInGallery: boolean
  isExploring: boolean
  isDoorShut: boolean
  isNarrating: boolean
  // Midnight is striking, or the house keeps the visitor: it makes no sound
  // of its own over the chimes, the doors and the lines that go with them.
  isHushed: boolean
}

export type AmbienceEngine = {
  update: (frame: AmbienceFrame) => void
  resume: () => void
  setHidden: (isHidden: boolean) => void
  dispose: () => void
}

type HauntSound = { sound: SoundName; volume: number; rate: Range }

const hauntSounds: Record<HauntKind, HauntSound> = {
  chandelier: {
    sound: "chandelierTinkle",
    volume: soundVolume.chandelierTinkle,
    rate: chandelierEmitter.rate,
  },
  creak: {
    sound: "woodCreak",
    volume: soundVolume.woodCreak,
    rate: behindEmitters.creak.rate,
  },
  whisper: {
    sound: "whisper",
    volume: soundVolume.whisper,
    rate: behindEmitters.whisper.rate,
  },
}

const maxFrameDelta = 0.1
const stepOnsetWindow = 0.3

async function setContextRunning(context: AudioContext, isRunning: boolean) {
  try {
    await (isRunning ? context.resume() : context.suspend())
  } catch (error) {
    console.warn("Ambience: audio context did not change state", error)
  }
}

/** Moves an emitter's panner right away, before its first frame update. */
function placeEmitter(emitter: PositionalAudio, position: Vector3) {
  emitter.position.copy(position)
  const time = emitter.context.currentTime
  const { positionX, positionY, positionZ } = emitter.panner
  for (const [param, value] of [
    [positionX, position.x],
    [positionY, position.y],
    [positionZ, position.z],
  ] as const) {
    param.cancelScheduledValues(time)
    param.setValueAtTime(value, time)
  }
}

function stepOnset(buffer: AudioBuffer) {
  const { start } = audibleSpan(buffer, {
    threshold: footstepTuning.onsetThreshold,
    maxTrim: stepOnsetWindow,
  })
  return Math.max(0, start - footstepTuning.onsetLead)
}

type Voices = {
  exteriorFilter: BiquadFilterNode
  exterior: Audio
  drone: Audio
  neon: PositionalAudio
  crackle: PositionalAudio
  haunts: Record<HauntKind, PositionalAudio>
  steps: Audio[]
  loops: Partial<Record<SoundName, Audio<AudioNode>>>
  all: Audio<AudioNode>[]
  root: Group
}

/** Every voice on the shared listener, grouped (and named) under one root. */
function createVoices(listener: AudioListener): Voices {
  const exteriorFilter = listener.context.createBiquadFilter()
  exteriorFilter.type = "lowpass"
  exteriorFilter.frequency.value = exteriorBleed.outsideCutoff
  const exterior = silence(new Audio(listener))
  exterior.setFilter(exteriorFilter)
  const drone = silence(new Audio(listener))
  const neon = silence(createEmitter(listener, neonEmitter))
  neon.position.set(...neonEmitter.position)
  const crackle = createEmitter(listener, neonEmitter)
  const haunts: Record<HauntKind, PositionalAudio> = {
    chandelier: createEmitter(listener, chandelierEmitter),
    creak: createEmitter(listener, behindEmitters.creak),
    whisper: createEmitter(listener, behindEmitters.whisper),
  }
  const steps = Array.from(
    { length: footstepTuning.voices },
    () => new Audio(listener)
  )
  const named: Record<string, Audio<AudioNode>> = {
    exteriorNight: exterior,
    galleryDrone: drone,
    neonBuzz: neon,
    neonCrackle: crackle,
    ...haunts,
    ...Object.fromEntries(steps.map((step, index) => [`step${index}`, step])),
  }
  const root = new Group()
  root.name = "ambience"
  for (const [name, voice] of Object.entries(named)) {
    voice.name = name
    root.add(voice)
  }
  return {
    exteriorFilter,
    exterior,
    drone,
    neon,
    crackle,
    haunts,
    steps,
    loops: { exteriorNight: exterior, galleryDrone: drone, neonBuzz: neon },
    all: Object.values(named),
    root,
  }
}

/**
 * The whole soundscape on one listener riding the camera: exterior and
 * interior beds crossfading through the doorway, the buzzing sign, carpet
 * footsteps, and rare positional one-shots inside.
 */
export function createAmbienceEngine(
  camera: Camera,
  scene: Object3D
): AmbienceEngine {
  const listener = new AudioListener()
  listener.gain.gain.value = 0
  camera.add(listener)
  const { context } = listener

  const voices = createVoices(listener)
  const { exterior, exteriorFilter, drone, neon, crackle, haunts, steps } =
    voices
  scene.add(voices.root)

  const neonPosition = new Vector3(...neonEmitter.position)
  const chandelierPosition = new Vector3(...chandelierEmitter.position)
  const hauntPosition = new Vector3()
  const buffers = new Map<SoundName, AudioBuffer>()
  const onsets = new Map<SoundName, number>()
  const mix = createBedMix()
  const footsteps = createFootsteps()
  const haunting = createHaunting()
  const crackleTimer = createCrackle()
  let nextStepVoice = 0
  let lastStep: SoundName | null = null
  let suspendTimer: number | null = null
  let isAwake = false
  let isDisposed = false

  loadSounds((name, buffer) => {
    if (isDisposed) {
      return
    }
    buffers.set(name, buffer)
    const loop = voices.loops[name]
    if (loop) {
      startLoop(loop, buffer)
    }
  })

  function playStep(kind: StepKind) {
    const choices = carpetSteps.filter(
      (name) => name !== lastStep && buffers.has(name)
    )
    const name = choices[Math.floor(Math.random() * choices.length)]
    const buffer = name ? buffers.get(name) : undefined
    const voice = steps[nextStepVoice]
    if (!name || !buffer || !voice) {
      return
    }
    lastStep = name
    nextStepVoice = (nextStepVoice + 1) % steps.length
    if (!onsets.has(name)) {
      onsets.set(name, stepOnset(buffer))
    }
    const settle = kind === "settle" ? footstepTuning.settleLevel : 1
    playOneShot(voice, {
      buffer,
      level: soundVolume.carpetStep * settle * randomIn(footstepTuning.level),
      rate: randomIn(footstepTuning.rate),
      offset: onsets.get(name),
      delay: randomIn(footstepTuning.humanize),
    })
  }

  function playHaunt(kind: HauntKind, listenerCamera: Camera) {
    const { sound, volume, rate } = hauntSounds[kind]
    const buffer = buffers.get(sound)
    if (!buffer) {
      return
    }
    const position =
      kind === "chandelier"
        ? chandelierPosition
        : behindVisitor(listenerCamera, kind, hauntPosition)
    placeEmitter(haunts[kind], position)
    playOneShot(haunts[kind], { buffer, level: volume, rate: randomIn(rate) })
  }

  function updateCrackle(outside: number) {
    const buffer = buffers.get("neonCrackle")
    const strength = advanceCrackle(crackleTimer)
    if (
      strength <= 0 ||
      !buffer ||
      outside < 1 - neonCrackleTiming.audibleBelowInside
    ) {
      return
    }
    const [quiet, loud] = neonCrackleTiming.level
    placeEmitter(crackle, neonPosition)
    playOneShot(crackle, {
      buffer,
      level:
        soundVolume.neonCrackle * outside * (quiet + (loud - quiet) * strength),
      rate: randomIn(neonCrackleTiming.rate),
    })
  }

  function updateGallery(frame: AmbienceFrame, delta: number) {
    if (!frame.isInGallery) {
      resetFootsteps(footsteps)
      resetHaunting(haunting)
      return
    }
    const step = advanceFootsteps(footsteps, frame.camera.position, delta)
    if (step) {
      playStep(step)
    }
    if (!frame.isExploring) {
      return
    }
    if (frame.isHushed) {
      // A quiet stretch follows, as when the visit begins.
      resetHaunting(haunting)
      return
    }
    const haunt = advanceHaunting(haunting, delta, !frame.isNarrating)
    if (haunt) {
      playHaunt(haunt, frame.camera)
    }
  }

  function update(frame: AmbienceFrame) {
    const delta = Math.min(frame.delta, maxFrameDelta)
    const time = context.currentTime
    advanceBedMix(mix, {
      cameraZ: frame.camera.position.z,
      isDoorShut: frame.isDoorShut,
      isNarrating: frame.isNarrating,
      delta,
    })
    const levels = bedLevels(mix)
    glideParam(exterior.gain.gain, levels.exterior, time)
    glideParam(exteriorFilter.frequency, levels.exteriorCutoff, time)
    glideParam(drone.gain.gain, levels.drone, time)
    glideParam(neon.gain.gain, levels.neon, time)
    updateCrackle(levels.outside)
    updateGallery(frame, delta)
  }

  function cancelSuspend() {
    if (suspendTimer !== null) {
      window.clearTimeout(suspendTimer)
      suspendTimer = null
    }
  }

  function fadeMaster(level: number, seconds: number) {
    const master = listener.gain.gain
    master.cancelScheduledValues(context.currentTime)
    master.setTargetAtTime(level, context.currentTime, seconds)
  }

  function resume() {
    if (isAwake && context.state === "running") {
      return
    }
    isAwake = true
    cancelSuspend()
    void setContextRunning(context, true)
    fadeMaster(masterFade.level, masterFade.fadeIn)
  }

  function setHidden(isHidden: boolean) {
    cancelSuspend()
    if (!isHidden) {
      void setContextRunning(context, true)
      fadeMaster(masterFade.level, masterFade.show)
      return
    }
    fadeMaster(0, masterFade.hide)
    suspendTimer = window.setTimeout(() => {
      suspendTimer = null
      void setContextRunning(context, false)
    }, suspendDelayMs)
  }

  function dispose() {
    isDisposed = true
    cancelSuspend()
    stopAll(voices.all)
    exteriorFilter.disconnect()
    scene.remove(voices.root)
    camera.remove(listener)
    listener.gain.disconnect()
  }

  return { update, resume, setHidden, dispose }
}
