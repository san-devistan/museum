import { triggerCameraShake } from "@/museum/_lib/camera-shake"
import { useMuseumStore } from "@/museum/_lib/museum-store"
import { EntranceDoor } from "@/museum/entrance/_components/entrance-door"
import { EntranceExterior } from "@/museum/entrance/_components/entrance-exterior"
import { EntranceSign } from "@/museum/entrance/_components/entrance-sign"
import { ThresholdRibbon } from "@/museum/entrance/_components/threshold-ribbon"
import {
  createEntranceSequence,
  stepEntrance,
  type DoorCue,
  type EntranceEvent,
  type EntranceSequence,
} from "@/museum/entrance/_lib/entrance-sequence"
import { frameDelta } from "@/museum/entrance/_lib/entrance-timeline"
import doorCreakSound from "@/museum/entrance/door-creak.mp3"
import doorSlamSound from "@/museum/entrance/door-slam.mp3"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import type { Group } from "three"
import { useMediaQuery } from "usehooks-ts"

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

type DoorSounds = Record<DoorCue, HTMLAudioElement>

function preloadSound(src: string) {
  const audio = new Audio(src)
  audio.preload = "auto"
  audio.load()
  return audio
}

function releaseSound(audio: HTMLAudioElement) {
  audio.pause()
  audio.removeAttribute("src")
  audio.load()
}

async function playSound(audio: HTMLAudioElement) {
  audio.currentTime = 0
  try {
    await audio.play()
  } catch {
    // Playback was refused; the doors still move, just silently.
    return
  }
}

function useDoorSounds() {
  const soundsRef = useRef<DoorSounds | null>(null)

  useEffect(() => {
    const sounds: DoorSounds = {
      slam: preloadSound(doorSlamSound),
      creak: preloadSound(doorCreakSound),
    }
    soundsRef.current = sounds
    return () => {
      soundsRef.current = null
      releaseSound(sounds.slam)
      releaseSound(sounds.creak)
    }
  }, [])

  return soundsRef
}

function handleEntranceEvent(
  event: EntranceEvent,
  effects: { sounds: DoorSounds | null; reducedMotion: boolean }
) {
  const store = useMuseumStore.getState()
  if (event === "entered") {
    store.enterGallery()
    return
  }
  if (event === "exited") {
    store.returnToEntrance()
    return
  }
  if (event === "settled") {
    store.markDoorSlammed()
    return
  }
  if (event === "slam") {
    store.markDoorSlammed()
    if (!effects.reducedMotion) {
      triggerCameraShake()
    }
  }
  const sound = effects.sounds?.[event]
  if (sound) {
    void playSound(sound)
  }
}

export function Entrance() {
  const leftRef = useRef<Group>(null)
  const rightRef = useRef<Group>(null)
  const ribbonRef = useRef<Group>(null)
  const loopsRef = useRef<Group>(null)
  const lightsRef = useRef<Group>(null)
  const sequenceRef = useRef<EntranceSequence | null>(null)
  const soundsRef = useDoorSounds()
  const reducedMotion = useMediaQuery(reducedMotionQuery)

  useFrame(({ camera }, delta) => {
    sequenceRef.current ??= createEntranceSequence()
    const { phase, isPaused } = useMuseumStore.getState()
    const { midnight, ending } = useStoryStore.getState()
    const event = stepEntrance(sequenceRef.current, {
      phase,
      camera,
      rig: {
        leaves: [leftRef.current, rightRef.current],
        ribbon: ribbonRef.current,
        loops: loopsRef.current,
        lights: lightsRef.current,
      },
      delta: frameDelta(delta),
      reducedMotion,
      isPaused,
      isMidnight: midnight,
      isKept: ending === "stay",
    })
    if (event) {
      handleEntranceEvent(event, { sounds: soundsRef.current, reducedMotion })
    }
  })

  return (
    <group>
      <EntranceExterior lightsRef={lightsRef} />
      <EntranceSign />
      <ThresholdRibbon />
      <EntranceDoor
        refs={{
          left: leftRef,
          right: rightRef,
          ribbon: ribbonRef,
          loops: loopsRef,
        }}
      />
    </group>
  )
}
