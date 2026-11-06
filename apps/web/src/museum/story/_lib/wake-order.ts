import type { CollectionWorkId } from "@/museum/collection/collection-works"
import { manorWorkOrder } from "@/museum/gallery/_lib/manor-plan"
import { useStoryStore } from "@/museum/story/_lib/story-store"

// The works wake in one fixed order, the visiting order along the manor's
// ring: only the next one can wake, and a sleeping work that isn't next
// stays out of reach.

// "awake": woken already. "next": the one that wakes now. "asleep": later.
export type WakeState = "awake" | "next" | "asleep"

// The last answer, kept for the same woken list: focus asks several times
// a second and the list only changes when a work wakes.
let lastAsked: {
  woken: readonly CollectionWorkId[]
  next: CollectionWorkId | null
} | null = null

// The first work of the order that isn't woken yet; null once all are.
export function nextWorkToWake(
  woken: readonly CollectionWorkId[]
): CollectionWorkId | null {
  if (lastAsked?.woken === woken) {
    return lastAsked.next
  }
  const awake: ReadonlySet<CollectionWorkId> = new Set(woken)
  const next = manorWorkOrder.find((id) => !awake.has(id)) ?? null
  lastAsked = { woken, next }
  return next
}

// Ids are plain strings so any exhibit's id can be asked about.
export function wakeStateOf(
  woken: readonly CollectionWorkId[],
  id: string
): WakeState {
  for (const awake of woken) {
    if (awake === id) {
      return "awake"
    }
  }
  return nextWorkToWake(woken) === id ? "next" : "asleep"
}

// Only the next work and the woken ones take focus (card, voice, link).
export function canFocusWork(woken: readonly CollectionWorkId[], id: string) {
  return wakeStateOf(woken, id) !== "asleep"
}

export function useNextWorkToWake() {
  return useStoryStore((state) => nextWorkToWake(state.woken))
}

export function useWakeState(id: string) {
  return useStoryStore((state) => wakeStateOf(state.woken, id))
}
