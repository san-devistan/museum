import {
  surfaceMaterial,
  unitGeometry,
} from "@/museum/entrance/_lib/entrance-assets"
import type { SceneSolid } from "@/museum/entrance/_lib/entrance-layout"
import type { Material } from "three"

type SceneSolidsProps = {
  solids: readonly SceneSolid[]
  material?: Material
}

export function SceneSolids({ solids, material }: SceneSolidsProps) {
  return solids.map((solid) => (
    <mesh
      key={solid.id}
      geometry={unitGeometry[solid.shape]}
      material={material ?? surfaceMaterial(solid.color)}
      position={solid.center}
      scale={solid.size}
    />
  ))
}
