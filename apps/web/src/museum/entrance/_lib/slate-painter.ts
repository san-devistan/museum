import {
  createRandom,
  type HeightField,
} from "@/museum/_lib/relief/height-field"

type Canvas2D = CanvasRenderingContext2D

export type SlateColors = {
  slate: string
  shade: string
  bloom: string
}

/** One tile of fish-scale slates: whole courses and columns, so it repeats. */
export const slateTile = { columns: 12, courses: 16 }

type SlateCell = { tone: number; bloom: number }

function slateCells(seed: number): SlateCell[] {
  const random = createRandom(seed)
  return Array.from({ length: slateTile.columns * slateTile.courses }, () => ({
    tone: 0.62 + random() * 0.5,
    bloom: random() > 0.88 ? 0.2 + random() * 0.35 : 0,
  }))
}

type SlateRect = { x: number; y: number; width: number; height: number }

/** A slate's outline: square shoulders, a round tail pointing downhill. */
function slatePath(context: Canvas2D, slate: SlateRect) {
  const radius = slate.width / 2
  const tail = slate.y + slate.height
  context.beginPath()
  context.moveTo(slate.x, slate.y)
  context.lineTo(slate.x + slate.width, slate.y)
  context.lineTo(slate.x + slate.width, tail - radius)
  context.arc(slate.x + radius, tail - radius, radius, 0, Math.PI)
  context.closePath()
}

function forEachSlate(
  canvas: { width: number; height: number },
  draw: (slate: SlateRect, cell: number) => void
) {
  const width = canvas.width / slateTile.columns
  const course = canvas.height / slateTile.courses
  // Downhill courses first: each course up the roof laps over the one below.
  for (let row = slateTile.courses + 1; row >= -2; row -= 1) {
    const shift = row % 2 === 0 ? 0 : width / 2
    for (let column = -1; column <= slateTile.columns; column += 1) {
      const wrappedRow =
        ((row % slateTile.courses) + slateTile.courses) % slateTile.courses
      const wrappedColumn =
        ((column % slateTile.columns) + slateTile.columns) % slateTile.columns
      draw(
        {
          x: column * width + shift,
          y: row * course - course * 1.1,
          width,
          height: course * 2.1,
        },
        wrappedRow * slateTile.columns + wrappedColumn
      )
    }
  }
}

function tint(hex: string, scale: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) =>
    Math.min(255, Math.round(((value >> shift) & 255) * scale))
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`
}

/** Scalloped slates, each a little different, shadowed under their tails. */
export function paintSlates(
  context: Canvas2D,
  spec: { seed: number; colors: SlateColors }
) {
  const cells = slateCells(spec.seed)
  const { canvas } = context
  context.fillStyle = spec.colors.shade
  context.fillRect(0, 0, canvas.width, canvas.height)
  forEachSlate(canvas, (slate, index) => {
    const cell = cells[index]
    if (!cell) {
      return
    }
    context.save()
    context.translate(0, 3)
    slatePath(context, slate)
    context.fillStyle = spec.colors.shade
    context.globalAlpha = 0.85
    context.fill()
    context.restore()
    slatePath(context, slate)
    const fade = context.createLinearGradient(
      0,
      slate.y,
      0,
      slate.y + slate.height
    )
    fade.addColorStop(0, tint(spec.colors.slate, cell.tone * 0.7))
    fade.addColorStop(1, tint(spec.colors.slate, cell.tone * 1.12))
    context.globalAlpha = 1
    context.fillStyle = fade
    context.fill()
    if (cell.bloom > 0) {
      context.globalAlpha = cell.bloom
      context.fillStyle = spec.colors.bloom
      context.fill()
      context.globalAlpha = 1
    }
  })
}

/** Grey relief for the normal map: each slate thickens towards its tail. */
export function paintSlateRelief(context: Canvas2D) {
  const { canvas } = context
  context.fillStyle = "rgb(0 0 0)"
  context.fillRect(0, 0, canvas.width, canvas.height)
  forEachSlate(canvas, (slate) => {
    slatePath(context, slate)
    const rise = context.createLinearGradient(
      0,
      slate.y,
      0,
      slate.y + slate.height
    )
    rise.addColorStop(0, "rgb(40 40 40)")
    rise.addColorStop(1, "rgb(230 230 230)")
    context.fillStyle = rise
    context.fill()
  })
}

export function readHeightField(context: Canvas2D): HeightField {
  const { width, height } = context.canvas
  const pixels = context.getImageData(0, 0, width, height).data
  const values = new Float32Array(width * height)
  for (let index = 0; index < values.length; index += 1) {
    values[index] = (pixels[index * 4] ?? 0) / 255
  }
  return { width, height, values }
}

function spear(context: Canvas2D, x: number, spec: { top: number }) {
  const { height } = context.canvas
  context.beginPath()
  context.moveTo(x, height * 0.86)
  context.lineTo(x, spec.top + 14)
  context.stroke()
  context.beginPath()
  context.moveTo(x, spec.top)
  context.quadraticCurveTo(x + 9, spec.top + 12, x, spec.top + 22)
  context.quadraticCurveTo(x - 9, spec.top + 12, x, spec.top)
  context.fill()
}

function curl(context: Canvas2D, x: number, side: 1 | -1, top: number) {
  context.beginPath()
  context.moveTo(x, top + 34)
  context.bezierCurveTo(
    x + side * 26,
    top + 30,
    x + side * 34,
    top + 6,
    x + side * 18,
    top + 2
  )
  context.stroke()
  context.beginPath()
  context.arc(x + side * 15, top + 8, 5, 0, Math.PI * 2)
  context.fill()
}

/**
 * Iron cresting, one bay per tile: a rail, a ring of lace between the
 * posts, a tall fleur spear in the middle and pearl-headed posts at the ends.
 */
export function paintCresting(context: Canvas2D) {
  const { width, height } = context.canvas
  context.clearRect(0, 0, width, height)
  context.strokeStyle = "rgb(255 255 255)"
  context.fillStyle = "rgb(255 255 255)"
  context.lineCap = "round"
  context.lineWidth = 11
  context.fillRect(0, height * 0.84, width, height * 0.1)
  context.fillRect(0, height * 0.6, width, 5)
  for (const center of [width * 0.25, width * 0.75]) {
    context.beginPath()
    context.arc(center, height * 0.72, height * 0.1, 0, Math.PI * 2)
    context.stroke()
  }
  const middle = width / 2
  spear(context, middle, { top: height * 0.04 })
  curl(context, middle, -1, height * 0.3)
  curl(context, middle, 1, height * 0.3)
  for (const post of [0, width]) {
    context.beginPath()
    context.moveTo(post, height * 0.86)
    context.lineTo(post, height * 0.36)
    context.stroke()
    context.beginPath()
    context.arc(post, height * 0.33, 9, 0, Math.PI * 2)
    context.fill()
  }
}
