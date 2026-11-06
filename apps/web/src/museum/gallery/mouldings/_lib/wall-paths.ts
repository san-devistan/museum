import {
  sortSpans,
  type Doorway,
  type RoomBounds,
  type RoomWall,
} from "@/museum/gallery/_lib/room-bounds"
import type {
  WallPath,
  WallPoint,
} from "@/museum/gallery/mouldings/_lib/wall-sweep"

// The inside of a room's walls as one loop: left wall going back, back wall
// going right, right wall coming forward, front wall going left. This order
// keeps every segment's normal pointing into the room.
function perimeter(bounds: RoomBounds) {
  const depth = bounds.maxZ - bounds.minZ
  const width = bounds.maxX - bounds.minX
  const starts: Record<RoomWall, number> = {
    left: 0,
    back: depth,
    right: depth + width,
    front: depth * 2 + width,
  }
  const corners: readonly [number, WallPoint][] = [
    [0, [bounds.minX, bounds.maxZ]],
    [depth, [bounds.minX, bounds.minZ]],
    [depth + width, [bounds.maxX, bounds.minZ]],
    [depth * 2 + width, [bounds.maxX, bounds.maxZ]],
  ]
  return { length: (depth + width) * 2, starts, corners }
}

function pointAt(bounds: RoomBounds, distance: number): WallPoint {
  const { length, starts } = perimeter(bounds)
  const s = ((distance % length) + length) % length
  if (s < starts.back) {
    return [bounds.minX, bounds.maxZ - s]
  }
  if (s < starts.right) {
    return [bounds.minX + (s - starts.back), bounds.minZ]
  }
  if (s < starts.front) {
    return [bounds.maxX, bounds.minZ + (s - starts.right)]
  }
  return [bounds.maxX - (s - starts.front), bounds.maxZ]
}

function doorSpan(bounds: RoomBounds, door: Doorway): [number, number] {
  const { starts } = perimeter(bounds)
  const half = door.width / 2
  const spans: Record<RoomWall, [number, number]> = {
    left: [bounds.maxZ - door.center - half, bounds.maxZ - door.center + half],
    back: [door.center - half - bounds.minX, door.center + half - bounds.minX],
    right: [door.center - half - bounds.minZ, door.center + half - bounds.minZ],
    front: [bounds.maxX - door.center - half, bounds.maxX - door.center + half],
  }
  const [from, to] = spans[door.wall]
  return [starts[door.wall] + from, starts[door.wall] + to]
}

export function roomLoop(bounds: RoomBounds): WallPath {
  return {
    isClosed: true,
    points: perimeter(bounds).corners.map(([, point]) => point),
  }
}

// Open runs of wall between doorways, for mouldings that stop at openings
// (skirting, dado). Without doorways this is the closed loop.
export function wallRuns(
  bounds: RoomBounds,
  doorways: readonly Doorway[]
): WallPath[] {
  if (doorways.length === 0) {
    return [roomLoop(bounds)]
  }
  const { length, corners } = perimeter(bounds)
  const spans = sortSpans(doorways.map((door) => doorSpan(bounds, door)))
  return spans.map((span, index) => {
    const next = spans[(index + 1) % spans.length] ?? span
    const from = span[1]
    const to = next[0] <= from ? next[0] + length : next[0]
    const inner = [
      ...corners,
      ...corners.map(([s, p]) => [s + length, p] as const),
    ]
      .filter(([s]) => s > from && s < to)
      .map(([, point]) => point)
    return {
      isClosed: false,
      points: [pointAt(bounds, from), ...inner, pointAt(bounds, to)],
    }
  })
}
