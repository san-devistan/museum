import { useMuseumStore } from "@/museum/_lib/museum-store"
import {
  createAmbienceEngine,
  type AmbienceEngine,
} from "@/museum/ambience/_lib/ambience-engine"
import { useMidnightScene } from "@/museum/gallery/midnight/_lib/midnight-scene"
import { useNarrationStore } from "@/museum/narration/_lib/narration-store"
import type { Camera, Object3D } from "three"

export type AmbienceSession = {
  update: (delta: number) => void
  dispose: () => void
}

const gestureEvents = ["pointerdown", "keydown"] as const

// Midnight striking, or the house keeping the visitor (ending B).
function isMidnightScripted() {
  const { isStriking, isKeeping } = useMidnightScene.getState()
  return isStriking || isKeeping
}

/**
 * Browsers only allow audio after a user gesture, so the engine (and its
 * AudioContext) is created on the first one: the Enter click that opens the
 * doors, or any click or key press. Hiding the tab fades out and suspends.
 */
export function createAmbienceSession(
  camera: Camera,
  scene: Object3D
): AmbienceSession {
  let engine: AmbienceEngine | null = null

  const wake = () => {
    engine ??= createAmbienceEngine(camera, scene)
    engine.resume()
  }
  const handleVisibility = () => {
    engine?.setHidden(document.hidden)
  }
  // Store listeners run synchronously inside the click that opened the door,
  // which keeps the user activation needed to start audio.
  const unsubscribe = useMuseumStore.subscribe((state, previous) => {
    if (state.phase === "opening" && previous.phase !== "opening") {
      wake()
    }
  })
  for (const type of gestureEvents) {
    window.addEventListener(type, wake, { capture: true, passive: true })
  }
  document.addEventListener("visibilitychange", handleVisibility)

  return {
    update: (delta) => {
      if (!engine) {
        return
      }
      const museum = useMuseumStore.getState()
      const isInGallery = museum.phase === "gallery"
      engine.update({
        camera,
        delta,
        isInGallery,
        isExploring: isInGallery && !museum.isPaused,
        isDoorShut: isInGallery && museum.hasDoorSlammed,
        isNarrating: useNarrationStore.getState().cueIndex >= 0,
        isHushed: isMidnightScripted(),
      })
    },
    dispose: () => {
      unsubscribe()
      for (const type of gestureEvents) {
        window.removeEventListener(type, wake, { capture: true })
      }
      document.removeEventListener("visibilitychange", handleVisibility)
      engine?.dispose()
      engine = null
    },
  }
}
