import { createRandom } from "@/museum/_lib/relief/height-field"
import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import { mergeParts } from "@/museum/gallery/props/_lib/prop-geometry"
import { propMaterials } from "@/museum/gallery/props/_lib/prop-materials"
import { paleMarkSize } from "@/museum/gallery/props/_lib/prop-spots"
import {
  CylinderGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three"

const margin = 0.1
const plane = {
  width: paleMarkSize.width + margin * 2,
  height: paleMarkSize.height + margin * 2,
}
const canvas = { width: 280, height: 360 }
const pixelsPerMetre = canvas.width / plane.width
// The nail sits where a frame's wire would catch, near the top.
const nailY = paleMarkSize.height / 2 - 0.14

function paintPaleMark(context: CanvasRenderingContext2D) {
  const random = createRandom(131)
  const inset = margin * pixelsPerMetre
  const width = paleMarkSize.width * pixelsPerMetre
  const height = paleMarkSize.height * pixelsPerMetre
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  context.filter = "blur(3px)"
  context.strokeStyle = "rgba(5, 3, 4, 0.55)"
  context.lineWidth = 6
  context.strokeRect(inset - 3, inset - 3, width + 6, height + 6)
  context.restore()
  context.save()
  context.filter = "blur(1.5px)"
  context.fillStyle = "rgba(216, 205, 200, 0.1)"
  context.fillRect(inset, inset, width, height)
  context.restore()
  context.save()
  context.beginPath()
  context.rect(inset, inset, width, height)
  context.clip()
  context.filter = "blur(8px)"
  for (let index = 0; index < 26; index += 1) {
    const alpha = 0.015 + random() * 0.04
    context.fillStyle = `rgba(232, 222, 218, ${alpha.toFixed(3)})`
    context.beginPath()
    context.ellipse(
      inset + random() * width,
      inset + random() * height,
      10 + random() * 30,
      14 + random() * 40,
      random() * Math.PI,
      0,
      Math.PI * 2
    )
    context.fill()
  }
  context.restore()
  const nail = canvas.height / 2 - nailY * pixelsPerMetre
  context.strokeStyle = "rgba(10, 6, 7, 0.35)"
  context.lineWidth = 1.2
  context.beginPath()
  context.moveTo(canvas.width / 2 - 1, nail + 3)
  context.quadraticCurveTo(
    canvas.width / 2 + 5,
    nail + 16,
    canvas.width / 2 + 2,
    nail + 26
  )
  context.stroke()
}

function createPaleMarkAssets() {
  const map = createCanvasTexture({
    ...canvas,
    colorSpace: SRGBColorSpace,
    paint: paintPaleMark,
  })
  const nail = mergeParts([
    new CylinderGeometry(0.0026, 0.0018, 0.036, 8)
      .rotateX(Math.PI / 2)
      .translate(0, 0, 0.012),
    new CylinderGeometry(0.008, 0.008, 0.0025, 12)
      .rotateX(Math.PI / 2)
      .translate(0, 0, 0.03),
  ])
    .rotateX(-0.3)
    .translate(0, nailY, 0)
  return {
    mark: new PlaneGeometry(plane.width, plane.height).translate(0, 0, 0.003),
    nail,
    material: new MeshStandardMaterial({
      map,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  }
}

let assets: ReturnType<typeof createPaleMarkAssets> | null = null

function paleMarkAssets() {
  assets ??= createPaleMarkAssets()
  return assets
}

// A paler rectangle on the wallpaper where a frame hung until recently,
// soot-edged, with its nail still in the wall. The spot is the mark's
// centre on the wall's face; +z looks into the room.
export function PaleMark() {
  const { mark, nail, material } = paleMarkAssets()
  return (
    <group>
      <mesh geometry={mark} material={material} renderOrder={1} />
      <mesh geometry={nail} material={propMaterials().silver} />
    </group>
  )
}
