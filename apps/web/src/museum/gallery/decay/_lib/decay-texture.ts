import { createRandom, type Random } from "@/museum/_lib/relief/height-field"
import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { SRGBColorSpace, type CanvasTexture } from "three"

const cell = 512
const { manor } = sceneTokens

export type DecayCell = "stain" | "peel"

export const decayCells: Record<DecayCell, { u: number; width: number }> = {
  stain: { u: 0, width: 0.5 },
  peel: { u: 0.5, width: 0.5 },
}

function blob(
  random: Random,
  center: { x: number; y: number },
  radius: number
) {
  const points = 28
  return Array.from({ length: points }, (_, index) => {
    const angle = (index / points) * Math.PI * 2
    const wobble = 0.72 + random() * 0.4
    return {
      x: center.x + Math.cos(angle) * radius * wobble,
      y: center.y + Math.sin(angle) * radius * wobble * 0.8,
    }
  })
}

function tracePath(
  context: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[]
) {
  context.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y)
    } else {
      context.lineTo(point.x, point.y)
    }
  })
  context.closePath()
}

// Water that came through the ceiling: soft runs down the damask from the
// top edge, each ending in a scalloped tide line.
function paintStain(context: CanvasRenderingContext2D, random: Random) {
  context.save()
  for (let run = 0; run < 9; run += 1) {
    const x = cell * (0.12 + random() * 0.76)
    const width = 26 + random() * 70
    const length = cell * (0.35 + random() * 0.6)
    context.filter = "blur(9px)"
    const body = context.createLinearGradient(0, 0, 0, length)
    body.addColorStop(0, "rgba(150, 120, 100, 0.26)")
    body.addColorStop(0.85, "rgba(150, 120, 100, 0.12)")
    body.addColorStop(1, "rgba(150, 120, 100, 0)")
    context.fillStyle = body
    context.beginPath()
    context.moveTo(x - width / 2, 0)
    context.bezierCurveTo(
      x - width * 0.6,
      length * 0.4,
      x - width * 0.2,
      length * 0.8,
      x,
      length
    )
    context.bezierCurveTo(
      x + width * 0.25,
      length * 0.8,
      x + width * 0.55,
      length * 0.4,
      x + width / 2,
      0
    )
    context.closePath()
    context.fill()
    context.filter = "blur(1px)"
    context.strokeStyle = `rgba(196, 166, 138, ${(0.18 + random() * 0.18).toFixed(3)})`
    context.lineWidth = 1.5 + random() * 2
    context.beginPath()
    context.moveTo(x - width * 0.45, length * 0.72)
    context.bezierCurveTo(
      x - width * 0.3,
      length * 1.02,
      x + width * 0.2,
      length * 1.0,
      x + width * 0.42,
      length * 0.7
    )
    context.stroke()
  }
  context.restore()
}

// Wallpaper torn away: bare plaster, a pale paper fringe, a shadowed lip.
function paintPeel(context: CanvasRenderingContext2D, random: Random) {
  context.save()
  context.translate(cell, 0)
  const tear = blob(random, { x: cell / 2, y: cell / 2 }, 190).flatMap(
    (point, index, points) => {
      const next = points[(index + 1) % points.length] ?? point
      return [0, 0.33, 0.66].map((t) => ({
        x: point.x + (next.x - point.x) * t + (random() - 0.5) * 26,
        y: point.y + (next.y - point.y) * t + (random() - 0.5) * 26,
      }))
    }
  )
  context.filter = "blur(3px)"
  context.strokeStyle = "rgba(0, 0, 0, 0.7)"
  context.lineWidth = 16
  tracePath(context, tear)
  context.stroke()
  context.filter = "none"
  const plaster = context.createRadialGradient(
    cell / 2,
    cell * 0.4,
    20,
    cell / 2,
    cell / 2,
    230
  )
  plaster.addColorStop(0, manor.plaster)
  plaster.addColorStop(1, "#2e2422")
  context.fillStyle = plaster
  tracePath(context, tear)
  context.fill()
  context.save()
  tracePath(context, tear)
  context.clip()
  for (let blot = 0; blot < 26; blot += 1) {
    context.fillStyle = `rgba(${random() < 0.5 ? "20, 14, 12" : "150, 132, 118"}, ${(0.08 + random() * 0.16).toFixed(3)})`
    context.beginPath()
    context.ellipse(
      cell * random(),
      cell * random(),
      20 + random() * 60,
      12 + random() * 40,
      random() * 3,
      0,
      Math.PI * 2
    )
    context.fill()
  }
  context.restore()
  context.strokeStyle = "rgba(220, 208, 196, 0.6)"
  context.lineWidth = 2.5
  tracePath(context, tear)
  context.stroke()
  context.strokeStyle = "rgba(40, 30, 28, 0.55)"
  context.lineWidth = 1.5
  for (let crack = 0; crack < 6; crack += 1) {
    let x = cell * (0.3 + random() * 0.4)
    let y = cell * (0.3 + random() * 0.4)
    context.beginPath()
    context.moveTo(x, y)
    for (let step = 0; step < 6; step += 1) {
      x += (random() - 0.5) * 50
      y += (random() - 0.3) * 40
      context.lineTo(x, y)
    }
    context.stroke()
  }
  for (let speck = 0; speck < 400; speck += 1) {
    context.fillStyle = `rgba(30, 22, 20, ${(random() * 0.25).toFixed(3)})`
    context.fillRect(
      cell * (0.15 + random() * 0.7),
      cell * (0.15 + random() * 0.7),
      2,
      2
    )
  }
  context.restore()
}

let texture: CanvasTexture | null = null

export function decayTexture() {
  if (texture) {
    return texture
  }
  const random = createRandom(181)
  texture = createCanvasTexture({
    width: cell * 2,
    height: cell,
    colorSpace: SRGBColorSpace,
    paint: (context) => {
      context.clearRect(0, 0, cell * 2, cell)
      context.lineCap = "round"
      paintStain(context, random)
      paintPeel(context, random)
    },
  })
  return texture
}
