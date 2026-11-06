import { propMaterials } from "@/museum/gallery/props/_lib/prop-materials"
import { mirrorTexture } from "@/museum/gallery/props/vanity/_lib/mirror-texture"
import {
  buildDish,
  buildLipstickBullet,
  buildLipstickCase,
  buildMirrorGlass,
  buildPuff,
  buildPuffBow,
  buildVanityWood,
  pearlMatrices,
} from "@/museum/gallery/props/vanity/_lib/vanity-geometry"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useLayoutEffect, useRef } from "react"
import {
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  type InstancedMesh,
} from "three"

const { props, palette } = sceneTokens

function createVanityAssets() {
  return {
    wood: buildVanityWood(),
    glass: buildMirrorGlass(),
    pearl: new SphereGeometry(1, 12, 8),
    pearls: pearlMatrices(),
    dish: buildDish(),
    puff: buildPuff(),
    puffBow: buildPuffBow(),
    lipstickCase: buildLipstickCase(),
    lipstick: buildLipstickBullet(),
    mirror: new MeshStandardMaterial({
      map: mirrorTexture(),
      metalness: 0.85,
      roughness: 0.22,
      envMapIntensity: 2.2,
      emissive: sceneTokens.manor.frost,
      emissiveIntensity: 0.025,
    }),
    puffMaterial: new MeshPhysicalMaterial({
      color: props.puff,
      roughness: 1,
      sheen: 1,
      sheenRoughness: 0.8,
      sheenColor: new Color(palette.white),
    }),
    lipstickMaterial: new MeshStandardMaterial({
      color: props.lipstick,
      roughness: 0.4,
    }),
  }
}

let assets: ReturnType<typeof createVanityAssets> | null = null

function vanityAssets() {
  assets ??= createVanityAssets()
  return assets
}

// Her vanity: an oval silvered mirror that shows nothing clearly, the
// pearls she took off, her powder puff and an open lipstick.
export function Vanity() {
  const parts = vanityAssets()
  const materials = propMaterials()
  const pearlRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = pearlRef.current
    if (!mesh) {
      return undefined
    }
    mesh.instanceMatrix.array.set(parts.pearls)
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    return undefined
  }, [parts.pearls])

  return (
    <group>
      <mesh geometry={parts.wood} material={materials.wood} />
      <mesh geometry={parts.glass} material={parts.mirror} />
      <instancedMesh
        ref={pearlRef}
        args={[parts.pearl, materials.pearl, parts.pearls.length / 16]}
      />
      <mesh geometry={parts.dish} material={materials.porcelain} />
      <mesh geometry={parts.puff} material={parts.puffMaterial} />
      <mesh geometry={parts.puffBow} material={materials.satin} />
      <mesh geometry={parts.lipstickCase} material={materials.silver} />
      <mesh geometry={parts.lipstick} material={parts.lipstickMaterial} />
    </group>
  )
}
