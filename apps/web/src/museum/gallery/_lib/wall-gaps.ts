import type { ArtworkSpec } from "@/museum/gallery/_lib/gallery-artworks"
import {
  sortSpans,
  type RoomBounds,
  type RoomWall,
  type Span,
} from "@/museum/gallery/_lib/room-bounds"
import { artworkFrame } from "@/museum/gallery/artwork/_lib/artwork-frame"
import { labelSize } from "@/museum/gallery/label/_lib/label-assets"
import { paintingLabelOffset } from "@/museum/gallery/label/_lib/label-placement"

export type WallGap = {
  wall: RoomWall
  center: number
  width: number
}

export type WallMount = {
  position: [x: number, y: number, z: number]
  rotationY: number
}

const wallTolerance = 0.2

function near(value: number, edge: number) {
  return Math.abs(value - edge) < wallTolerance
}

// Which wall of the room a hung photo is on, if any.
function wallOf(artwork: ArtworkSpec, bounds: RoomBounds): RoomWall | null {
  const [x, , z] = artwork.position
  if (near(x, bounds.minX)) {
    return "left"
  }
  if (near(x, bounds.maxX)) {
    return "right"
  }
  if (near(z, bounds.minZ)) {
    return "back"
  }
  return near(z, bounds.maxZ) ? "front" : null
}

// Along-wall axis and the direction a photo's local +x runs on each wall.
const wallAxes: Record<RoomWall, { along: "x" | "z"; sign: number }> = {
  left: { along: "z", sign: -1 },
  right: { along: "z", sign: 1 },
  back: { along: "x", sign: 1 },
  front: { along: "x", sign: -1 },
}

// Wall-long extent of a hung photo and its label, along the wall axis.
function artworkSpan(artwork: ArtworkSpec, wall: RoomWall): Span {
  const { lace } = artworkFrame(artwork)
  const label = paintingLabelOffset(artwork)
  const axis = wallAxes[wall]
  const center = axis.along === "x" ? artwork.position[0] : artwork.position[2]
  const localTo = label.position[0] + labelSize.width / 2
  const ends = [
    center - (lace.width / 2) * axis.sign,
    center + localTo * axis.sign,
  ]
  return [Math.min(...ends), Math.max(...ends)]
}

function gapsOnWall(
  wall: RoomWall,
  bounds: RoomBounds,
  artworks: readonly ArtworkSpec[]
): WallGap[] {
  const spans = sortSpans(
    artworks
      .filter((artwork) => wallOf(artwork, bounds) === wall)
      .map((artwork) => artworkSpan(artwork, wall))
  )
  return spans.slice(1).flatMap((span, index) => {
    const previous = spans[index]
    if (!previous) {
      return []
    }
    const width = span[0] - previous[1]
    return width > 0
      ? [{ wall, center: (span[0] + previous[1]) / 2, width }]
      : []
  })
}

// Bare stretches of wall between a room's hung photos, for windows and
// sconces.
export function wallGapsOf(
  bounds: RoomBounds,
  artworks: readonly ArtworkSpec[]
): Record<RoomWall, WallGap[]> {
  return {
    left: gapsOnWall("left", bounds, artworks),
    right: gapsOnWall("right", bounds, artworks),
    back: gapsOnWall("back", bounds, artworks),
    front: gapsOnWall("front", bounds, artworks),
  }
}

// Places a wall-mounted piece in a room: local +z faces into the room.
export function wallMount(gap: WallGap, bounds: RoomBounds, y = 0): WallMount {
  const mounts: Record<RoomWall, WallMount> = {
    left: { position: [bounds.minX, y, gap.center], rotationY: Math.PI / 2 },
    right: {
      position: [bounds.maxX, y, gap.center],
      rotationY: -Math.PI / 2,
    },
    back: { position: [gap.center, y, bounds.minZ], rotationY: 0 },
    front: { position: [gap.center, y, bounds.maxZ], rotationY: Math.PI },
  }
  return mounts[gap.wall]
}
