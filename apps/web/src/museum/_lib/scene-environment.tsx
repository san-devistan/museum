import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import { PMREMGenerator, type Scene, type WebGLRenderer } from "three"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

export const environmentIntensity = 0.12

function applyRoomEnvironment(renderer: WebGLRenderer, target: Scene) {
  const generator = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = generator.fromScene(room, 0.04)
  target.environment = environment.texture
  target.environmentIntensity = environmentIntensity
  room.dispose()
  generator.dispose()

  return () => {
    target.environment = null
    environment.dispose()
  }
}

export function SceneEnvironment() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => applyRoomEnvironment(gl, scene), [gl, scene])

  return null
}
