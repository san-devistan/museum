import type { WorkPhoto } from "@/museum/collection/collection-works"
import type { ArtworkSpec } from "@/museum/gallery/_lib/gallery-artworks"
import type { BoxFace } from "@/museum/gallery/_lib/gallery-layout"
import {
  artworkFrame,
  type FrameSize,
} from "@/museum/gallery/artwork/_lib/artwork-frame"
import {
  artworkLightMap,
  pictureLight,
} from "@/museum/gallery/artwork/_lib/picture-light"
import { sceneTokens, type SceneColor } from "@workspace/ui/lib/scene-tokens"
import {
  BoxGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  type Material,
  type Texture,
} from "three"

export const unitBox = new BoxGeometry(1, 1, 1)
export const unitPlane = new PlaneGeometry(1, 1)

const surfaceMaterials = new Map<SceneColor, MeshStandardMaterial>()

export function surfaceMaterial(color: SceneColor) {
  const cached = surfaceMaterials.get(color)
  if (cached) {
    return cached
  }
  const material = new MeshStandardMaterial({
    color: sceneTokens.color[color],
    roughness: 0.92,
  })
  surfaceMaterials.set(color, material)
  return material
}

const boxFaceOrder: readonly BoxFace[] = ["px", "nx", "py", "ny", "pz", "nz"]

export function facadeMaterials(
  inner: Material,
  facadeFace: BoxFace
): Material[] {
  return boxFaceOrder.map((face) =>
    face === facadeFace ? surfaceMaterial("facade") : inner
  )
}

const photoLoader = new TextureLoader()
const photoMaterials = new Map<string, MeshPhysicalMaterial>()

function coverFit(texture: Texture, photo: WorkPhoto, target: FrameSize) {
  const photoAspect = photo.width / photo.height
  const targetAspect = target.width / target.height
  const repeatX = Math.min(1, targetAspect / photoAspect)
  const repeatY = Math.min(1, photoAspect / targetAspect)
  texture.repeat.set(repeatX, repeatY)
  texture.offset.set((1 - repeatX) / 2, (1 - repeatY) / 2)
}

function showBlankPrint(material: MeshPhysicalMaterial) {
  material.map = null
  material.emissiveMap = null
  material.color.set(sceneTokens.color.paper)
  material.needsUpdate = true
}

export function photoMaterial(artwork: ArtworkSpec) {
  const cached = photoMaterials.get(artwork.id)
  if (cached) {
    return cached
  }
  const { lace, canvas } = artworkFrame(artwork)
  const material = new MeshPhysicalMaterial({
    emissive: sceneTokens.color.lightWarm,
    emissiveIntensity: pictureLight.glow,
    lightMap: artworkLightMap({
      x: canvas.width / lace.width,
      y: canvas.height / lace.height,
    }),
    lightMapIntensity: pictureLight.pool,
    roughness: 0.6,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
  })
  const map = photoLoader.load(artwork.photo.src, undefined, undefined, () => {
    showBlankPrint(material)
  })
  map.colorSpace = SRGBColorSpace
  map.anisotropy = 8
  coverFit(map, artwork.photo, canvas)
  material.map = map
  material.emissiveMap = map
  photoMaterials.set(artwork.id, material)
  return material
}
