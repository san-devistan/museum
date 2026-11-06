import { CanvasTexture, RepeatWrapping, type ColorSpace } from "three"

export type TextureSpec = {
  width: number
  height: number
  meters: readonly [number, number]
  colorSpace: ColorSpace
  paint: (context: CanvasRenderingContext2D) => void
}

export function createTexture(spec: TextureSpec) {
  const canvas = document.createElement("canvas")
  canvas.width = spec.width
  canvas.height = spec.height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (context) {
    spec.paint(context)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = spec.colorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.anisotropy = 8
  texture.repeat.set(1 / spec.meters[0], 1 / spec.meters[1])
  return texture
}

export type CanvasTextureSpec = Omit<TextureSpec, "meters">

// A painted texture used once across its mesh (no metered tiling).
export function createCanvasTexture(spec: CanvasTextureSpec) {
  const canvas = document.createElement("canvas")
  canvas.width = spec.width
  canvas.height = spec.height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (context) {
    spec.paint(context)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = spec.colorSpace
  texture.anisotropy = 4
  return texture
}
