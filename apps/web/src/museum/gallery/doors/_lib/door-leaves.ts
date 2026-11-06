import type { Collider } from "@/museum/_lib/museum-layout"
import { leafThickness } from "@/museum/entrance/_lib/entrance-layout"
import { partition, type DoorSpot } from "@/museum/gallery/_lib/manor-plan"
import { MathUtils } from "three"

// The leaves of the manor's locked doors, in the door's own frame: x across
// the opening, y up from the floor, +z toward the room you come from. Each
// leaf turns on its hinge toward -z, away from the visitor.

export type DoorLeaf = {
  // 1 hinged on the left (-x) and opening to +x, -1 the other way.
  sign: 1 | -1
  hinge: readonly [x: number, y: number, z: number]
  width: number
  height: number
  depth: number
  openAngle: number
}

// The wooden linings inside a dressed doorway (see DoorCasings).
const lining = 0.04
const clearance = 0.006
const sill = 0.005

// A carved double door, centred in the wall like the front door.
export function ribbonLeaves(door: DoorSpot): DoorLeaf[] {
  const half = door.width / 2 - lining
  const width = half - clearance * 1.5
  const height = door.height - lining - sill - clearance
  return ([1, -1] as const).map((sign) => ({
    sign,
    hinge: [-sign * half, sill, -leafThickness / 2],
    width,
    height,
    depth: leafThickness,
    openAngle: sign * MathUtils.degToRad(96),
  }))
}

// A jib door: one thin leaf flush with the wall you come from, hinged on its
// left; it stops short of the jamb behind it.
export const hiddenLeafDepth = 0.05

export function hiddenLeaf(door: DoorSpot): DoorLeaf {
  const gap = 0.004
  return {
    sign: 1,
    hinge: [-door.width / 2 + gap, sill, partition - hiddenLeafDepth],
    width: door.width - gap * 2,
    height: door.height - sill - gap,
    depth: hiddenLeafDepth,
    openAngle: MathUtils.degToRad(86),
  }
}

// Where an open leaf stands, as a box on the floor plan.
export function openLeafCollider(door: DoorSpot, leaf: DoorLeaf): Collider {
  const turn = leaf.openAngle
  const cosTurn = Math.cos(turn)
  const sinTurn = Math.sin(turn)
  const cosDoor = Math.cos(door.rotationY)
  const sinDoor = Math.sin(door.rotationY)
  const [hingeX, , hingeZ] = leaf.hinge
  const [x, , z] = door.position
  const corners = [
    [0, 0],
    [leaf.sign * leaf.width, 0],
    [0, leaf.depth],
    [leaf.sign * leaf.width, leaf.depth],
  ].map(([u = 0, v = 0]) => {
    // Turned on the hinge, then with the door into the room.
    const localX = hingeX + u * cosTurn + v * sinTurn
    const localZ = hingeZ - u * sinTurn + v * cosTurn
    return [
      x + localX * cosDoor + localZ * sinDoor,
      z - localX * sinDoor + localZ * cosDoor,
    ] as const
  })
  const xs = corners.map(([cornerX]) => cornerX)
  const zs = corners.map(([, cornerZ]) => cornerZ)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  }
}
