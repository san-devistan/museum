import { roomOf } from "@/museum/gallery/_lib/manor-plan"
import { useManorPresence } from "@/museum/gallery/_lib/manor-presence"
import {
  fillLevel,
  warmFill,
} from "@/museum/gallery/midnight/_lib/midnight-light"
import { useFrame } from "@react-three/fiber"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useRef } from "react"
import { Color, type HemisphereLight } from "three"

type ManorFillProps = {
  isLit: boolean
}

const fadeRate = 1.5
const tintRate = 0.8
const sky = new Color()
const ground = new Color()

// Faint bounce from the candles, so carved wood and damask read in the
// dark. One light for the whole manor: it takes on the palette of the room
// you are in, and fades in once inside.
export function ManorFill({ isLit }: ManorFillProps) {
  const lightRef = useRef<HemisphereLight>(null)

  useFrame((_, delta) => {
    const light = lightRef.current
    if (!light) {
      return
    }
    const { fill } = roomOf(useManorPresence.getState().roomId).palette
    const target = isLit ? fill.intensity * fillLevel() : 0
    const step = Math.min(1, delta * fadeRate)
    light.intensity += (target - light.intensity) * step
    const tint = Math.min(1, delta * tintRate)
    warmFill(sky.set(fill.sky), ground.set(fill.ground))
    light.color.lerp(sky, tint)
    light.groundColor.lerp(ground, tint)
  })

  return (
    <hemisphereLight
      ref={lightRef}
      args={[sceneTokens.manor.candleLight, sceneTokens.palette.wine, 0]}
    />
  )
}
