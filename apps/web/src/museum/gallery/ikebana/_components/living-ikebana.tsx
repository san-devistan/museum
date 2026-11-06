import { useReducedMotion } from "@/museum/gallery/_hooks/use-reduced-motion"
import { IkebanaInstances } from "@/museum/gallery/ikebana/_components/ikebana-instances"
import { IkebanaPart } from "@/museum/gallery/ikebana/_components/ikebana-part"
import {
  beadGeometry,
  floretGeometry,
  ikebanaAssets,
} from "@/museum/gallery/ikebana/_lib/ikebana-assets"
import type { IkebanaVariant } from "@/museum/gallery/ikebana/_lib/ikebana-layout"
import {
  ikebanaMaterials,
  vesselMaterial,
} from "@/museum/gallery/ikebana/_lib/ikebana-materials"
import {
  attachLiving,
  createLivingParts,
  livingEntry,
} from "@/museum/gallery/ikebana/_lib/living-parts"
import { registerLiving } from "@/museum/gallery/ikebana/_lib/living-registry"
import type { LivingIkebanaRole } from "@/museum/gallery/ikebana/_lib/living-role"
import { tickLiving } from "@/museum/gallery/ikebana/_lib/living-tick"
import { tableScale } from "@/museum/gallery/ikebana/_lib/living-tuning"
import {
  tornPetalCount,
  tornPetalGeometry,
  tornPetalMaterial,
} from "@/museum/gallery/ikebana/_lib/torn-petals"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import type { Group, InstancedMesh } from "three"

type LivingIkebanaProps = {
  variant: IkebanaVariant
  role: LivingIkebanaRole
}

export function LivingIkebana({ variant, role }: LivingIkebanaProps) {
  const assets = ikebanaAssets(variant)
  const parts = useMemo(() => createLivingParts(variant, role), [variant, role])
  const groupRef = useRef<Group>(null)
  const petalsRef = useRef<InstancedMesh>(null)
  const isStill = useReducedMotion()
  const { materials, pollen, torn } = parts

  useEffect(() => () => parts.dispose(), [parts])
  useEffect(() => {
    const detach = attachLiving(parts, {
      group: groupRef.current,
      petals: petalsRef.current,
    })
    const unregister = registerLiving(parts.state.role, livingEntry(parts))
    return () => {
      unregister()
      detach()
    }
  }, [parts])

  useFrame((state, delta) => tickLiving(parts, state, delta, isStill))

  return (
    <group
      ref={groupRef}
      scale={parts.state.isTable ? tableScale : 1}
      dispose={null}
    >
      <IkebanaPart
        geometry={assets.vessel}
        material={vesselMaterial(variant)}
      />
      <IkebanaPart geometry={assets.stems} material={materials.stem} />
      <IkebanaPart
        geometry={assets.willow}
        material={ikebanaMaterials.willow}
      />
      <IkebanaPart geometry={assets.spathes} material={materials.lacquer} />
      <IkebanaPart geometry={assets.crystals} material={materials.crystal} />
      <IkebanaPart geometry={assets.spadices} material={materials.spadix} />
      <IkebanaPart geometry={assets.petals} material={materials.petal} />
      <IkebanaPart geometry={assets.alliumCores} material={materials.stem} />
      <IkebanaPart geometry={assets.moss} material={ikebanaMaterials.moss} />
      <IkebanaInstances
        geometry={floretGeometry}
        material={materials.floret}
        set={assets.florets}
      />
      <IkebanaInstances
        geometry={beadGeometry}
        material={ikebanaMaterials.bead}
        set={assets.beads}
      />
      {pollen ? (
        <points
          geometry={pollen.geometry}
          material={pollen.material}
          renderOrder={2}
        />
      ) : null}
      {torn ? (
        <instancedMesh
          ref={petalsRef}
          args={[tornPetalGeometry, tornPetalMaterial, tornPetalCount]}
          frustumCulled={false}
        />
      ) : null}
    </group>
  )
}
