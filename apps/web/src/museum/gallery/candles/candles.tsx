import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import type { RoomBounds } from "@/museum/gallery/_lib/room-bounds"
import { candleFlicker } from "@/museum/gallery/candles/_lib/candle-flicker"
import {
  buildCandleIron,
  candleGeometry,
  candleMatrices,
  dripGeometry,
  dripMatrices,
} from "@/museum/gallery/candles/_lib/candle-geometry"
import {
  candlesOf,
  glowSpotsOf,
  type Candle,
  type CandleSet,
  type GlowSpot,
} from "@/museum/gallery/candles/_lib/candle-layout"
import {
  candleMaterials,
  glowPlane,
} from "@/museum/gallery/candles/_lib/candle-materials"
import {
  chandelierGeometry,
  flameMaterial,
  haloMaterial,
  ironMaterial,
} from "@/museum/gallery/chandelier/_lib/chandelier-assets"
import { useFrame } from "@react-three/fiber"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react"
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Matrix4,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from "three"

type CandlesProps = {
  set: CandleSet
  bounds: RoomBounds
  isStill: boolean
}

const flame = { width: 0.042, height: 0.07, wick: 0.004 }

function haloGeometry(candles: readonly Candle[]) {
  const halos = new BufferGeometry()
  halos.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array(
        candles.flatMap((candle) => [
          candle.base.x,
          candle.base.y + candle.height + flame.height * 0.45,
          candle.base.z,
        ])
      ),
      3
    )
  )
  return halos
}

const matrix = new Matrix4()
const scale = new Vector3()
const position = new Vector3()
const upright = new Quaternion()
const facing = new Quaternion()
const planeNormal = new Vector3(0, 0, 1)
const warm = new Color(sceneTokens.manor.candleLight)
const tint = new Color()

function writeFlames(
  mesh: InstancedMesh,
  candles: readonly Candle[],
  time: number
) {
  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index]
    if (!candle) {
      continue
    }
    const flicker = candleFlicker(time, index)
    position.copy(candle.base).setY(candle.base.y + candle.height + flame.wick)
    scale.set(
      flame.width * (1 - flicker * 0.5),
      flame.height * (1 + flicker * 1.4),
      flame.width * (1 - flicker * 0.5)
    )
    matrix.compose(position, upright, scale)
    mesh.setMatrixAt(index, matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}

function writeGlows(
  mesh: InstancedMesh,
  spots: readonly GlowSpot[],
  time: number
) {
  for (let index = 0; index < spots.length; index += 1) {
    const flicker = candleFlicker(time * 0.8, index * 3)
    const strength = spots[index]?.strength ?? 0
    tint.copy(warm).multiplyScalar(strength * (1 + flicker * 1.6))
    mesh.setColorAt(index, tint)
  }
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true
  }
}

function placeGlows(mesh: InstancedMesh, spots: readonly GlowSpot[]) {
  spots.forEach((spot, index) => {
    facing.setFromUnitVectors(planeNormal, spot.normal)
    position.copy(spot.position).addScaledVector(spot.normal, 0.06)
    scale.set(spot.radius * 2, spot.radius * 2, 1)
    matrix.compose(position, facing, scale)
    mesh.setMatrixAt(index, matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingSphere()
}

function useInstanceMatrices(
  ref: RefObject<InstancedMesh | null>,
  array: Float32Array
) {
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) {
      return undefined
    }
    mesh.instanceMatrix.array.set(array)
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    return undefined
  }, [array, ref])
}

function useCandleParts(set: CandleSet, bounds: RoomBounds) {
  const parts = useMemo(() => {
    const candles = candlesOf(set)
    return {
      candles,
      glows: glowSpotsOf(set, bounds),
      iron: buildCandleIron(set),
      halos: haloGeometry(candles),
      candleMatrices: candleMatrices(candles),
      drips: dripMatrices(candles),
    }
  }, [set, bounds])

  useEffect(
    () => () => {
      parts.iron.dispose()
      parts.halos.dispose()
    },
    [parts]
  )

  return parts
}

// Wax candles in iron girandoles and torchères: flames and halos flicker on
// the manor clock, and additive glows fake the warm light they throw.
export function Candles({ set, bounds, isStill }: CandlesProps) {
  const parts = useCandleParts(set, bounds)
  const materials = candleMaterials()
  const candleRef = useRef<InstancedMesh>(null)
  const dripRef = useRef<InstancedMesh>(null)
  const flameRef = useRef<InstancedMesh>(null)
  const glowRef = useRef<InstancedMesh>(null)

  useInstanceMatrices(candleRef, parts.candleMatrices)
  useInstanceMatrices(dripRef, parts.drips.array)

  useLayoutEffect(() => {
    const flames = flameRef.current
    const glows = glowRef.current
    if (!flames || !glows) {
      return undefined
    }
    writeFlames(flames, parts.candles, 0)
    flames.computeBoundingSphere()
    placeGlows(glows, parts.glows)
    writeGlows(glows, parts.glows, 0)
    return undefined
  }, [parts])

  useFrame(() => {
    if (isStill || !flameRef.current || !glowRef.current) {
      return
    }
    writeFlames(flameRef.current, parts.candles, manorTime.value)
    writeGlows(glowRef.current, parts.glows, manorTime.value)
  })

  return (
    <group>
      <mesh geometry={parts.iron} material={ironMaterial} />
      <instancedMesh
        ref={candleRef}
        args={[candleGeometry, materials.wax, parts.candles.length]}
      />
      <instancedMesh
        ref={dripRef}
        args={[dripGeometry, materials.wax, parts.drips.count]}
      />
      <instancedMesh
        ref={flameRef}
        args={[chandelierGeometry.flame, flameMaterial, parts.candles.length]}
      />
      <points
        geometry={parts.halos}
        material={haloMaterial}
        frustumCulled={false}
      />
      <instancedMesh
        ref={glowRef}
        args={[glowPlane, materials.glow, parts.glows.length]}
        renderOrder={1}
      />
    </group>
  )
}
