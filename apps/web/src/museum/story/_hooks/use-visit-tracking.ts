import { useMuseumStore } from "@/museum/_lib/museum-store"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { useEffect } from "react"

// Counts each entry into the manor and notices the visitor walking out, so the
// story can greet a return and say goodbye to an early leave.
export function useVisitTracking() {
  useEffect(
    () =>
      useMuseumStore.subscribe((state, previous) => {
        if (state.phase === previous.phase) {
          return
        }
        const story = useStoryStore.getState()
        if (state.phase === "gallery") {
          story.beginVisit()
        } else if (state.phase === "leaving") {
          story.endVisit()
        }
      }),
    []
  )
}
