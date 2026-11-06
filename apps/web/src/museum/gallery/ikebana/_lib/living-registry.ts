import type { LivingIkebanaRole } from "@/museum/gallery/ikebana/_lib/living-role"
import type { Vector3 } from "three"

// What one living ikebana shows the others: the table pair find each other
// here to feed.
export type LivingEntry = {
  // Origin, in world space.
  origin: (target: Vector3) => Vector3
  // Head reaching for the other table ikebana, -1 while none.
  reacher: () => number
  // Where a head is right now, in world space.
  headWorld: (index: number, target: Vector3) => Vector3
  // Its double bit `index`: a petal tears off.
  bite: (index: number) => void
}

const entries = new Map<LivingIkebanaRole, LivingEntry>()

export function registerLiving(role: LivingIkebanaRole, entry: LivingEntry) {
  entries.set(role, entry)
  return () => {
    if (entries.get(role) === entry) {
      entries.delete(role)
    }
  }
}

export function findLiving(role: LivingIkebanaRole) {
  return entries.get(role) ?? null
}

const partners: Record<LivingIkebanaRole, LivingIkebanaRole | null> = {
  "table-left": "table-right",
  "table-right": "table-left",
  vestibule: null,
  boudoir: null,
}

// The other half of the table pair.
export function partnerRole(role: LivingIkebanaRole) {
  return partners[role]
}

// Once per visit, even if the room unmounts and mounts again.
export const livingMemory = {
  whispered: new Set<LivingIkebanaRole>(),
  snapped: new Set<LivingIkebanaRole>(),
}
