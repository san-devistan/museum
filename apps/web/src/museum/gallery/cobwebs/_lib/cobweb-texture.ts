import { createRandom, type Random } from "@/museum/_lib/relief/height-field"
import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import { SRGBColorSpace, type CanvasTexture } from "three"

const cell = 512

export const cobwebCells = {
  fan: { u: 0, width: 0.5 },
  drape: { u: 0.5, width: 0.5 },
} as const

function thread(context: CanvasRenderingContext2D, random: Random) {
  context.strokeStyle = `rgba(255, 255, 255, ${(0.45 + random() * 0.5).toFixed(3)})`
  context.lineWidth = 1.6 + random() * 1.4
}

// An old cobweb in a corner: no tidy spiral, just a dusty veil of tangled
// threads anchored at the hub (top left) that sags toward the room.
function paintFan(context: CanvasRenderingContext2D, random: Random) {
  const veil = context.createRadialGradient(0, 0, 0, 0, 0, cell * 0.95)
  veil.addColorStop(0, "rgba(235, 230, 225, 0.32)")
  veil.addColorStop(0.5, "rgba(235, 230, 225, 0.12)")
  veil.addColorStop(1, "rgba(235, 230, 225, 0)")
  context.fillStyle = veil
  context.beginPath()
  context.moveTo(0, 0)
  context.lineTo(cell, 0)
  context.quadraticCurveTo(cell * 0.55, cell * 0.55, 0, cell)
  context.closePath()
  context.fill()
  const anchor = () => {
    const angle = random() * (Math.PI / 2)
    const reach =
      cell * (0.25 + random() * 0.7) * (1 - Math.sin(angle * 2) * 0.35)
    return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach }
  }
  for (let index = 0; index < 70; index += 1) {
    const from = anchor()
    const to = anchor()
    const sag = 10 + random() * 50
    thread(context, random)
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.quadraticCurveTo(
      (from.x + to.x) / 2 + sag * 0.4,
      (from.y + to.y) / 2 + sag,
      to.x,
      to.y
    )
    context.stroke()
  }
  for (let strand = 0; strand < 9; strand += 1) {
    const from = anchor()
    thread(context, random)
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.bezierCurveTo(
      from.x + 10,
      from.y + 50,
      from.x - 14,
      from.y + 110,
      from.x + (random() - 0.5) * 30,
      from.y + 120 + random() * 140
    )
    context.stroke()
  }
  paintDust(context, random, { x: 0, y: 0, spread: cell * 0.6 })
}

function paintDust(
  context: CanvasRenderingContext2D,
  random: Random,
  area: { x: number; y: number; spread: number }
) {
  for (let index = 0; index < 60; index += 1) {
    const x = area.x + random() * area.spread
    const y = area.y + random() * area.spread
    context.fillStyle = `rgba(235, 230, 225, ${(0.1 + random() * 0.35).toFixed(3)})`
    context.beginPath()
    context.ellipse(
      x,
      y,
      1 + random() * 4,
      0.6 + random() * 2,
      random() * 3,
      0,
      Math.PI * 2
    )
    context.fill()
  }
}

// A torn web sagging between two anchors, trailing loose strands.
function paintDrape(context: CanvasRenderingContext2D, random: Random) {
  context.save()
  context.translate(cell, 0)
  for (let index = 0; index < 26; index += 1) {
    const from = random() * cell * 0.5
    const to = cell * 0.5 + random() * cell * 0.5
    const sag = cell * (0.15 + random() * 0.55)
    thread(context, random)
    context.beginPath()
    context.moveTo(from, 2)
    context.quadraticCurveTo((from + to) / 2, sag * 2 - 2, to, 2)
    context.stroke()
  }
  for (let index = 0; index < 22; index += 1) {
    const x = cell * (0.15 + random() * 0.7)
    const length = cell * (0.25 + random() * 0.7)
    thread(context, random)
    context.beginPath()
    context.moveTo(x, 0)
    context.bezierCurveTo(
      x + (random() - 0.5) * 30,
      length * 0.4,
      x + (random() - 0.5) * 40,
      length * 0.8,
      x + (random() - 0.5) * 20,
      length
    )
    context.stroke()
  }
  paintDust(context, random, { x: cell * 0.2, y: 0, spread: cell * 0.6 })
  context.restore()
}

let texture: CanvasTexture | null = null

export function cobwebTexture() {
  if (texture) {
    return texture
  }
  const random = createRandom(167)
  texture = createCanvasTexture({
    width: cell * 2,
    height: cell,
    colorSpace: SRGBColorSpace,
    paint: (context) => {
      context.clearRect(0, 0, cell * 2, cell)
      context.lineCap = "round"
      paintFan(context, random)
      paintDrape(context, random)
    },
  })
  return texture
}
