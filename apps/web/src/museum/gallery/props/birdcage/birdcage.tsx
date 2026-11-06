import { propMaterials } from "@/museum/gallery/props/_lib/prop-materials"
import {
  buildCage,
  buildCageStand,
  featherSpot,
} from "@/museum/gallery/props/birdcage/_lib/cage-geometry"
import { remnantAssets } from "@/museum/gallery/remnants/_lib/remnant-assets"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { MeshStandardMaterial } from "three"

function createCageAssets() {
  return {
    stand: buildCageStand(),
    cage: buildCage(),
    paint: new MeshStandardMaterial({
      color: sceneTokens.props.cagePaint,
      roughness: 0.55,
      metalness: 0.2,
    }),
  }
}

let assets: ReturnType<typeof createCageAssets> | null = null

function cageAssets() {
  assets ??= createCageAssets()
  return assets
}

// An empty domed birdcage, painted ivory, on its black iron stand: the
// door left open, the swing still, one black feather on its floor.
export function Birdcage() {
  const { stand, cage, paint } = cageAssets()
  const materials = propMaterials()
  const { feather, featherMaterial } = remnantAssets()
  return (
    <group>
      <mesh geometry={stand} material={materials.iron} />
      <mesh geometry={cage} material={paint} />
      <mesh
        geometry={feather}
        material={featherMaterial}
        position={[...featherSpot.position]}
        rotation-y={featherSpot.turn}
        scale={featherSpot.scale}
      />
    </group>
  )
}
