import { cssFontFamily, loadFontFamilies } from "@/museum/_lib/css-font"
import { pictureLight } from "@/museum/gallery/artwork/_lib/picture-light"
import { portraitSignature } from "@/museum/gallery/midnight/_lib/thirteenth-frame"
import { mirrorTexture } from "@/museum/gallery/props/vanity/_lib/mirror-texture"
import type { KeptPortrait } from "@/museum/story/_lib/story-store"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from "three"

// The kept visitor's portrait as the thirteenth frame hangs it: the frozen
// print, signed by hand in the corner with the night the house kept them.

// The mirror's shape, with room for a legible signature.
const sheet = { width: 512, height: 704 }
const signature = { size: 46, maxWidth: 0.8, right: 0.93, baseline: 0.94 }
// The print lights up as it freezes, then settles to the works' own glow.
const flashGlow = 2.4

export type FramePortrait = {
  canvas: HTMLCanvasElement
  texture: CanvasTexture
  material: MeshStandardMaterial
  // The portrait hung, painted or still loading; null while it's a mirror.
  hung: KeptPortrait | null
  isPainted: boolean
  // 1 as the print freezes, down to 0.
  flash: number
}

export function createFramePortrait(): FramePortrait {
  const canvas = document.createElement("canvas")
  canvas.width = sheet.width
  canvas.height = sheet.height
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  const material = new MeshStandardMaterial({
    map: texture,
    emissive: sceneTokens.color.lightWarm,
    emissiveMap: texture,
    emissiveIntensity: pictureLight.glow,
    roughness: 0.55,
  })
  return { canvas, texture, material, hung: null, isPainted: false, flash: 0 }
}

export function disposeFramePortrait(portrait: FramePortrait) {
  portrait.texture.dispose()
  portrait.material.dispose()
}

let scriptFamily: string | null = null

function paintSignature(context: CanvasRenderingContext2D, text: string) {
  scriptFamily ??= cssFontFamily("font-heading")
  const { width, height } = sheet
  let size = signature.size
  context.font = `${size}px ${scriptFamily}`
  const measured = context.measureText(text).width
  size = Math.min(size, (size * width * signature.maxWidth) / measured)
  context.save()
  context.translate(width * signature.right, height * signature.baseline)
  context.rotate(-0.05)
  context.font = `${size}px ${scriptFamily}`
  context.textAlign = "right"
  context.textBaseline = "alphabetic"
  context.fillStyle = sceneTokens.palette.wine
  context.strokeStyle = sceneTokens.palette.wine
  context.lineWidth = 2
  context.strokeText(text, 0, 0)
  context.fillText(text, 0, 0)
  context.restore()
}

function paintSheet(
  portrait: FramePortrait,
  print: CanvasImageSource,
  night: string
) {
  const context = portrait.canvas.getContext("2d")
  if (!context) {
    return
  }
  context.drawImage(print, 0, 0, sheet.width, sheet.height)
  paintSignature(context, portraitSignature(night))
  portrait.texture.needsUpdate = true
  portrait.isPainted = true
}

async function repaintInScript(
  portrait: FramePortrait,
  print: CanvasImageSource,
  hung: KeptPortrait,
  family: string
) {
  try {
    await loadFontFamilies([family], portraitSignature(hung.night))
  } catch {
    return
  }
  if (portrait.hung === hung) {
    paintSheet(portrait, print, hung.night)
  }
}

// Paints the print and its signature, and again once the script has loaded.
function paint(portrait: FramePortrait, print: CanvasImageSource) {
  const { hung } = portrait
  if (!hung) {
    return
  }
  paintSheet(portrait, print, hung.night)
  scriptFamily ??= cssFontFamily("font-heading")
  void repaintInScript(portrait, print, hung, scriptFamily)
}

// The print just taken, as the mirror freezes.
export function freezePortrait(
  portrait: FramePortrait,
  hung: KeptPortrait,
  print: HTMLCanvasElement,
  isStill: boolean
) {
  portrait.hung = hung
  portrait.flash = isStill ? 0 : 1
  paint(portrait, print)
}

// A portrait kept from an earlier visit. Without its photo (it couldn't be
// kept), the foxed glass stands in for it, signed all the same.
export function hangKeptPortrait(portrait: FramePortrait, hung: KeptPortrait) {
  portrait.hung = hung
  portrait.isPainted = false
  const { photo } = hung
  if (photo === null) {
    const glass: unknown = mirrorTexture().image
    if (glass instanceof HTMLCanvasElement) {
      paint(portrait, glass)
    }
    return
  }
  const image = new Image()
  image.addEventListener("load", () => {
    if (portrait.hung === hung) {
      paint(portrait, image)
    }
  })
  image.src = photo
}

export function takeDownPortrait(portrait: FramePortrait) {
  portrait.hung = null
  portrait.isPainted = false
  portrait.flash = 0
}

// Called every frame once painted: the freeze's flash dies down.
export function settlePortrait(portrait: FramePortrait, delta: number) {
  if (portrait.flash <= 0) {
    return
  }
  portrait.flash = Math.max(0, portrait.flash - delta / 1.6)
  const glow = portrait.flash * portrait.flash
  portrait.material.emissiveIntensity =
    pictureLight.glow + (flashGlow - pictureLight.glow) * glow
}
