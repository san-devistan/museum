import {
  isChapterAwake,
  useStoryStore,
  type ChapterId,
} from "@/museum/story/_lib/story-store"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef } from "react"

// Seconds since a chapter woke, for the change it brings to its room: null
// while it sleeps, Infinity when it was awake already as the manor loaded
// (the change shows its end state at once).
export function useChapterAwakening(chapter: ChapterId) {
  const isAwake = useStoryStore((state) => isChapterAwake(state.woken, chapter))
  const elapsedRef = useRef<number | null>(isAwake ? Infinity : null)

  useEffect(() => {
    if (!isAwake) {
      elapsedRef.current = null
      return
    }
    elapsedRef.current ??= 0
  }, [isAwake])

  useFrame((_, delta) => {
    const elapsed = elapsedRef.current
    if (elapsed !== null && elapsed !== Infinity) {
      elapsedRef.current = elapsed + Math.min(delta, 0.1)
    }
  })

  return elapsedRef
}
