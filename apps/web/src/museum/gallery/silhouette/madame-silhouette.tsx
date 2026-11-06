import { playRustle } from "@/museum/gallery/silhouette/_lib/rustle"
import {
  silhouetteGeometry,
  silhouetteMaterials,
} from "@/museum/gallery/silhouette/_lib/silhouette-figure"
import {
  isInCouloir,
  passage,
  posePassage,
} from "@/museum/gallery/silhouette/_lib/silhouette-passage"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import { Vector3, type Group } from "three"

type MadameSilhouetteProps = {
  isStill: boolean
}

// The visit she was last seen on: once per visit, even if the corridor
// remounts.
let seenOnVisit: number | null = null
const forward = new Vector3()

// Madame herself, once: a dark veiled woman seen from behind, slipping
// across behind the last veil of the corridor and gone in a breath. Quiet,
// never a face. Under reduced motion she only fades in and out.
export function MadameSilhouette({ isStill }: MadameSilhouetteProps) {
  const groupRef = useRef<Group>(null)
  const presence = useMemo(() => ({ value: 0 }), [])
  const geometry = useMemo(() => silhouetteGeometry(), [])
  const materials = useMemo(() => silhouetteMaterials(presence), [presence])
  // Seconds since she appeared; null before and after.
  const timeRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      geometry.body.dispose()
      geometry.veil.dispose()
      materials.body.dispose()
      materials.veil.dispose()
    },
    [geometry, materials]
  )

  useFrame(({ camera }, delta) => {
    const group = groupRef.current
    if (!group) {
      return
    }
    const time = timeRef.current
    if (time === null) {
      const { visits } = useStoryStore.getState()
      if (seenOnVisit === visits) {
        return
      }
      const { x, z } = camera.position
      camera.getWorldDirection(forward)
      if (
        !isInCouloir(x, z) ||
        x < passage.halfway ||
        forward.x < passage.lookingAhead
      ) {
        return
      }
      seenOnVisit = visits
      timeRef.current = 0
      group.visible = true
      playRustle()
      return
    }
    const now = time + Math.min(delta, 0.1)
    posePassage(group, presence, now, isStill)
    if (now >= passage.duration) {
      timeRef.current = null
      group.visible = false
      return
    }
    timeRef.current = now
  })

  return (
    <group ref={groupRef} rotation-y={passage.turn} visible={false}>
      <mesh
        geometry={geometry.body}
        material={materials.body}
        renderOrder={1}
      />
      <mesh
        geometry={geometry.veil}
        material={materials.veil}
        renderOrder={1}
      />
    </group>
  )
}
