import {
  collectionWorks,
  type CollectionWork,
  type WorkPhoto,
} from "@/museum/collection/collection-works"
import {
  roomOf,
  workHangs,
  type RoomId,
  type WorkHang,
} from "@/museum/gallery/_lib/manor-plan"
import type { RoomBounds } from "@/museum/gallery/_lib/room-bounds"

export type ArtworkSpec = CollectionWork & {
  room: RoomId
  viewingDistance: number
  seed: number
  width: number
  height: number
  position: [x: number, y: number, z: number]
  rotation: [x: number, y: number, z: number]
}

type Placement = Pick<ArtworkSpec, "position" | "rotation">

const wallOffset = 0.01
const quarterTurn = Math.PI / 2
const maxPrintHeight = 2

function placeOnWall(hang: WorkHang, bounds: RoomBounds): Placement {
  const y = hang.hangHeight
  const placements: Record<WorkHang["wall"], Placement> = {
    left: {
      position: [bounds.minX + wallOffset, y, hang.along],
      rotation: [0, quarterTurn, 0],
    },
    right: {
      position: [bounds.maxX - wallOffset, y, hang.along],
      rotation: [0, -quarterTurn, 0],
    },
    back: {
      position: [hang.along, y, bounds.minZ + wallOffset],
      rotation: [0, 0, 0],
    },
    front: {
      position: [hang.along, y, bounds.maxZ - wallOffset],
      rotation: [0, Math.PI, 0],
    },
  }
  return placements[hang.wall]
}

// Prints scale with how far you stand from them: 3 m² at 3 m, smaller
// when the room brings you closer.
function printSize(photo: WorkPhoto, viewingDistance: number) {
  const area = viewingDistance ** 2 / 3
  const aspect = photo.width / photo.height
  const height = Math.min(Math.sqrt(area / aspect), maxPrintHeight)
  return { width: height * aspect, height }
}

const worksById = new Map<string, CollectionWork>(
  collectionWorks.map((work) => [work.id, work])
)

export const artworks: readonly ArtworkSpec[] = workHangs.flatMap(
  (hang, index) => {
    const work = worksById.get(hang.id)
    if (!work) {
      return []
    }
    return [
      {
        ...work,
        ...printSize(work.photo, hang.viewingDistance),
        ...placeOnWall(hang, roomOf(hang.room).bounds),
        room: hang.room,
        viewingDistance: hang.viewingDistance,
        seed: 11 + index * 13,
      },
    ]
  }
)
