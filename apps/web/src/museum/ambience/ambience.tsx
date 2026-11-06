import {
  createAmbienceSession,
  type AmbienceSession,
} from "@/museum/ambience/_lib/ambience-session"
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"

/** Night exterior, gallery room tone, footsteps and the odd unsettling sound. */
export function Ambience() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const sessionRef = useRef<AmbienceSession | null>(null)

  useEffect(() => {
    const session = createAmbienceSession(camera, scene)
    sessionRef.current = session
    return () => {
      sessionRef.current = null
      session.dispose()
    }
  }, [camera, scene])

  useFrame((_, delta) => {
    sessionRef.current?.update(delta)
  })

  return null
}
