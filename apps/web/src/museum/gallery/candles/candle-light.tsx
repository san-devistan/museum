import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import type { Point3 } from "@/museum/gallery/_lib/room-bounds"
import { candleFlicker } from "@/museum/gallery/candles/_lib/candle-flicker"
import { useFrame } from "@react-three/fiber"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useRef } from "react"
import type { PointLight } from "three"

type CandleLightProps = {
  position: Point3
  isLit: boolean
  isStill: boolean
  intensity?: number
  distance?: number
}

// The one real light a room's candles get. Mount it from the start (unlit)
// so the scene's light count never changes while the room fills in.
export function CandleLight({
  position,
  isLit,
  isStill,
  intensity = 1.8,
  distance = 9,
}: CandleLightProps) {
  const lightRef = useRef<PointLight>(null)

  useFrame(() => {
    const light = lightRef.current
    if (!light) {
      return
    }
    const flicker = isStill ? 0 : candleFlicker(manorTime.value * 0.9, 11)
    light.intensity = isLit ? intensity * (1 + flicker) : 0
  })

  return (
    <pointLight
      ref={lightRef}
      color={sceneTokens.manor.candleLight}
      decay={2}
      distance={distance}
      intensity={0}
      position={position}
    />
  )
}
