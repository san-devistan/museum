import { poseDoorRibbon } from "@/museum/entrance/_lib/door-ribbon"
import type { DoorLeaf } from "@/museum/gallery/doors/_lib/door-leaves"
import type { DoorPose } from "@/museum/gallery/doors/_lib/door-motion"
import type { Material, Mesh, Object3D } from "three"

// Puts a door's meshes in its pose for this frame.

// As the front door's bow slides off: it drops, the loops twist open.
const ribbonFall = { drop: 0.55, twist: 1.6, spread: 0.6 }

// The groups a ribbon door moves: its leaves, the ribbon on each face, and
// each ribbon's loops and knot; and the satin meshes it loosens.
export type RibbonDoorRig = {
  leafGroups: (Object3D | null)[]
  ribbons: (Object3D | null)[]
  bows: (Object3D | null)[]
  lacingMeshes: (Mesh | null)[]
  bowMeshes: (Mesh | null)[]
}

export function poseRibbonDoor(
  door: { leaves: readonly { leaf: DoorLeaf }[]; ribbon: Material },
  rig: RibbonDoorRig,
  pose: DoorPose,
  isStill: boolean
) {
  for (let index = 0; index < door.leaves.length; index += 1) {
    const group = rig.leafGroups[index]
    const leaf = door.leaves[index]?.leaf
    if (group && leaf) {
      group.rotation.y = leaf.openAngle * pose.swing
    }
  }
  const fall = pose.ribbon
  door.ribbon.opacity = 1 - fall
  door.ribbon.depthWrite = fall < 0.5
  const drop = isStill ? 0 : -ribbonFall.drop * fall * fall
  for (const group of rig.ribbons) {
    if (group) {
      group.visible = fall < 1
      group.position.y = drop
    }
  }
  for (const group of rig.bows) {
    if (group) {
      group.rotation.z = isStill ? 0 : ribbonFall.twist * fall
      group.scale.setScalar(isStill ? 1 : 1 + ribbonFall.spread * fall)
    }
  }
  // The satin loosens as it falls, like the front door's as it unties.
  for (let index = 0; index < rig.lacingMeshes.length; index += 1) {
    poseDoorRibbon(
      rig.lacingMeshes[index] ?? null,
      rig.bowMeshes[index] ?? null,
      fall
    )
  }
}

export function poseHiddenDoor(
  door: { leaf: DoorLeaf; seam: { value: number } },
  leafGroup: Object3D | null,
  seamMesh: Object3D | null,
  pose: DoorPose
) {
  if (leafGroup) {
    leafGroup.rotation.y = door.leaf.openAngle * pose.swing
  }
  door.seam.value = pose.seam
  if (seamMesh) {
    seamMesh.visible = pose.seam > 0.001
  }
}
