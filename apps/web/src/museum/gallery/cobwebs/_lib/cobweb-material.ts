import { cobwebTexture } from "@/museum/gallery/cobwebs/_lib/cobweb-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { DoubleSide, MeshBasicMaterial } from "three"

let material: MeshBasicMaterial | null = null

// Dusty threads that seem to catch whatever light there is.
export function cobwebMaterial() {
  material ??= new MeshBasicMaterial({
    color: sceneTokens.manor.cobweb,
    map: cobwebTexture(),
    transparent: true,
    opacity: 0.55,
    side: DoubleSide,
    depthWrite: false,
  })
  return material
}
