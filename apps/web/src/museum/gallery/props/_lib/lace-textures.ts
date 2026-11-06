import { createRandom, type Random } from "@/museum/_lib/relief/height-field"
import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import {
  ClampToEdgeWrapping,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type CanvasTexture,
} from "three"

// Metres one tile of each texture covers, for the geometry's UVs.
export const laceFieldMeters = 0.3
export const laceHem = { width: 0.075, height: 0.075 } as const

const fieldSize = 512
const hemSize = 128
const thread = "rgb(255, 255, 255)"
const hole = "rgb(0, 0, 0)"

type Draw = (context: CanvasRenderingContext2D) => void

// Draws a motif and its copies across the tile's edges, so it repeats.
function wrapped(context: CanvasRenderingContext2D, draw: Draw) {
  for (const dx of [-fieldSize, 0, fieldSize]) {
    for (const dy of [-fieldSize, 0, fieldSize]) {
      context.save()
      context.translate(dx, dy)
      draw(context)
      context.restore()
    }
  }
}

function paintNet(context: CanvasRenderingContext2D) {
  const step = 12
  context.strokeStyle = thread
  context.lineWidth = 2.8
  context.beginPath()
  for (let offset = -fieldSize; offset <= fieldSize * 2; offset += step) {
    context.moveTo(offset, 0)
    context.lineTo(offset + fieldSize, fieldSize)
    context.moveTo(offset, 0)
    context.lineTo(offset - fieldSize, fieldSize)
  }
  context.stroke()
}

type Flower = { x: number; y: number; radius: number; turn: number }

function drawFlower(context: CanvasRenderingContext2D, flower: Flower) {
  const petals = 6
  const { x, y, radius, turn } = flower
  for (let petal = 0; petal < petals; petal += 1) {
    const angle = turn + (petal / petals) * Math.PI * 2
    const cx = x + Math.cos(angle) * radius * 0.56
    const cy = y + Math.sin(angle) * radius * 0.56
    context.fillStyle = thread
    context.beginPath()
    context.ellipse(cx, cy, radius * 0.44, radius * 0.27, angle, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = hole
    for (const along of [0.38, 0.62, 0.84]) {
      context.beginPath()
      context.arc(
        x + Math.cos(angle) * radius * along,
        y + Math.sin(angle) * radius * along,
        radius * 0.055,
        0,
        Math.PI * 2
      )
      context.fill()
    }
  }
  context.strokeStyle = hole
  context.lineWidth = 2.4
  context.beginPath()
  context.arc(x, y, radius * 0.27, 0, Math.PI * 2)
  context.stroke()
  context.fillStyle = thread
  context.beginPath()
  context.arc(x, y, radius * 0.16, 0, Math.PI * 2)
  context.fill()
}

function drawLeaf(
  context: CanvasRenderingContext2D,
  at: { x: number; y: number; angle: number; length: number }
) {
  context.save()
  context.translate(at.x, at.y)
  context.rotate(at.angle)
  context.fillStyle = thread
  context.beginPath()
  context.moveTo(0, 0)
  context.quadraticCurveTo(at.length * 0.5, -at.length * 0.32, at.length, 0)
  context.quadraticCurveTo(at.length * 0.5, at.length * 0.32, 0, 0)
  context.fill()
  context.strokeStyle = hole
  context.lineWidth = 1.6
  context.beginPath()
  context.moveTo(at.length * 0.12, 0)
  context.lineTo(at.length * 0.82, 0)
  context.stroke()
  context.restore()
}

function flowersOf(random: Random): Flower[] {
  const cells = 4
  const cell = fieldSize / cells
  const flowers: Flower[] = []
  for (let row = 0; row < cells; row += 1) {
    for (let column = 0; column < cells; column += 1) {
      if ((row + column) % 2 === 0) {
        flowers.push({
          x: (column + 0.5) * cell + (random() - 0.5) * cell * 0.3,
          y: (row + 0.5) * cell + (random() - 0.5) * cell * 0.3,
          radius: cell * (0.4 + random() * 0.06),
          turn: random() * Math.PI,
        })
      }
    }
  }
  return flowers
}

function drawVines(
  context: CanvasRenderingContext2D,
  flowers: readonly Flower[],
  random: Random
) {
  const cell = fieldSize / 4
  context.strokeStyle = thread
  context.lineWidth = 5
  for (const flower of flowers) {
    for (const [dx, dy] of [
      [cell, cell],
      [cell, -cell],
    ] as const) {
      const bend = (random() - 0.5) * cell * 0.6
      const endX = flower.x + dx
      const endY = flower.y + dy
      context.beginPath()
      context.moveTo(flower.x, flower.y)
      context.quadraticCurveTo(
        flower.x + dx / 2 + bend,
        flower.y + dy / 2 - bend,
        endX,
        endY
      )
      context.stroke()
      const midX = flower.x + dx / 2 + bend / 2
      const midY = flower.y + dy / 2 - bend / 2
      const angle = Math.atan2(dy, dx)
      drawLeaf(context, { x: midX, y: midY, angle: angle + 1.1, length: 34 })
      drawLeaf(context, { x: midX, y: midY, angle: angle - 2.0, length: 28 })
    }
  }
}

function paintLaceField(context: CanvasRenderingContext2D) {
  const random = createRandom(41)
  context.fillStyle = hole
  context.fillRect(0, 0, fieldSize, fieldSize)
  paintNet(context)
  const flowers = flowersOf(random)
  const vineRandom = createRandom(43)
  wrapped(context, (target) => drawVines(target, flowers, vineRandom))
  wrapped(context, (target) => {
    for (const flower of flowers) {
      drawFlower(target, flower)
    }
  })
}

// One scallop of the hem: opaque above its rounded edge, picots along it
// and a row of eyelets inside.
function paintLaceHem(context: CanvasRenderingContext2D) {
  const size = hemSize
  const edge = (x: number) =>
    size - 6 - (1 - Math.sin((x / size) * Math.PI)) * size * 0.3
  context.clearRect(0, 0, size, size)
  context.fillStyle = thread
  context.beginPath()
  context.moveTo(0, 0)
  for (let x = 0; x <= size; x += 2) {
    context.lineTo(x, edge(x))
  }
  context.lineTo(size, 0)
  context.closePath()
  context.fill()
  for (let x = 6; x < size; x += 12) {
    context.beginPath()
    context.arc(x, edge(x) + 2, 3, 0, Math.PI * 2)
    context.fill()
  }
  context.globalCompositeOperation = "destination-out"
  for (const x of [34, 64, 94]) {
    context.beginPath()
    context.arc(x, edge(x) - 22, 6, 0, Math.PI * 2)
    context.fill()
  }
  context.globalCompositeOperation = "source-over"
}

let field: CanvasTexture | null = null
let hem: CanvasTexture | null = null

// The lace's openwork as an alpha map (net, flowers, vines), tiling.
export function laceFieldTexture() {
  if (field) {
    return field
  }
  field = createCanvasTexture({
    width: fieldSize,
    height: fieldSize,
    colorSpace: NoColorSpace,
    paint: paintLaceField,
  })
  field.wrapS = RepeatWrapping
  field.wrapT = RepeatWrapping
  return field
}

// The scalloped hem's cut as the map's alpha, read through the second UV
// set: it repeats along the hem and stays opaque above it.
export function laceHemTexture() {
  if (hem) {
    return hem
  }
  hem = createCanvasTexture({
    width: hemSize,
    height: hemSize,
    colorSpace: SRGBColorSpace,
    paint: paintLaceHem,
  })
  hem.wrapS = RepeatWrapping
  hem.wrapT = ClampToEdgeWrapping
  hem.channel = 1
  return hem
}
