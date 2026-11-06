import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import type { RoomLight } from "@/museum/gallery/_lib/manor-dressing"
import { candleFlicker } from "@/museum/gallery/candles/_lib/candle-flicker"
import {
  roomLightLevel,
  warmRoomLight,
} from "@/museum/gallery/midnight/_lib/midnight-light"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import type { PointLight } from "three"

type RoomLightsProps = {
  lights: readonly RoomLight[]
  isLit: boolean
  isStill: boolean
}

function flickerOf(light: RoomLight, index: number) {
  const time = manorTime.value
  if (light.flicker === "candle") {
    return candleFlicker(time * 0.9, 11 + index * 7)
  }
  return Math.sin(time * 7.3 + index) * 0.045 + Math.sin(time * 17.9) * 0.025
}

// A room's two real lights. They stay mounted (unlit until inside) so the
// scene's light count never changes while rooms come and go.
export function RoomLights({ lights, isLit, isStill }: RoomLightsProps) {
  const refs = useRef<(PointLight | null)[]>([])

  useFrame(() => {
    lights.forEach((spec, index) => {
      const light = refs.current[index]
      if (!light) {
        return
      }
      const flicker = isStill ? 0 : flickerOf(spec, index)
      const level = roomLightLevel(spec.flicker)
      light.intensity = isLit ? spec.intensity * (1 + flicker) * level : 0
      warmRoomLight(light.color, spec.color)
    })
  })

  return lights.map((spec, index) => (
    <pointLight
      key={spec.id}
      ref={(light) => {
        refs.current[index] = light
      }}
      color={spec.color}
      decay={2}
      distance={spec.distance}
      intensity={0}
      position={spec.position}
    />
  ))
}
