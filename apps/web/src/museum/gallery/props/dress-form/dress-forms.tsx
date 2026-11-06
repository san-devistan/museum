import { asFabric } from "@/museum/gallery/props/_lib/fabric-shaders"
import { propMaterials } from "@/museum/gallery/props/_lib/prop-materials"
import type { PropSpot } from "@/museum/gallery/props/_lib/prop-spots"
import {
  buildCollar,
  buildDrape,
  buildFormStand,
  buildSash,
  buildTorso,
  drapeKinds,
} from "@/museum/gallery/props/dress-form/_lib/dress-form-geometry"
import {
  layoutDressForms,
  type InstanceBatch,
} from "@/museum/gallery/props/dress-form/_lib/dress-form-looks"
import { dressForm } from "@/museum/gallery/props/dress-form/_lib/dress-form-shape"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useLayoutEffect, useMemo, useRef } from "react"
import {
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
} from "three"

const { props, palette } = sceneTokens

function createDressFormAssets() {
  return {
    stand: buildFormStand(),
    torso: buildTorso(),
    drapes: {
      gown: buildDrape("gown"),
      "high-low": buildDrape("high-low"),
      veil: buildDrape("veil"),
    },
    collar: buildCollar(),
    sash: buildSash(),
    torsoMaterial: new MeshPhysicalMaterial({
      color: props.torso,
      roughness: 0.92,
      sheen: 0.6,
      sheenRoughness: 0.7,
      sheenColor: new Color(palette.blush).multiplyScalar(0.4),
    }),
    tulle: asFabric(
      new MeshStandardMaterial({
        transparent: true,
        opacity: 0.55,
        side: DoubleSide,
        depthWrite: false,
        roughness: 0.85,
      }),
      {
        sway: {
          key: "tulle",
          top: dressForm.waistY,
          length: 1.1,
          amount: [0.012, 0.01, 0.006],
          speed: 0.8,
        },
        isSheer: true,
      }
    ),
  }
}

let assets: ReturnType<typeof createDressFormAssets> | null = null

function dressFormAssets() {
  assets ??= createDressFormAssets()
  return assets
}

type BatchProps = {
  geometry: BufferGeometry
  material: Material
  batch: InstanceBatch
  renderOrder?: number
}

function Batch({ geometry, material, batch, renderOrder = 0 }: BatchProps) {
  const meshRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) {
      return undefined
    }
    mesh.instanceMatrix.array.set(batch.matrices)
    mesh.instanceMatrix.needsUpdate = true
    batch.colors.forEach((color, index) => mesh.setColorAt(index, color))
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
    mesh.computeBoundingSphere()
    return undefined
  }, [batch])

  if (batch.colors.length === 0) {
    return null
  }
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, batch.colors.length]}
      renderOrder={renderOrder}
    />
  )
}

type DressFormsProps = {
  spots: readonly PropSpot[]
}

// Madame's dress forms: turned stands, dark torsos and tulle in her
// palette, each varied by its seed. Every part is one instanced mesh.
export function DressForms({ spots }: DressFormsProps) {
  const parts = dressFormAssets()
  const materials = propMaterials()
  const layout = useMemo(() => layoutDressForms(spots), [spots])
  return (
    <group>
      <Batch
        geometry={parts.stand}
        material={materials.wood}
        batch={layout.forms}
      />
      <Batch
        geometry={parts.torso}
        material={parts.torsoMaterial}
        batch={layout.forms}
      />
      <Batch
        geometry={parts.collar}
        material={materials.laceWhite}
        batch={layout.collars}
      />
      <Batch
        geometry={parts.sash}
        material={materials.satin}
        batch={layout.sashes}
      />
      {drapeKinds.map((kind) => (
        <Batch
          key={kind}
          geometry={parts.drapes[kind]}
          material={parts.tulle}
          batch={layout.drapes[kind]}
          renderOrder={2}
        />
      ))}
    </group>
  )
}
