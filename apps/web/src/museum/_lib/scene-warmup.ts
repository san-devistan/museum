import { useThree } from "@react-three/fiber"
import { useEffect, useState } from "react"
import {
  BackSide,
  DoubleSide,
  Mesh,
  NoToneMapping,
  Points,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type ToneMapping,
  type WebGLRenderer,
} from "three"

export function useStagedReveal(total: number, isUrgent: boolean) {
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (revealed >= total) {
      return undefined
    }
    const frame = requestAnimationFrame(() => {
      setRevealed(isUrgent ? total : revealed + 1)
    })
    return () => cancelAnimationFrame(frame)
  }, [isUrgent, revealed, total])

  return revealed
}

function isDrawable(object: Object3D): object is Mesh | Points {
  return object instanceof Mesh || object instanceof Points
}

function sceneMaterials(scene: Scene) {
  const materials = new Set<Material>()
  scene.traverse((object) => {
    if (isDrawable(object)) {
      for (const material of [object.material].flat()) {
        materials.add(material)
      }
    }
  })
  return materials
}

// Meshes kept hidden until their moment (a chapter's falling feathers, a
// door's seam of light) compile too, so showing them never stalls a frame.
function withHiddenDrawables<T>(scene: Scene, run: () => T): T {
  const hidden: Object3D[] = []
  scene.traverse((object) => {
    if (!object.visible && isDrawable(object)) {
      hidden.push(object)
      object.visible = true
    }
  })
  const result = run()
  for (const object of hidden) {
    object.visible = false
  }
  return result
}

function isTransmissive(material: Material) {
  return "transmission" in material && Number(material.transmission) > 0
}

function withToneMapping(
  gl: WebGLRenderer,
  toneMapping: ToneMapping,
  run: () => void
) {
  const previous = gl.toneMapping
  gl.toneMapping = toneMapping
  run()
  gl.toneMapping = previous
}

function withBackSides(materials: readonly Material[], run: () => void) {
  for (const material of materials) {
    material.side = BackSide
    material.needsUpdate = true
  }
  run()
  for (const material of materials) {
    material.side = DoubleSide
    material.needsUpdate = true
  }
}

function compileTransmissionVariants(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera
) {
  const doubleSided = [...sceneMaterials(scene)].filter(
    (material) => isTransmissive(material) && material.side === DoubleSide
  )
  const target = new WebGLRenderTarget(1, 1)
  const previous = gl.getRenderTarget()
  gl.setRenderTarget(target)
  withToneMapping(gl, NoToneMapping, () => {
    gl.compile(scene, camera)
    withBackSides(doubleSided, () => gl.compile(scene, camera))
  })
  gl.setRenderTarget(previous)
  target.dispose()
}

function isTexture(value: unknown): value is Texture {
  return (
    typeof value === "object" &&
    value !== null &&
    "isTexture" in value &&
    value.isTexture === true
  )
}

function sceneTextures(scene: Scene) {
  const textures = new Set<Texture>()
  for (const material of sceneMaterials(scene)) {
    for (const value of Object.values(material)) {
      if (isTexture(value)) {
        textures.add(value)
      }
    }
  }
  return textures
}

function uploadTextures(gl: WebGLRenderer, scene: Scene) {
  for (const texture of sceneTextures(scene)) {
    gl.initTexture(texture)
  }
}

// Compiles the scene's shaders and uploads its textures once it is ready.
// three only compiles what is visible, so `revealHidden` shows the parts
// the frame loop hides (they hide again on the next frame).
export function useSceneWarmup(isReady: boolean, revealHidden: () => void) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!isReady) {
      return undefined
    }
    let isCancelled = false
    const warmUp = async () => {
      revealHidden()
      await withHiddenDrawables(scene, () => gl.compileAsync(scene, camera))
      if (isCancelled) {
        return
      }
      revealHidden()
      withHiddenDrawables(scene, () => {
        compileTransmissionVariants(gl, scene, camera)
      })
      uploadTextures(gl, scene)
    }
    void warmUp()
    return () => {
      isCancelled = true
    }
  }, [camera, gl, isReady, revealHidden, scene])
}
