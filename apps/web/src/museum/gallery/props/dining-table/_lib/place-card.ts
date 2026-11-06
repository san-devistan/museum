import { cssFontFamily, loadFontFamilies } from "@/museum/_lib/css-font"
import {
  guestPlace,
  table,
} from "@/museum/gallery/props/dining-table/_lib/dining-layout"
import { napkinTop } from "@/museum/gallery/props/dining-table/_lib/tableware-geometry"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  SRGBColorSpace,
} from "three"

export const placeCardText = "L'invité de minuit"

const canvasSize = { width: 512, height: 288 }
const card = { width: 0.17, height: 0.085, lean: 0.3, turn: -0.75 }

function paintCard(context: CanvasRenderingContext2D, family: string) {
  const { width, height } = canvasSize
  const { props, palette } = sceneTokens
  context.fillStyle = props.card
  context.fillRect(0, 0, width, height)
  context.strokeStyle = palette.wine
  context.lineWidth = 3
  context.strokeRect(18, 18, width - 36, height - 36)
  context.lineWidth = 1
  context.strokeRect(28, 28, width - 56, height - 56)
  context.fillStyle = props.ink
  context.textAlign = "center"
  context.textBaseline = "middle"
  let size = 78
  context.font = `${size}px ${family}`
  const measured = context.measureText(placeCardText).width
  size = Math.min(size, (size * (width - 90)) / Math.max(measured, 1))
  context.font = `${size}px ${family}`
  context.strokeStyle = props.ink
  context.lineWidth = 2.5
  context.strokeText(placeCardText, width / 2, height / 2 + 4)
  context.fillText(placeCardText, width / 2, height / 2 + 4)
}

// The card's paper, repainted once the script font has loaded.
export function placeCardTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = canvasSize.width
  canvas.height = canvasSize.height
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  const family = cssFontFamily("font-heading")
  const redraw = () => {
    const context = canvas.getContext("2d")
    if (context) {
      paintCard(context, family)
      texture.needsUpdate = true
    }
  }
  redraw()
  void loadFontFamilies([family], placeCardText)
    .then(redraw)
    .catch(() => undefined)
  return texture
}

// A folded tent card on the guest's napkin, the name on both faces, turned
// a little toward the room so it reads from the guest's chair or the front.
export function buildPlaceCard() {
  const foot = Math.sin(card.lean) * card.height
  const rise = Math.cos(card.lean) * card.height
  const half = card.width / 2
  const positions: number[] = []
  const uvs: number[] = []
  for (const side of [1, -1]) {
    const corners = [
      [side * foot, 0, side * half, 0, 0],
      [side * foot, 0, -side * half, 1, 0],
      [0, rise, -side * half, 1, 1],
      [0, rise, side * half, 0, 1],
    ] as const
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const [x, y, z, u, v] = corners[index] ?? corners[0]
      positions.push(x, y, z)
      uvs.push(u, v)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  return geometry
    .rotateY(card.turn)
    .translate(guestPlace.plate.x, table.top + napkinTop, guestPlace.plate.z)
}
