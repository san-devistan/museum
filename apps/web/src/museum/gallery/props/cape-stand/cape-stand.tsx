import { propMaterials } from "@/museum/gallery/props/_lib/prop-materials"
import {
  buildCapeBow,
  buildCapeLace,
  buildCapeStand,
} from "@/museum/gallery/props/cape-stand/_lib/cape-geometry"

function createCapeAssets() {
  return {
    stand: buildCapeStand(),
    lace: buildCapeLace(),
    bow: buildCapeBow(),
  }
}

let assets: ReturnType<typeof createCapeAssets> | null = null

function capeAssets() {
  assets ??= createCapeAssets()
  return assets
}

// Madame's black lace cape left on its turned stand, drifting faintly as if
// she had only just slipped out of it.
export function CapeStand() {
  const { stand, lace, bow } = capeAssets()
  const materials = propMaterials()
  return (
    <group>
      <mesh geometry={stand} material={materials.wood} />
      <mesh geometry={lace} material={materials.capeLace} />
      <mesh geometry={bow} material={materials.satin} />
    </group>
  )
}
