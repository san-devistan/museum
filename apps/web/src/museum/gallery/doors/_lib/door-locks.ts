import type { CollectionWorkId } from "@/museum/collection/collection-works"
import {
  doorSpots,
  type DoorLock,
  type DoorSpot,
} from "@/museum/gallery/_lib/manor-plan"
import { isChapterAwake, useStoryStore } from "@/museum/story/_lib/story-store"

// When each locked door of the manor opens: the images guarding it are
// awake, or it is midnight.

type LockKeys = {
  woken: readonly CollectionWorkId[]
  midnight: boolean
}

const lockChecks: Record<DoorLock, (keys: LockKeys) => boolean> = {
  envol: ({ woken }) => isChapterAwake(woken, "envol"),
  requiem: ({ woken }) => woken.includes("requiem"),
  dedans: ({ woken }) => isChapterAwake(woken, "dedans"),
  midnight: ({ midnight }) => midnight,
}

export function isLockMet(lock: DoorLock, keys: LockKeys) {
  return lockChecks[lock](keys)
}

export function useIsDoorUnlocked(door: DoorSpot) {
  return useStoryStore(
    (state) => door.lock === null || isLockMet(door.lock, state)
  )
}

export const lockedDoors: readonly DoorSpot[] = doorSpots.filter(
  (door) => door.lock !== null
)

// Doorways the eye can pass through: the open ones, and a locked one from
// the moment its door starts to swing. Rooms behind a shut door don't draw.
const openDoorways = new Set<string>(
  doorSpots.filter((door) => door.lock === null).map((door) => door.id)
)

export function isDoorwayOpen(id: string) {
  return openDoorways.has(id)
}

export function setDoorwayOpen(id: string, isOpen: boolean) {
  if (isOpen) {
    openDoorways.add(id)
  } else {
    openDoorways.delete(id)
  }
}
