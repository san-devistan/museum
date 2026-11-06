import { pearlMaterial } from "@/museum/entrance/_lib/manor-materials"
import { chandelierSpots, roomOf } from "@/museum/gallery/_lib/manor-plan"
import { pileHeight } from "@/museum/gallery/carpet/carpet-pile"
import { useChapterAwakening } from "@/museum/gallery/transformations/_hooks/use-chapter-awakening"
import { chapterPose } from "@/museum/gallery/transformations/_lib/chapter-pose"
import {
  frostWashMaterials,
  riseFrost,
} from "@/museum/gallery/transformations/_lib/frost-wash"
import {
  lowerLength,
  pearlBead,
  pearlCount,
  pearlStrings,
  writePearls,
} from "@/museum/gallery/transformations/_lib/pearl-strings"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import { PlaneGeometry, type Group, type InstancedMesh } from "three"

type DedansFrostProps = {
  isStill: boolean
}

const boudoir = roomOf("boudoir")
const { minX, maxX, minZ } = boudoir.bounds
const wallWidth = maxX - minX
const wallHeight = boudoir.bounds.height
const poolDepth = 1.6

const wallGeometry = new PlaneGeometry(wallWidth, wallHeight)
const floorGeometry = new PlaneGeometry(wallWidth, poolDepth).rotateX(
  -Math.PI / 2
)
const chandelier = chandelierSpots.find((spot) => spot.room === "boudoir")

// When II · Le Dedans is awake, a frost-blue light washes the Boudoir's back
// wall and strings of pearls lower slowly from its chandelier. Under
// reduced motion the pearls simply hang there.
export function DedansFrost({ isStill }: DedansFrostProps) {
  const groupRef = useRef<Group>(null)
  const pearlsRef = useRef<InstancedMesh>(null)
  const awakening = useChapterAwakening("dedans")
  const level = useMemo(() => ({ value: 0 }), [])
  const wash = useMemo(() => frostWashMaterials(level), [level])
  const strings = useMemo(
    () => (chandelier ? pearlStrings(chandelier) : []),
    []
  )
  const count = useMemo(() => pearlCount(strings), [strings])
  const length = useMemo(() => lowerLength(strings), [strings])
  // The pose last written: null hidden, Infinity settled.
  const shownRef = useRef<number | null | undefined>(undefined)

  useEffect(
    () => () => {
      wash.wall.dispose()
      wash.floor.dispose()
    },
    [wash]
  )

  useFrame(() => {
    const group = groupRef.current
    const pearls = pearlsRef.current
    if (!group || !pearls) {
      return
    }
    const pose = chapterPose(awakening.current, length, isStill)
    if (pose === shownRef.current && (pose === null || pose === Infinity)) {
      return
    }
    shownRef.current = pose
    group.visible = pose !== null
    if (pose === null) {
      return
    }
    riseFrost(level, pose)
    writePearls(strings, pose, isStill, pearls.instanceMatrix.array)
    pearls.instanceMatrix.needsUpdate = true
    if (pose === Infinity) {
      pearls.computeBoundingSphere()
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        geometry={wallGeometry}
        material={wash.wall}
        position={[(minX + maxX) / 2, wallHeight / 2, minZ + 0.006]}
        renderOrder={2}
      />
      <mesh
        geometry={floorGeometry}
        material={wash.floor}
        position={[(minX + maxX) / 2, pileHeight + 0.004, minZ + poolDepth / 2]}
        renderOrder={2}
      />
      <instancedMesh
        ref={pearlsRef}
        args={[pearlBead, pearlMaterial, count]}
        frustumCulled={false}
      />
    </group>
  )
}
