import { roomOf } from "@/museum/gallery/_lib/manor-plan"
import { pileHeight } from "@/museum/gallery/carpet/carpet-pile"
import { galleryColliders } from "@/museum/gallery/gallery-colliders"
import { remnantAssets } from "@/museum/gallery/remnants/_lib/remnant-assets"
import { useChapterAwakening } from "@/museum/gallery/transformations/_hooks/use-chapter-awakening"
import { chapterPose } from "@/museum/gallery/transformations/_lib/chapter-pose"
import {
  fallLength,
  featherFalls,
  featherMatrix,
} from "@/museum/gallery/transformations/_lib/feather-fall"
import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { Matrix4, type InstancedMesh } from "three"

type EnvolFeathersProps = {
  isStill: boolean
}

const featherCount = 96
const matrix = new Matrix4()

// When I · L'Envol is awake, black feathers drift down along the Salon's
// walls and settle on its carpet, where they stay. Under reduced motion they
// are simply there.
export function EnvolFeathers({ isStill }: EnvolFeathersProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const awakening = useChapterAwakening("envol")
  const falls = useMemo(
    () =>
      featherFalls({
        bounds: roomOf("salon").bounds,
        count: featherCount,
        seed: 401,
        colliders: galleryColliders,
        floorY: pileHeight + 0.006,
      }),
    []
  )
  const length = useMemo(() => fallLength(falls), [falls])
  // The pose last written: null hidden, Infinity settled.
  const shownRef = useRef<number | null | undefined>(undefined)
  const { feather, featherMaterial } = remnantAssets()

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) {
      return
    }
    const pose = chapterPose(awakening.current, length, isStill)
    if (pose === shownRef.current && (pose === null || pose === Infinity)) {
      return
    }
    shownRef.current = pose
    mesh.visible = pose !== null
    if (pose === null) {
      return
    }
    for (let index = 0; index < falls.length; index += 1) {
      const fall = falls[index]
      if (fall) {
        mesh.setMatrixAt(index, featherMatrix(fall, pose, matrix))
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (pose === Infinity) {
      mesh.computeBoundingSphere()
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[feather, featherMaterial, falls.length]}
      frustumCulled={false}
      visible={false}
    />
  )
}
