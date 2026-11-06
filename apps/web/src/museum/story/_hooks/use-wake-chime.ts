import { useStoryStore } from "@/museum/story/_lib/story-store"
import { playWakeChime } from "@/museum/story/_lib/wake-chime"
import { useEffect } from "react"

// A chime rings each time a pearl threads on.
export function useWakeChime() {
  useEffect(
    () =>
      useStoryStore.subscribe((state, previous) => {
        if (state.woken.length > previous.woken.length) {
          playWakeChime(state.woken.length - 1)
        }
      }),
    []
  )
}
