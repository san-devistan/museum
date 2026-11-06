import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import { candleFlicker } from "@/museum/gallery/candles/_lib/candle-flicker"
import { candleMaterials } from "@/museum/gallery/candles/_lib/candle-materials"
import {
  chandelierGeometry,
  flameMaterial,
  haloMaterial,
} from "@/museum/gallery/chandelier/_lib/chandelier-assets"
import { propMaterials } from "@/museum/gallery/props/_lib/prop-materials"
import {
  cakeSpot,
  candelabraSpot,
  herPlace,
  table,
} from "@/museum/gallery/props/dining-table/_lib/dining-layout"
import {
  buildCakeSlice,
  buildFlowerCake,
} from "@/museum/gallery/props/dining-table/_lib/flower-cake"
import {
  buildPlaceCard,
  placeCardTexture,
} from "@/museum/gallery/props/dining-table/_lib/place-card"
import {
  buildChairVelvet,
  buildTablecloth,
  buildTableWood,
} from "@/museum/gallery/props/dining-table/_lib/table-geometry"
import {
  buildCandles,
  buildGlasses,
  buildNapkins,
  buildPorcelain,
  buildSilverware,
  buildWine,
  candelabraCups,
  candleHeights,
  standTop,
} from "@/museum/gallery/props/dining-table/_lib/tableware-geometry"
import { useFrame } from "@react-three/fiber"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useLayoutEffect, useRef } from "react"
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from "three"

const { props, palette } = sceneTokens

const flame = { width: 0.034, height: 0.06 }

const flameBases = candelabraCups.map(
  (cup, index) =>
    new Vector3(
      candelabraSpot.x + cup.x,
      table.top + cup.y + (candleHeights[index] ?? 0.14) + 0.003,
      candelabraSpot.z + cup.z
    )
)

function haloGeometry() {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      flameBases.flatMap((base) => [
        base.x,
        base.y + flame.height * 0.45,
        base.z,
      ]),
      3
    )
  )
  return geometry
}

function createTableAssets() {
  const card = placeCardTexture()
  return {
    wood: buildTableWood(),
    velvet: buildChairVelvet(),
    cloth: buildTablecloth(),
    porcelain: buildPorcelain(),
    glasses: buildGlasses(),
    wine: buildWine(),
    silver: buildSilverware(),
    candles: buildCandles(),
    napkins: buildNapkins(),
    cake: buildFlowerCake(),
    slice: buildCakeSlice(),
    card: buildPlaceCard(),
    halos: haloGeometry(),
    cakeMaterial: new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      side: DoubleSide,
    }),
    wineMaterial: new MeshStandardMaterial({
      color: props.wine,
      roughness: 0.15,
      transparent: true,
      opacity: 0.9,
    }),
    cardMaterial: new MeshStandardMaterial({
      map: card,
      emissive: palette.white,
      emissiveMap: card,
      emissiveIntensity: 0.18,
      roughness: 0.9,
      side: DoubleSide,
    }),
  }
}

let assets: ReturnType<typeof createTableAssets> | null = null

function tableAssets() {
  assets ??= createTableAssets()
  return assets
}

const matrix = new Matrix4()
const scale = new Vector3()
const upright = new Quaternion()

function writeFlames(mesh: InstancedMesh, time: number) {
  for (let index = 0; index < flameBases.length; index += 1) {
    const base = flameBases[index]
    if (!base) {
      continue
    }
    const flicker = candleFlicker(time, index + 5)
    scale.set(
      flame.width * (1 - flicker * 0.5),
      flame.height * (1 + flicker * 1.4),
      flame.width * (1 - flicker * 0.5)
    )
    matrix.compose(base, upright, scale)
    mesh.setMatrixAt(index, matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}

type DiningTableProps = { isStill: boolean }

// Dinner for two, interrupted: lace cloth, lit candelabra, the gâteau-fleur
// missing the slice on her plate, her chair pulled back, and the guest's
// card, « L'invité de minuit ». The middle stays clear for the ikebanas.
export function DiningTable({ isStill }: DiningTableProps) {
  const parts = tableAssets()
  const materials = propMaterials()
  const flameRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const flames = flameRef.current
    if (!flames) {
      return undefined
    }
    writeFlames(flames, 0)
    flames.computeBoundingSphere()
    return undefined
  }, [])

  useFrame(() => {
    if (!isStill && flameRef.current) {
      writeFlames(flameRef.current, manorTime.value)
    }
  })

  return (
    <group>
      <mesh geometry={parts.wood} material={materials.wood} />
      <mesh geometry={parts.velvet} material={materials.velvet} />
      <mesh geometry={parts.cloth} material={materials.laceWhite} />
      <mesh geometry={parts.porcelain} material={materials.porcelain} />
      <mesh geometry={parts.silver} material={materials.silver} />
      <mesh geometry={parts.napkins} material={materials.linen} />
      <mesh geometry={parts.candles} material={candleMaterials().wax} />
      <mesh geometry={parts.card} material={parts.cardMaterial} />
      <mesh
        geometry={parts.cake}
        material={parts.cakeMaterial}
        position={[cakeSpot.x, table.top + standTop, cakeSpot.z]}
      />
      <mesh
        geometry={parts.slice}
        material={parts.cakeMaterial}
        position={[
          herPlace.plate.x + 0.02,
          table.top + 0.007,
          herPlace.plate.z + 0.03,
        ]}
        rotation-y={2.2}
        scale={0.9}
      />
      <mesh
        geometry={parts.wine}
        material={parts.wineMaterial}
        renderOrder={1}
      />
      <mesh
        geometry={parts.glasses}
        material={materials.glass}
        renderOrder={2}
      />
      <instancedMesh
        ref={flameRef}
        args={[chandelierGeometry.flame, flameMaterial, flameBases.length]}
      />
      <points
        geometry={parts.halos}
        material={haloMaterial}
        frustumCulled={false}
      />
    </group>
  )
}
