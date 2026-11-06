// Dimensions a manor room is dressed from. Everything that lines a room
// (mouldings, fog, cobwebs, beams) takes one of these instead of reading
// the gallery's own size, so the same builders can dress any room.
export type RoomBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  height: number
}

export type RoomWall = "front" | "back" | "left" | "right"

// An opening in a wall, measured along that wall's axis (x for front/back,
// z for left/right).
export type Doorway = {
  wall: RoomWall
  center: number
  width: number
}

export type Point3 = [x: number, y: number, z: number]

export function roomCenter(bounds: RoomBounds) {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  }
}

export function roomSize(bounds: RoomBounds) {
  return {
    width: bounds.maxX - bounds.minX,
    depth: bounds.maxZ - bounds.minZ,
  }
}

export type Span = readonly [from: number, to: number]

// Spans ordered by where they start (without mutating the input).
export function sortSpans<T extends Span>(spans: readonly T[]): T[] {
  const ordered: T[] = []
  for (const span of spans) {
    const at = ordered.findIndex((other) => other[0] > span[0])
    if (at === -1) {
      ordered.push(span)
    } else {
      ordered.splice(at, 0, span)
    }
  }
  return ordered
}
