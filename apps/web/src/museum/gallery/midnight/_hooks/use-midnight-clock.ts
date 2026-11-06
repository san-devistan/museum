import { useMuseumStore } from "@/museum/_lib/museum-store"
import {
  midnightLight,
  restMidnightLight,
  settleMidnightLight,
  stepMidnightLight,
} from "@/museum/gallery/midnight/_lib/midnight-light"
import { useMidnightScene } from "@/museum/gallery/midnight/_lib/midnight-scene"
import {
  cancelMidnightCues,
  midnightTiming,
  strikeMidnight,
} from "@/museum/gallery/midnight/_lib/midnight-sequence"
import {
  isEveryWorkAwake,
  useStoryStore,
} from "@/museum/story/_lib/story-store"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef } from "react"

function isMidnightDue() {
  const story = useStoryStore.getState()
  const museum = useMuseumStore.getState()
  return (
    !story.midnight &&
    story.introFinished &&
    isEveryWorkAwake(story.woken) &&
    museum.phase === "gallery" &&
    museum.hasDoorSlammed &&
    !museum.isPaused &&
    museum.focusedArtwork === null
  )
}

// Watches for midnight (all twelve awake, the intro heard to the end, the
// visitor walked away from the last work) and drives the manor's light. A
// reload after midnight lands in the after-midnight light, with no replay.
export function useMidnightClock(isStill: boolean) {
  const awayRef = useRef(0)

  useEffect(() => {
    settleMidnightLight(useStoryStore.getState().midnight)
    // A forgotten visit (the reset) takes the light back before midnight.
    const unsubscribe = useStoryStore.subscribe((state, previous) => {
      if (state.midnight !== previous.midnight && !state.midnight) {
        cancelMidnightCues()
        useMidnightScene.setState({
          isStriking: false,
          isKeeping: false,
          curtain: "clear",
        })
        settleMidnightLight(false)
      }
    })
    return () => {
      unsubscribe()
      cancelMidnightCues()
    }
  }, [])

  useFrame(({ gl }, delta) => {
    const scene = useMidnightScene.getState()
    if (!scene.isStriking && !scene.isKeeping) {
      awayRef.current = isMidnightDue() ? awayRef.current + delta : 0
      if (awayRef.current >= midnightTiming.walkAway) {
        awayRef.current = 0
        strikeMidnight(isStill)
      } else {
        restMidnightLight(useStoryStore.getState().midnight, 2)
      }
    }
    stepMidnightLight(delta)
    if (gl.toneMappingExposure !== midnightLight.exposure) {
      gl.toneMappingExposure = midnightLight.exposure
    }
  })
}
