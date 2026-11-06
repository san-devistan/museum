import { reducedMotionQuery } from "@/museum/entrance/_lib/candle-flicker"
import {
  skyGeometry,
  skyMaterial,
  skyTime,
} from "@/museum/entrance/_lib/night-sky"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import type { Mesh } from "three"
import { useMediaQuery } from "usehooks-ts"

/**
 * The night over the manor: a dome that travels with the camera, so the
 * moon and clouds stay at infinity. Drawn after the opaque scene, so only
 * the open sky pays for its shader.
 */
export function NightSky() {
  const meshRef = useRef<Mesh>(null)
  const reducedMotion = useMediaQuery(reducedMotionQuery)

  useFrame(({ camera, clock }) => {
    meshRef.current?.position.copy(camera.position)
    skyTime.value = reducedMotion ? 0 : clock.elapsedTime
  })

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      geometry={skyGeometry}
      material={skyMaterial}
      renderOrder={1}
    />
  )
}
