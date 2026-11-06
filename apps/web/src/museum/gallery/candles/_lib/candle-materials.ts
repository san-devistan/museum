import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three"

const { manor } = sceneTokens

function paintGlow(context: CanvasRenderingContext2D) {
  const size = 128
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  )
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)")
  gradient.addColorStop(0.25, "rgba(255, 255, 255, 0.55)")
  gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.14)")
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
}

function createCandleMaterials() {
  return {
    wax: new MeshStandardMaterial({
      color: manor.wax,
      roughness: 0.5,
      emissive: manor.candleLight,
      emissiveIntensity: 0.22,
    }),
    glow: new MeshBasicMaterial({
      map: createCanvasTexture({
        width: 128,
        height: 128,
        colorSpace: SRGBColorSpace,
        paint: paintGlow,
      }),
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    }),
  }
}

let materials: ReturnType<typeof createCandleMaterials> | null = null

export function candleMaterials() {
  materials ??= createCandleMaterials()
  return materials
}

export const glowPlane = new PlaneGeometry(1, 1)
