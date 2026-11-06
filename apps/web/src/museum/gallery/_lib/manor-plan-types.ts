import type { Surface } from "@/museum/_lib/surface-materials"
import type { CollectionWorkId } from "@/museum/collection/collection-works"
import type {
  Point3,
  RoomBounds,
  RoomWall,
} from "@/museum/gallery/_lib/room-bounds"
import type { IkebanaVariant } from "@/museum/gallery/ikebana/_lib/ikebana-recipes"
import type { LivingIkebanaRole } from "@/museum/gallery/ikebana/_lib/living-role"
import type { PropSpot } from "@/museum/gallery/props/_lib/prop-spots"

// The shapes of the manor plan (gallery/_lib/manor-plan.ts), which
// re-exports them: import from there.

export type RoomId = "vestibule" | "salon" | "couloir" | "boudoir" | "salle"

export type DoorLock = "envol" | "requiem" | "dedans" | "midnight"

// How a doorway looks once phase B dresses it.
export type DoorKind = "archway" | "ribbon" | "panel" | "wallpaper"

export type RoomPalette = {
  notes: string
  // Faint bounce light (sky from above, ground from below) while inside.
  fill: { sky: string; ground: string; intensity: number }
}

export type RoomLook = {
  wallpaper: Surface
  floor: Surface
  // Ceiling height along the room's x, west to east (the corridor steps
  // down); empty means one flat ceiling at bounds.height.
  ceilingSteps: readonly number[]
  beams: { acrossZ: readonly number[]; alongX: readonly number[] } | null
}

export type ManorRoom = {
  id: RoomId
  name: string
  // Inside faces of the walls; height is the (highest) ceiling.
  bounds: RoomBounds
  palette: RoomPalette
  look: RoomLook
}

export type DoorSpot = {
  id: string
  // In visiting order: you come from rooms[0] and go into rooms[1].
  rooms: readonly [from: RoomId, to: RoomId]
  // Floor centre of the opening, in the middle of the wall's thickness.
  position: Point3
  // Turn around Y; the door's local +Z faces into rooms[0].
  rotationY: number
  width: number
  height: number
  kind: DoorKind
  // What unlocks it in phase B; null is always open.
  lock: DoorLock | null
}

export type WorkHang = {
  id: CollectionWorkId
  room: RoomId
  wall: RoomWall
  // Frame centre along the wall: x on front/back walls, z on left/right.
  along: number
  // Where a visitor stands to see it, metres out from the wall.
  viewingDistance: number
  hangHeight: number
}

export type IkebanaStand = "pedestal" | "table"

export type IkebanaSpot = {
  role: LivingIkebanaRole
  room: RoomId
  variant: IkebanaVariant
  // Base of the vessel: on top of its pedestal or the dining table.
  position: Point3
  rotationY: number
  stand: IkebanaStand
}

export type ManorPropSpot = PropSpot & { room: RoomId }

export type BenchSpot = {
  id: string
  room: RoomId
  x: number
  z: number
  width: number
  depth: number
}

export type ChandelierSpot = {
  id: string
  room: RoomId
  // The ceiling point it hangs from.
  position: Point3
  scale: number
  light: { color: string; intensity: number; distance: number }
}

// A wall point (y is the centre) facing into the room.
export type WallMark = {
  room: RoomId
  position: Point3
  rotationY: number
  width: number
  height: number
}
