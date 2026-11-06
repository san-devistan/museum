import { useMuseumStore } from "@/museum/_lib/museum-store"
import {
  isCollectionWorkId,
  useStoryStore,
} from "@/museum/story/_lib/story-store"
import { nextWorkToWake } from "@/museum/story/_lib/wake-order"
import { useEffect } from "react"

// Long enough that walking past a photograph doesn't wake it.
const wakeAfterMs = 1500

// A photograph wakes once the visitor has looked at it without a break, and
// only if it is the next one in the waking order.
export function useWakeOnGaze() {
  const photographId = useMuseumStore((state) =>
    state.phase === "gallery" &&
    !state.isPaused &&
    state.focusedArtwork?.kind === "photograph"
      ? state.focusedArtwork.id
      : null
  )
  const isNext = useStoryStore(
    (state) =>
      photographId !== null && nextWorkToWake(state.woken) === photographId
  )

  useEffect(() => {
    const timer =
      isNext && photographId !== null && isCollectionWorkId(photographId)
        ? window.setTimeout(() => {
            useStoryStore.getState().wake(photographId)
          }, wakeAfterMs)
        : undefined
    return () => {
      window.clearTimeout(timer)
    }
  }, [isNext, photographId])
}
