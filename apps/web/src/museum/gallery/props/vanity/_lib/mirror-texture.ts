import { createRandom } from "@/museum/_lib/relief/height-field"
import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { SRGBColorSpace, type CanvasTexture } from "three"

const size = { width: 256, height: 352 }

// Old silvering: a pale grey sheen, darkening and spotting where the
// backing has lifted, worst around the rim.
function paintFoxing(context: CanvasRenderingContext2D) {
  const random = createRandom(151)
  const { width, height } = size
  context.fillStyle = sceneTokens.props.mirror
  context.fillRect(0, 0, width, height)
  const sheen = context.createLinearGradient(0, 0, width, height)
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.18)")
  sheen.addColorStop(0.45, "rgba(255, 255, 255, 0)")
  sheen.addColorStop(1, "rgba(255, 255, 255, 0.08)")
  context.fillStyle = sheen
  context.fillRect(0, 0, width, height)
  const rim = context.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.28,
    width / 2,
    height / 2,
    height * 0.55
  )
  rim.addColorStop(0, "rgba(36, 31, 27, 0)")
  rim.addColorStop(1, "rgba(36, 31, 27, 0.85)")
  context.fillStyle = rim
  context.fillRect(0, 0, width, height)
  context.save()
  context.filter = "blur(2px)"
  for (let index = 0; index < 90; index += 1) {
    const edge = random() < 0.7
    const angle = random() * Math.PI * 2
    const reach = edge ? 0.38 + random() * 0.14 : random() * 0.4
    const alpha = 0.15 + random() * 0.4
    context.fillStyle = `rgba(36, 31, 27, ${alpha.toFixed(3)})`
    context.beginPath()
    context.arc(
      width / 2 + Math.cos(angle) * reach * width,
      height / 2 + Math.sin(angle) * reach * height,
      1 + random() * (edge ? 9 : 3),
      0,
      Math.PI * 2
    )
    context.fill()
  }
  context.restore()
}

let foxing: CanvasTexture | null = null

export function mirrorTexture() {
  foxing ??= createCanvasTexture({
    ...size,
    colorSpace: SRGBColorSpace,
    paint: paintFoxing,
  })
  return foxing
}
