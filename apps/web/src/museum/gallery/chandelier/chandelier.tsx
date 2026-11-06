import {
  candleMaterial,
  chandelierGeometry,
  crystalMaterial,
  flameMaterial,
  haloMaterial,
  ironMaterial,
} from "@/museum/gallery/chandelier/_lib/chandelier-assets"
import {
  crystalInstances,
  flamePositions,
} from "@/museum/gallery/chandelier/_lib/chandelier-crystals"
import { chandelierLayout } from "@/museum/gallery/chandelier/_lib/chandelier-layout"
import { ChandelierWebs } from "@/museum/gallery/cobwebs/cobwebs"
import { useFrame } from "@react-three/fiber"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useLayoutEffect, useMemo, useRef } from "react"
import {
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type PointLight,
  type Texture,
} from "three"

export { chandelierSize } from "@/museum/gallery/chandelier/_lib/chandelier-layout"

type ChandelierProps = {
  position: [number, number, number]
  scale?: number
  isFixtureVisible?: boolean
  isStill?: boolean
  isWebbed?: boolean
  // Off when the room lights it separately (see RoomLights).
  hasLight?: boolean
}

// A slow pendulum from the ceiling rose, as if something brushed past.
const sway = { x: 0.011, z: 0.008, speedX: 0.47, speedZ: 0.36 }

type CrystalGroupProps = {
  geometry: BufferGeometry
  instances: { count: number; matrices: Float32Array }
}

const flameMatrix = new Matrix4()
const flameScale = new Vector3()
const flameRotation = new Quaternion()

function phaseFrom([x, y, z]: readonly [number, number, number]) {
  const seed = Math.sin(x * 12.9898 + y * 4.1414 + z * 78.233) * 43758.5453
  return (seed - Math.floor(seed)) * 100
}

function writeFlames(mesh: InstancedMesh, time: number) {
  const { width, height } = chandelierLayout.flame
  flamePositions.forEach((position, index) => {
    const flicker =
      Math.sin(time * 9.1 + index * 1.7) * 0.1 +
      Math.sin(time * 23.3 + index * 2.9) * 0.05
    flameScale.set(width * (1 - flicker * 0.4), height * (1 + flicker), width)
    flameMatrix.compose(position, flameRotation, flameScale)
    mesh.setMatrixAt(index, flameMatrix)
  })
  mesh.instanceMatrix.needsUpdate = true
}

function syncCrystalEnvironment(environment: Texture | null) {
  if (crystalMaterial.envMap === environment) {
    return
  }
  crystalMaterial.envMap = environment
  crystalMaterial.needsUpdate = true
}

function CrystalGroup({ geometry, instances }: CrystalGroupProps) {
  const meshRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) {
      return undefined
    }
    mesh.instanceMatrix.array.set(instances.matrices)
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    return undefined
  }, [instances])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, crystalMaterial, instances.count]}
    />
  )
}

export function Chandelier({
  position,
  scale = 1,
  isFixtureVisible = true,
  isStill = false,
  isWebbed = false,
  hasLight = true,
}: ChandelierProps) {
  const lightRef = useRef<PointLight>(null)
  const swayRef = useRef<Group>(null)
  const flamesRef = useRef<InstancedMesh>(null)
  const timeRef = useRef(0)
  const phase = useMemo(() => phaseFrom(position), [position])
  const { light, lightY } = chandelierLayout

  useLayoutEffect(() => {
    const flames = flamesRef.current
    if (!flames) {
      return undefined
    }
    writeFlames(flames, phase)
    flames.computeBoundingSphere()
    return undefined
  }, [phase])

  useFrame(({ scene }, delta) => {
    syncCrystalEnvironment(scene.environment)
    if (!isFixtureVisible || isStill) {
      return
    }
    timeRef.current += delta
    if (swayRef.current) {
      const swayTime = timeRef.current
      swayRef.current.rotation.x = Math.sin(swayTime * sway.speedX) * sway.x
      swayRef.current.rotation.z =
        Math.sin(swayTime * sway.speedZ + 1.1) * sway.z
    }
    const time = timeRef.current + phase
    const flicker =
      Math.sin(time * 7.3) * 0.045 + Math.sin(time * 17.9 + 1.3) * 0.025
    if (lightRef.current) {
      lightRef.current.intensity = light.intensity * (1 + flicker)
    }
    if (flamesRef.current) {
      writeFlames(flamesRef.current, time)
    }
  })

  return (
    <group position={position} scale={scale}>
      <group ref={swayRef}>
        <group visible={isFixtureVisible}>
          {isWebbed ? <ChandelierWebs /> : null}
          <mesh geometry={chandelierGeometry.iron} material={ironMaterial} />
          <mesh
            geometry={chandelierGeometry.crystalBody}
            material={crystalMaterial}
          />
          <mesh
            geometry={chandelierGeometry.candles}
            material={candleMaterial}
          />
          <instancedMesh
            ref={flamesRef}
            args={[
              chandelierGeometry.flame,
              flameMaterial,
              flamePositions.length,
            ]}
          />
          <points
            geometry={chandelierGeometry.halos}
            material={haloMaterial}
            frustumCulled={false}
          />
          <CrystalGroup
            geometry={chandelierGeometry.bead}
            instances={crystalInstances.beads}
          />
          <CrystalGroup
            geometry={chandelierGeometry.drop}
            instances={crystalInstances.drops}
          />
          <CrystalGroup
            geometry={chandelierGeometry.ball}
            instances={crystalInstances.balls}
          />
        </group>
        {hasLight ? (
          <pointLight
            ref={lightRef}
            color={sceneTokens.color.lightWarm}
            decay={light.decay}
            distance={light.distance}
            intensity={light.intensity}
            position-y={lightY}
          />
        ) : null}
      </group>
    </group>
  )
}
