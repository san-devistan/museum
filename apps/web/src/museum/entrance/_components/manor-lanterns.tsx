import { StaticInstances } from "@/museum/entrance/_components/static-instances"
import {
  candleFlicker,
  reducedMotionQuery,
} from "@/museum/entrance/_lib/candle-flicker"
import {
  lanternGeometry,
  lanternMatrices,
} from "@/museum/entrance/_lib/lantern-geometry"
import {
  lanternBody,
  lanternLight,
  lanterns,
} from "@/museum/entrance/_lib/manor-layout"
import {
  flameMaterial,
  ironMaterial,
  lanternGlassMaterial,
  satinMaterial,
  waxMaterial,
} from "@/museum/entrance/_lib/manor-materials"
import { useFrame } from "@react-three/fiber"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useLayoutEffect, useRef } from "react"
import {
  Matrix4,
  Quaternion,
  Vector3,
  type InstancedMesh,
  type PointLight,
} from "three"
import { useMediaQuery } from "usehooks-ts"

const lanternInstances = { count: lanterns.length, matrices: lanternMatrices }
const flame = { width: 0.011, height: 0.03 }
const glassGlow = lanternGlassMaterial.emissiveIntensity
const flameMatrix = new Matrix4()
const flamePosition = new Vector3()
const flameScale = new Vector3()
const flameRotation = new Quaternion()

/** The entrance sequence fades lights by `baseIntensity`; we flicker it. */
const lanternLightData = lanterns.map(() => ({
  baseIntensity: lanternLight.intensity,
}))

function flickerAt(time: number, phase: number, isStill: boolean) {
  return isStill ? 1 : candleFlicker(time, phase)
}

function writeFlames(mesh: InstancedMesh, time: number, isStill: boolean) {
  let total = 0
  for (let index = 0; index < lanterns.length; index += 1) {
    const lantern = lanterns[index]
    if (lantern) {
      const level = flickerAt(time, lantern.phase, isStill)
      const [x, y, z] = lantern.center
      flamePosition.set(x, y + lanternBody.flameY, z)
      flameScale.set(
        flame.width * (1.6 - level * 0.6),
        flame.height * level,
        flame.width * (1.6 - level * 0.6)
      )
      flameMatrix.compose(flamePosition, flameRotation, flameScale)
      mesh.setMatrixAt(index, flameMatrix)
      total += level
    }
  }
  mesh.instanceMatrix.needsUpdate = true
  lanternGlassMaterial.emissiveIntensity = (glassGlow * total) / lanterns.length
}

/** Wrought-iron hanging lanterns either side of the portal. */
export function ManorLanterns() {
  const flamesRef = useRef<InstancedMesh>(null)
  const reducedMotion = useMediaQuery(reducedMotionQuery)

  useLayoutEffect(() => {
    const flames = flamesRef.current
    if (!flames) {
      return undefined
    }
    writeFlames(flames, 0, true)
    flames.computeBoundingSphere()
    return undefined
  }, [])

  useFrame(({ clock }) => {
    if (flamesRef.current) {
      writeFlames(flamesRef.current, clock.elapsedTime, reducedMotion)
    }
  })

  return (
    <group>
      <StaticInstances
        geometry={lanternGeometry.iron}
        instances={lanternInstances}
        material={ironMaterial}
      />
      <StaticInstances
        geometry={lanternGeometry.bow}
        instances={lanternInstances}
        material={satinMaterial}
      />
      <StaticInstances
        geometry={lanternGeometry.candle}
        instances={lanternInstances}
        material={waxMaterial}
      />
      <instancedMesh
        ref={flamesRef}
        args={[lanternGeometry.flame, flameMaterial, lanterns.length]}
      />
      <StaticInstances
        geometry={lanternGeometry.glass}
        instances={lanternInstances}
        material={lanternGlassMaterial}
      />
    </group>
  )
}

/**
 * The lanterns' candlelight. Rendered straight into the exterior lights group
 * so the entrance sequence can fade it with the rest.
 */
export function LanternLights() {
  const lightsRef = useRef<(PointLight | null)[]>([])
  const reducedMotion = useMediaQuery(reducedMotionQuery)

  useFrame(({ clock }) => {
    for (let index = 0; index < lanterns.length; index += 1) {
      const light = lightsRef.current[index]
      const lantern = lanterns[index]
      if (light && lantern) {
        light.userData.baseIntensity =
          lanternLight.intensity *
          flickerAt(clock.elapsedTime, lantern.phase, reducedMotion)
      }
    }
  })

  return (
    <>
      {lanterns.map((lantern, index) => (
        <pointLight
          key={lantern.id}
          ref={(light) => {
            lightsRef.current[index] = light
          }}
          color={sceneTokens.facade.candle}
          decay={lanternLight.decay}
          distance={lanternLight.distance}
          intensity={lanternLight.intensity}
          position={[
            lantern.center[0],
            lantern.center[1] + lanternBody.flameY,
            lantern.center[2],
          ]}
          userData={lanternLightData[index]}
        />
      ))}
    </>
  )
}
