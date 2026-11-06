import { IkebanaInstances } from "@/museum/gallery/ikebana/_components/ikebana-instances"
import { IkebanaPart } from "@/museum/gallery/ikebana/_components/ikebana-part"
import { LivingIkebana } from "@/museum/gallery/ikebana/_components/living-ikebana"
import {
  beadGeometry,
  floretGeometry,
  ikebanaAssets,
} from "@/museum/gallery/ikebana/_lib/ikebana-assets"
import type { IkebanaVariant } from "@/museum/gallery/ikebana/_lib/ikebana-layout"
import {
  ikebanaMaterials,
  syncReflections,
  vesselMaterial,
} from "@/museum/gallery/ikebana/_lib/ikebana-materials"
import type { LivingIkebanaRole } from "@/museum/gallery/ikebana/_lib/living-role"
import { useFrame } from "@react-three/fiber"

export type { IkebanaVariant } from "@/museum/gallery/ikebana/_lib/ikebana-layout"
export { ikebanaFootprint } from "@/museum/gallery/ikebana/_lib/ikebana-layout"

type IkebanaProps = {
  variant: IkebanaVariant
  // Makes it a living ikebana: its buds breathe, watch the visitor and, in
  // the role's room, whisper, bite or feed.
  living?: LivingIkebanaRole
}

export function Ikebana({ variant, living }: IkebanaProps) {
  const materials = ikebanaMaterials

  useFrame(({ scene }) => syncReflections(scene.environment))

  if (living) {
    return <LivingIkebana variant={variant} role={living} />
  }

  const assets = ikebanaAssets(variant)
  return (
    <group dispose={null}>
      <IkebanaPart
        geometry={assets.vessel}
        material={vesselMaterial(variant)}
      />
      <IkebanaPart geometry={assets.stems} material={materials.stem} />
      <IkebanaPart geometry={assets.willow} material={materials.willow} />
      <IkebanaPart geometry={assets.spathes} material={materials.lacquer} />
      <IkebanaPart geometry={assets.crystals} material={materials.crystal} />
      <IkebanaPart geometry={assets.spadices} material={materials.spadix} />
      <IkebanaPart geometry={assets.petals} material={materials.petal} />
      <IkebanaPart geometry={assets.alliumCores} material={materials.stem} />
      <IkebanaPart geometry={assets.moss} material={materials.moss} />
      <IkebanaInstances
        geometry={floretGeometry}
        material={materials.floret}
        set={assets.florets}
      />
      <IkebanaInstances
        geometry={beadGeometry}
        material={materials.bead}
        set={assets.beads}
      />
    </group>
  )
}
