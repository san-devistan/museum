import { cssFontFamily, loadFontFamilies } from "@/museum/_lib/css-font"
import type { ArtworkLabel } from "@/museum/_lib/exhibit"
import {
  labelCanvas,
  paintLabel,
  type LabelFonts,
} from "@/museum/gallery/label/_lib/label-painter"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
} from "three"

export const labelSize = {
  width: 0.3,
  height: (0.3 * labelCanvas.height) / labelCanvas.width,
  thickness: 0.003,
}

const paperGlow = 0.32

export const labelGeometry = {
  sheet: new BoxGeometry(
    labelSize.width,
    labelSize.height,
    labelSize.thickness
  ),
  pin: new CylinderGeometry(0.007, 0.007, 0.006, 16),
}

const edgeMaterial = new MeshStandardMaterial({
  color: sceneTokens.color.paper,
  roughness: 0.95,
})

export const pinMaterial = new MeshStandardMaterial({
  color: sceneTokens.color.pin,
  metalness: 0.9,
  roughness: 0.3,
})

let labelFonts: LabelFonts | null = null
const faceMaterials = new Map<string, Material[]>()

function fonts() {
  labelFonts ??= {
    heading: cssFontFamily("font-display"),
    body: cssFontFamily("font-sans"),
  }
  return labelFonts
}

function labelTexture(label: ArtworkLabel) {
  const canvas = document.createElement("canvas")
  canvas.width = labelCanvas.width
  canvas.height = labelCanvas.height
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  const redraw = () => {
    const context = canvas.getContext("2d")
    if (context) {
      paintLabel(context, label, fonts())
      texture.needsUpdate = true
    }
  }
  redraw()
  const { heading, body } = fonts()
  void loadFontFamilies([heading, body], label.title + (label.medium ?? ""))
    .then(redraw)
    .catch(() => undefined)
  return texture
}

export function labelMaterials(label: ArtworkLabel) {
  const cached = faceMaterials.get(label.id)
  if (cached) {
    return cached
  }
  const map = labelTexture(label)
  const face = new MeshStandardMaterial({
    map,
    emissive: sceneTokens.color.lightWarm,
    emissiveMap: map,
    emissiveIntensity: paperGlow,
    roughness: 0.9,
  })
  const materials = [
    edgeMaterial,
    edgeMaterial,
    edgeMaterial,
    edgeMaterial,
    face,
    edgeMaterial,
  ]
  faceMaterials.set(label.id, materials)
  return materials
}
