import { createRandom } from "@/museum/_lib/relief/height-field"
import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  CircleGeometry,
  DoubleSide,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three"

// A rose petal: an oval cupped up at its rim, lying flat.
function petalGeometry() {
  const geometry = new CircleGeometry(1, 12).scale(0.03, 0.042, 1)
  const position = geometry.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index) / 0.03
    const y = position.getY(index) / 0.042
    position.setZ(index, (x * x + y * y * 0.6) * 0.01)
  }
  geometry.computeVertexNormals()
  return geometry.rotateX(-Math.PI / 2)
}

const featherSize = { width: 64, height: 256 }

// A black feather: a quill and ragged barbs swept toward the tip.
function paintFeather(context: CanvasRenderingContext2D) {
  const random = createRandom(193)
  const { width, height } = featherSize
  const middle = width / 2
  context.clearRect(0, 0, width, height)
  context.lineCap = "round"
  for (let y = 18; y < height - 30; y += 1.6) {
    const t = (y - 18) / (height - 48)
    const reach = Math.sin(Math.min(1, t * 1.25) * Math.PI) * (width * 0.46)
    for (const side of [-1, 1]) {
      if (random() < 0.06) {
        continue
      }
      const shade = Math.round(10 + random() * 26)
      context.strokeStyle = `rgba(${shade}, ${shade}, ${shade + 6}, 0.95)`
      context.lineWidth = 1.1
      context.beginPath()
      context.moveTo(middle, y)
      context.quadraticCurveTo(
        middle + side * reach * 0.6,
        y - 6,
        middle + side * reach * (0.85 + random() * 0.2),
        y - 14 - random() * 6
      )
      context.stroke()
    }
  }
  context.strokeStyle = "rgba(60, 56, 62, 1)"
  context.lineWidth = 2.2
  context.beginPath()
  context.moveTo(middle, height - 4)
  context.lineTo(middle, 8)
  context.stroke()
}

function featherGeometry() {
  const geometry = new PlaneGeometry(0.075, 0.3, 1, 8)
  const position = geometry.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index) / 0.3 + 0.5
    position.setZ(index, Math.sin(y * Math.PI) * 0.012)
    position.setX(index, position.getX(index) + (y - 0.5) ** 2 * 0.03)
  }
  geometry.computeVertexNormals()
  return geometry.rotateX(-Math.PI / 2)
}

function createRemnantAssets() {
  return {
    petal: petalGeometry(),
    petalMaterial: new MeshStandardMaterial({
      roughness: 0.55,
      side: DoubleSide,
    }),
    feather: featherGeometry(),
    featherMaterial: new MeshStandardMaterial({
      color: sceneTokens.manor.feather,
      map: createCanvasTexture({
        ...featherSize,
        colorSpace: SRGBColorSpace,
        paint: paintFeather,
      }),
      alphaTest: 0.3,
      roughness: 0.35,
      metalness: 0.15,
      side: DoubleSide,
    }),
  }
}

let assets: ReturnType<typeof createRemnantAssets> | null = null

export function remnantAssets() {
  assets ??= createRemnantAssets()
  return assets
}
