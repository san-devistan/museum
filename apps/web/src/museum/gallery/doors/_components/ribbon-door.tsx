import { doorWoodMaterial } from "@/museum/entrance/_lib/door-materials"
import { buildDoorRibbon } from "@/museum/entrance/_lib/door-ribbon"
import { eyeletMaterial } from "@/museum/entrance/_lib/entrance-assets"
import {
  ironMaterial,
  pearlMaterial,
} from "@/museum/entrance/_lib/manor-materials"
import { ribbonKnot } from "@/museum/entrance/_lib/ribbon-layout"
import { doorSatinMaterial } from "@/museum/entrance/_lib/satin-material"
import type { DoorSpot } from "@/museum/gallery/_lib/manor-plan"
import { useDoorOpening } from "@/museum/gallery/doors/_hooks/use-door-opening"
import { ribbonLeaves } from "@/museum/gallery/doors/_lib/door-leaves"
import type { DoorPose } from "@/museum/gallery/doors/_lib/door-motion"
import {
  poseRibbonDoor,
  type RibbonDoorRig,
} from "@/museum/gallery/doors/_lib/door-posing"
import {
  carvedLeaf,
  ribbonFit,
} from "@/museum/gallery/doors/_lib/ribbon-door-geometry"
import { useCallback, useEffect, useMemo, useRef } from "react"

type RibbonDoorProps = {
  door: DoorSpot
  isStill: boolean
}

const faces = [1, -1] as const

function buildRibbonDoor(door: DoorSpot) {
  const leaves = ribbonLeaves(door).map((leaf) => ({
    leaf,
    geometry: carvedLeaf(leaf),
  }))
  const first = leaves[0]?.leaf
  const faceZ = (first?.hinge[2] ?? 0) + (first?.depth ?? 0)
  return {
    leaves,
    satin: buildDoorRibbon(),
    fit: first ? ribbonFit(first, faceZ) : { scale: 1, z: 0 },
    // Its own copy, so this ribbon fades on its own.
    ribbon: doorSatinMaterial.clone(),
  }
}

// A dark carved double door laced shut with the front door's satin ribbon,
// on both faces. When its lock is met the ribbon loosens, slides off and
// falls, then the leaves creak open and stay open.
export function RibbonDoor({ door, isStill }: RibbonDoorProps) {
  const parts = useMemo(() => buildRibbonDoor(door), [door])
  const rigRef = useRef<RibbonDoorRig>({
    leafGroups: [],
    ribbons: [],
    bows: [],
    lacingMeshes: [],
    bowMeshes: [],
  })

  useEffect(() => {
    const { leaves, satin, ribbon } = parts
    return () => {
      for (const { geometry } of leaves) {
        for (const part of Object.values(geometry)) {
          part.dispose()
        }
      }
      satin.lacing.dispose()
      satin.bow.dispose()
      ribbon.dispose()
    }
  }, [parts])

  const apply = useCallback(
    (pose: DoorPose) => {
      poseRibbonDoor(parts, rigRef.current, pose, isStill)
    },
    [parts, isStill]
  )

  useDoorOpening(
    door,
    useMemo(() => parts.leaves.map(({ leaf }) => leaf), [parts]),
    isStill,
    apply
  )

  return (
    <group position={door.position} rotation-y={door.rotationY}>
      {parts.leaves.map(({ leaf, geometry }, index) => (
        <group
          key={leaf.sign}
          ref={(group) => {
            rigRef.current.leafGroups[index] = group
          }}
          position={leaf.hinge}
        >
          <mesh geometry={geometry.wood} material={doorWoodMaterial} />
          <mesh geometry={geometry.pearl} material={pearlMaterial} />
          <mesh geometry={geometry.iron} material={ironMaterial} />
          <mesh geometry={geometry.eyelets} material={eyeletMaterial} />
        </group>
      ))}
      {faces.map((face, index) => (
        <group key={face} scale-z={face}>
          <group position-z={parts.fit.z} scale={parts.fit.scale}>
            <group
              ref={(group) => {
                rigRef.current.ribbons[index] = group
              }}
            >
              <mesh
                ref={(mesh) => {
                  rigRef.current.lacingMeshes[index] = mesh
                }}
                geometry={parts.satin.lacing}
                material={parts.ribbon}
              />
              <group
                ref={(group) => {
                  rigRef.current.bows[index] = group
                }}
                position={ribbonKnot.center}
              >
                <mesh
                  ref={(mesh) => {
                    rigRef.current.bowMeshes[index] = mesh
                  }}
                  geometry={parts.satin.bow}
                  material={parts.ribbon}
                />
              </group>
            </group>
          </group>
        </group>
      ))}
    </group>
  )
}
