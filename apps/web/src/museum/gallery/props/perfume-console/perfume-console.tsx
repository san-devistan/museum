import { propMaterials } from "@/museum/gallery/props/_lib/prop-materials"
import {
  bottleHeight,
  bottleSpot,
  buildBottle,
  buildConsoleRibbon,
  buildConsoleWood,
  buildPearls,
  buildPerfume,
  buildSilver,
} from "@/museum/gallery/props/perfume-console/_lib/console-geometry"
import {
  buildShimmer,
  createShimmerMaterial,
} from "@/museum/gallery/props/perfume-console/_lib/scent-shimmer"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { MeshStandardMaterial } from "three"

function createConsoleAssets() {
  return {
    wood: buildConsoleWood(),
    bottle: buildBottle(),
    perfume: buildPerfume(),
    pearls: buildPearls(),
    silver: buildSilver(),
    ribbon: buildConsoleRibbon(),
    shimmer: buildShimmer(bottleSpot.clone().setY(bottleSpot.y + bottleHeight)),
    perfumeMaterial: new MeshStandardMaterial({
      color: sceneTokens.props.perfume,
      emissive: sceneTokens.props.perfume,
      emissiveIntensity: 0.22,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    }),
    shimmerMaterial: createShimmerMaterial(),
  }
}

let assets: ReturnType<typeof createConsoleAssets> | null = null

function consoleAssets() {
  assets ??= createConsoleAssets()
  return assets
}

// A narrow console holding her crystal perfume: blush scent behind cut
// glass, a pearl stopper, and a faint shimmer still hanging above it.
export function PerfumeConsole() {
  const parts = consoleAssets()
  const materials = propMaterials()
  return (
    <group>
      <mesh geometry={parts.wood} material={materials.wood} />
      <mesh geometry={parts.silver} material={materials.silver} />
      <mesh geometry={parts.pearls} material={materials.pearl} />
      <mesh geometry={parts.ribbon} material={materials.satinBlush} />
      <mesh
        geometry={parts.perfume}
        material={parts.perfumeMaterial}
        renderOrder={1}
      />
      <mesh
        geometry={parts.bottle}
        material={materials.glass}
        renderOrder={2}
      />
      <points
        geometry={parts.shimmer}
        material={parts.shimmerMaterial}
        frustumCulled={false}
        renderOrder={3}
      />
    </group>
  )
}
