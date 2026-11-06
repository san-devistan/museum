import type { Collider } from "@/museum/_lib/museum-layout"
import {
  doorBlocker,
  doorLeafColliders,
  doorwayExit,
  manorSolids,
  solidCollider,
  walkableBounds,
} from "@/museum/gallery/_lib/gallery-layout"
import { dressingColliders } from "@/museum/gallery/_lib/manor-dressing"
import { doorSpots, manorPropSpots } from "@/museum/gallery/_lib/manor-plan"
import {
  propFootprints,
  type PropSpot,
} from "@/museum/gallery/props/_lib/prop-spots"

// A prop's footprint turned with it, as the box around it.
function propCollider(spot: PropSpot): Collider[] {
  const { width, depth } = propFootprints[spot.id]
  if (width === 0 || depth === 0) {
    return []
  }
  const cos = Math.abs(Math.cos(spot.rotationY))
  const sin = Math.abs(Math.sin(spot.rotationY))
  const halfX = (width * cos + depth * sin) / 2
  const halfZ = (width * sin + depth * cos) / 2
  const [x, , z] = spot.position
  return [
    { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ },
  ]
}

const solidColliders = [...manorSolids.values()].flatMap((solids) =>
  solids.filter((solid) => solid.isObstacle).map(solidCollider)
)

// What stands in each locked doorway: a box across it while the door is
// shut, the open leaves once it has swung. Every locked door starts shut;
// the door itself opens it (gallery/doors).
const doorwayBoxes = new Map<string, readonly Collider[]>(
  doorSpots.flatMap((door) =>
    door.lock === null ? [] : [[door.id, [doorBlocker(door)]] as const]
  )
)

const colliders: Collider[] = [
  ...solidColliders,
  ...doorLeafColliders,
  ...dressingColliders,
  ...manorPropSpots.flatMap(propCollider),
  ...[...doorwayBoxes.values()].flat(),
]

// Walls (doorways are gaps in them), furniture, torchères, props and the
// locked doors. The list is live: the player reads it on every step.
export const galleryColliders: readonly Collider[] = colliders

export function setDoorwayColliders(id: string, boxes: readonly Collider[]) {
  for (const box of doorwayBoxes.get(id) ?? []) {
    const index = colliders.indexOf(box)
    if (index !== -1) {
      colliders.splice(index, 1)
    }
  }
  colliders.push(...boxes)
  doorwayBoxes.set(id, boxes)
}

export const galleryBounds = walkableBounds

export const galleryExit = doorwayExit
