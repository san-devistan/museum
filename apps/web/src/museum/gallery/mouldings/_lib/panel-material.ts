import {
  createHeightField,
  paintHeightGrey,
  paintNormalMap,
  type HeightField,
} from "@/museum/_lib/relief/height-field"
import { boardField } from "@/museum/_lib/relief/relief-fields"
import { createTexture } from "@/museum/_lib/surface-texture"
import { dado } from "@/museum/gallery/mouldings/_lib/moulding-profiles"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  MeshStandardMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Vector2,
} from "three"

const pixelsPerMeter = 640
const fieldHeight = dado.fieldTop - dado.fieldBottom
const size = {
  width: Math.round(dado.bay * pixelsPerMeter),
  height: Math.round(fieldHeight * pixelsPerMeter),
}
const stile = 0.07
const rail = 0.045
const bead = 0.006
const groove = 0.004
const bevel = 0.026

// Distance inside the raised panel of one bay, negative on the stiles and rails.
function panelDepth(x: number, y: number) {
  return Math.min(
    x - stile / 2,
    dado.bay - stile / 2 - x,
    y - rail,
    fieldHeight - rail - y
  )
}

function carvedHeight(depth: number) {
  if (depth < -bead) {
    return 0.55
  }
  if (depth < 0) {
    const t = (depth + bead / 2) / (bead / 2)
    return 0.55 + 0.14 * Math.sqrt(Math.max(0, 1 - t * t))
  }
  if (depth < groove) {
    return 0.36
  }
  if (depth < groove + bevel) {
    const t = (depth - groove) / bevel
    return 0.36 + 0.46 * t * t * (3 - 2 * t)
  }
  return 0.84
}

function panelField(grain: HeightField): HeightField {
  return createHeightField(size, (x, y) => {
    const depth = panelDepth(x / pixelsPerMeter, y / pixelsPerMeter)
    const wood = grain.values[y * size.width + x] ?? 0.5
    return carvedHeight(depth) + (wood - 0.5) * 0.05
  })
}

function paintPanel(
  context: CanvasRenderingContext2D,
  fields: { carved: HeightField; grain: HeightField }
) {
  const base = new Color(sceneTokens.manor.wood)
  const grainColor = new Color(sceneTokens.manor.woodGrain)
  const output = context.createImageData(size.width, size.height)
  const shade = new Color()
  for (let index = 0; index < fields.carved.values.length; index += 1) {
    const carved = fields.carved.values[index] ?? 0
    const grain = Math.min(
      1,
      Math.max(0, (fields.grain.values[index] ?? 0) - 0.45)
    )
    const occlusion = carved < 0.4 ? 0.45 : 0.8 + 0.25 * carved
    shade
      .copy(base)
      .lerp(grainColor, grain * 0.45)
      .multiplyScalar(occlusion)
    const offset = index * 4
    output.data[offset] = Math.round(shade.r * 255)
    output.data[offset + 1] = Math.round(shade.g * 255)
    output.data[offset + 2] = Math.round(shade.b * 255)
    output.data[offset + 3] = 255
  }
  context.putImageData(output, 0, 0)
}

let panelMaterial: MeshStandardMaterial | null = null

function createPanelMaterial() {
  const grain = boardField(size, 37)
  const carved = panelField(grain)
  const meters = [dado.bay, fieldHeight] as const
  const textures = {
    map: createTexture({
      ...size,
      meters,
      colorSpace: NoColorSpace,
      paint: (context) => paintPanel(context, { carved, grain }),
    }),
    normal: createTexture({
      ...size,
      meters,
      colorSpace: NoColorSpace,
      paint: (context) =>
        paintNormalMap(context, { field: carved, strength: 14 }),
    }),
    roughness: createTexture({
      ...size,
      meters,
      colorSpace: NoColorSpace,
      paint: (context) =>
        paintHeightGrey(context, { field: carved, low: 0.9, high: 0.35 }),
    }),
  }
  textures.map.colorSpace = SRGBColorSpace
  const offsetV = -dado.fieldInset / fieldHeight
  for (const texture of Object.values(textures)) {
    texture.offset.set(0, offsetV)
  }
  return new MeshStandardMaterial({
    map: textures.map,
    normalMap: textures.normal,
    normalScale: new Vector2(1, 1),
    roughnessMap: textures.roughness,
    roughness: 1,
  })
}

export function dadoPanelMaterial() {
  panelMaterial ??= createPanelMaterial()
  return panelMaterial
}
