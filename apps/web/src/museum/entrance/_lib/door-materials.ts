import {
  paintHeightGrey,
  paintNormalMap,
} from "@/museum/_lib/relief/height-field"
import { paintWood, woodField } from "@/museum/_lib/relief/wood-painter"
import { createTexture } from "@/museum/_lib/surface-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  MeshPhysicalMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Vector2,
} from "three"

const { palette } = sceneTokens
const woodSize = { width: 512, height: 512 }
const woodMeters = [0.9, 0.9] as const

function createWoodMaterial() {
  const field = woodField(woodSize, 19)
  const map = createTexture({
    ...woodSize,
    meters: woodMeters,
    colorSpace: SRGBColorSpace,
    paint: (context) =>
      paintWood(context, { field, base: palette.black, grain: palette.wine }),
  })
  const normal = createTexture({
    ...woodSize,
    meters: woodMeters,
    colorSpace: NoColorSpace,
    paint: (context) => paintNormalMap(context, { field, strength: 4 }),
  })
  const roughness = createTexture({
    ...woodSize,
    meters: woodMeters,
    colorSpace: NoColorSpace,
    paint: (context) =>
      paintHeightGrey(context, { field, low: 0.38, high: 0.55 }),
  })
  return new MeshPhysicalMaterial({
    map,
    normalMap: normal,
    normalScale: new Vector2(0.7, 0.7),
    roughnessMap: roughness,
    roughness: 1,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
  })
}

export const doorWoodMaterial = createWoodMaterial()
