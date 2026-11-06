import type { SolidShape } from "@/museum/entrance/_lib/entrance-layout"
import { ribbon } from "@/museum/entrance/_lib/ribbon-layout"
import { satinLook } from "@/museum/entrance/_lib/satin-material"
import { sceneTokens, type SceneColor } from "@workspace/ui/lib/scene-tokens"
import {
  BoxGeometry,
  CylinderGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TorusGeometry,
  type BufferGeometry,
} from "three"

const { color } = sceneTokens

export const unitGeometry: Record<SolidShape, BufferGeometry> = {
  box: new BoxGeometry(1, 1, 1),
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 24),
}

const materialCache = new Map<SceneColor, MeshStandardMaterial>()

export function surfaceMaterial(name: SceneColor) {
  const cached = materialCache.get(name)
  if (cached) {
    return cached
  }
  const material = new MeshStandardMaterial({
    color: color[name],
    roughness: 0.55,
  })
  materialCache.set(name, material)
  return material
}

/**
 * The ribbon's satin without baked folds, for ribbons built from plain
 * strips. The front door's ribbon follows its opacity and glow (the door's
 * opening sequence and hover drive them).
 */
export const ribbonMaterial = new MeshPhysicalMaterial({
  ...satinLook,
  transparent: true,
})

export const eyeletMaterial = new MeshStandardMaterial({
  color: color.eyelet,
  roughness: 0.25,
  metalness: 0.2,
})

export const ribbonGeometry = {
  eyelet: new TorusGeometry(ribbon.eyelet.radius, ribbon.eyelet.tube, 10, 28),
}
