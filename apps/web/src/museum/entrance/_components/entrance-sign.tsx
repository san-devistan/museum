import { useMuseumStore } from "@/museum/_lib/museum-store"
import { entranceSign } from "@/museum/entrance/_lib/entrance-layout"
import { signAspect } from "@/museum/entrance/_lib/entrance-sign"
import { frameDelta } from "@/museum/entrance/_lib/entrance-timeline"
import {
  createNeonSign,
  disposeNeonSign,
  neonLight,
  stepNeonSign,
} from "@/museum/entrance/_lib/neon-sign"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { useFrame } from "@react-three/fiber"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useEffect, useMemo, useRef } from "react"
import type { PointLight } from "three"
import { useMediaQuery } from "usehooks-ts"

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

export function EntranceSign() {
  const sign = useMemo(() => createNeonSign(), [])
  const lightRef = useRef<PointLight>(null)
  const reducedMotion = useMediaQuery(reducedMotionQuery)

  useEffect(() => () => disposeNeonSign(sign), [sign])

  useFrame(({ camera }, delta) => {
    stepNeonSign(sign, {
      phase: useMuseumStore.getState().phase,
      cameraZ: camera.position.z,
      delta: frameDelta(delta),
      reducedMotion,
      isHealed: useStoryStore.getState().midnight,
    })
    if (lightRef.current) {
      lightRef.current.intensity = sign.lightIntensity
    }
  })

  return (
    <group>
      <mesh
        material={sign.shader.material}
        position={entranceSign.center}
        scale={[entranceSign.width, entranceSign.width / signAspect, 1]}
        visible={sign.painter.layers !== null}
      >
        <planeGeometry />
      </mesh>
      <points
        frustumCulled={false}
        geometry={sign.sparks.geometry}
        material={sign.sparks.material}
      />
      <pointLight
        ref={lightRef}
        color={sceneTokens.neon.glow}
        decay={neonLight.decay}
        distance={neonLight.distance}
        intensity={0}
        position={neonLight.position}
      />
    </group>
  )
}
