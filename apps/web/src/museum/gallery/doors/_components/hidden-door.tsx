import {
  plainMaterial,
  surfaceMaterial,
  type Surface,
} from "@/museum/_lib/surface-materials"
import { roomOf, type DoorSpot } from "@/museum/gallery/_lib/manor-plan"
import { useDoorOpening } from "@/museum/gallery/doors/_hooks/use-door-opening"
import { hiddenLeaf } from "@/museum/gallery/doors/_lib/door-leaves"
import type { DoorPose } from "@/museum/gallery/doors/_lib/door-motion"
import { poseHiddenDoor } from "@/museum/gallery/doors/_lib/door-posing"
import {
  createSeamMaterial,
  hiddenLeafGeometry,
  seamGeometry,
} from "@/museum/gallery/doors/_lib/hidden-door-geometry"
import { dadoPanelMaterial } from "@/museum/gallery/mouldings/_lib/panel-material"
import { useCallback, useEffect, useMemo, useRef } from "react"
import type { Group, Mesh } from "three"

type HiddenDoorProps = {
  door: DoorSpot
  isStill: boolean
  texturedSurfaces: ReadonlySet<Surface>
}

function buildHiddenDoor(door: DoorSpot) {
  const leaf = hiddenLeaf(door)
  const seam = { value: 0 }
  return {
    leaf,
    geometry: hiddenLeafGeometry(leaf),
    seam,
    seamGeometry: door.kind === "wallpaper" ? seamGeometry(door) : null,
    seamMaterial: createSeamMaterial(seam),
  }
}

// A door that is part of the wall: the corridor's end panel or the
// boudoir's wallpaper door. When its lock is met it swings open with a creak;
// the wallpaper door first shows a seam of light round its edges.
export function HiddenDoor({
  door,
  isStill,
  texturedSurfaces,
}: HiddenDoorProps) {
  const parts = useMemo(() => buildHiddenDoor(door), [door])
  const leafRef = useRef<Group>(null)
  const seamRef = useRef<Mesh>(null)
  const [near, far] = door.rooms
  // Plain colours until the gallery has painted the surface's textures.
  const finish = (surface: Surface) =>
    texturedSurfaces.has(surface)
      ? surfaceMaterial(surface)
      : plainMaterial(surface === "wood" ? "door" : "wall")

  useEffect(() => {
    const { geometry, seamGeometry: seam, seamMaterial } = parts
    return () => {
      for (const part of Object.values(geometry)) {
        part.dispose()
      }
      seam?.dispose()
      seamMaterial.dispose()
    }
  }, [parts])

  const apply = useCallback(
    (pose: DoorPose) => {
      poseHiddenDoor(parts, leafRef.current, seamRef.current, pose)
    },
    [parts]
  )

  useDoorOpening(
    door,
    useMemo(() => [parts.leaf], [parts]),
    isStill,
    apply
  )

  return (
    <group position={door.position} rotation-y={door.rotationY}>
      <group ref={leafRef} position={parts.leaf.hinge}>
        <mesh
          geometry={parts.geometry.front}
          material={finish(roomOf(near).look.wallpaper)}
        />
        <mesh
          geometry={parts.geometry.back}
          material={finish(roomOf(far).look.wallpaper)}
        />
        <mesh geometry={parts.geometry.carved} material={finish("wood")} />
        <mesh
          geometry={parts.geometry.field}
          material={
            texturedSurfaces.has("wood")
              ? dadoPanelMaterial()
              : plainMaterial("door")
          }
        />
      </group>
      {parts.seamGeometry ? (
        <mesh
          ref={seamRef}
          geometry={parts.seamGeometry}
          material={parts.seamMaterial}
          renderOrder={2}
          visible={false}
        />
      ) : null}
    </group>
  )
}
