import { createRandom } from "@/museum/_lib/relief/height-field"
import type { Point2 } from "@/museum/entrance/_lib/manor-arches"

type Canvas2D = CanvasRenderingContext2D

export type CurtainColors = {
  room: string
  glow: string
  core: string
  lace: string
}

function radialGlow(
  context: Canvas2D,
  spec: { x: number; y: number; radius: number; color: string; alpha: number }
) {
  const gradient = context.createRadialGradient(
    spec.x,
    spec.y,
    0,
    spec.x,
    spec.y,
    spec.radius
  )
  gradient.addColorStop(0, spec.color)
  gradient.addColorStop(1, `${spec.color}00`)
  context.globalAlpha = spec.alpha
  context.fillStyle = gradient
  context.fillRect(
    spec.x - spec.radius,
    spec.y - spec.radius,
    spec.radius * 2,
    spec.radius * 2
  )
  context.globalAlpha = 1
}

function paintFolds(context: Canvas2D, room: string) {
  const { width, height } = context.canvas
  context.fillStyle = room
  for (let x = 0; x < width; x += 1) {
    const fold = Math.sin((x / width) * Math.PI * 2 * 3.5 + 0.8)
    context.globalAlpha = 0.18 + 0.2 * fold
    context.fillRect(x, 0, 1, height)
  }
  context.globalAlpha = 1
}

function paintNet(context: Canvas2D) {
  const { width, height } = context.canvas
  context.lineWidth = 0.6
  context.globalAlpha = 0.1
  context.beginPath()
  for (let start = -height; start < width; start += 5) {
    context.moveTo(start, 0)
    context.lineTo(start + height * 0.5, height)
    context.moveTo(start + height * 0.5, 0)
    context.lineTo(start, height)
  }
  context.stroke()
}

function paintMedallion(context: Canvas2D, x: number, y: number) {
  const radius = 9
  context.globalAlpha = 0.26
  context.lineWidth = 1
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.stroke()
  for (let petal = 0; petal < 6; petal += 1) {
    const angle = (petal / 6) * Math.PI * 2
    context.beginPath()
    context.ellipse(
      x + Math.cos(angle) * 4.2,
      y + Math.sin(angle) * 4.2,
      3.8,
      1.8,
      angle,
      0,
      Math.PI * 2
    )
    context.stroke()
  }
  context.globalAlpha = 0.4
  context.beginPath()
  context.arc(x, y, 1.6, 0, Math.PI * 2)
  context.fill()
}

function paintHem(context: Canvas2D, bottom: number) {
  const { width } = context.canvas
  context.globalAlpha = 0.55
  context.lineWidth = 1.6
  for (let row = 0; row < 3; row += 1) {
    const y = bottom - 10 - row * 9
    context.beginPath()
    for (let x = 0; x < width; x += 16) {
      context.moveTo(x, y)
      context.arc(x + 8, y, 8, Math.PI, 0, true)
    }
    context.stroke()
  }
}

/** The room behind the glass: candlelight through a parted lace curtain. */
export function paintCurtain(context: Canvas2D, colors: CurtainColors) {
  const { width, height } = context.canvas
  context.fillStyle = colors.room
  context.fillRect(0, 0, width, height)
  radialGlow(context, {
    x: width * 0.5,
    y: height * 0.86,
    radius: height * 0.75,
    color: colors.glow,
    alpha: 0.55,
  })
  radialGlow(context, {
    x: width * 0.52,
    y: height * 0.93,
    radius: height * 0.2,
    color: colors.core,
    alpha: 0.45,
  })
  paintFolds(context, colors.room)
  context.strokeStyle = colors.lace
  context.fillStyle = colors.lace
  paintNet(context)
  for (let row = 0; row * 38 < height; row += 1) {
    for (let column = 0; column * 40 < width + 40; column += 1) {
      paintMedallion(context, column * 40 + (row % 2) * 20, 24 + row * 38)
    }
  }
  paintHem(context, height)
  const shade = context.createLinearGradient(0, 0, 0, height * 0.55)
  shade.addColorStop(0, colors.room)
  shade.addColorStop(1, `${colors.room}00`)
  context.globalAlpha = 0.85
  context.fillStyle = shade
  context.fillRect(0, 0, width, height * 0.55)
  context.globalAlpha = 1
}

export type GlassSpec = {
  /** Window outline in canvas pixels. */
  opening: readonly Point2[]
  /** Tracery strokes in canvas pixels. */
  tracery: readonly (readonly Point2[])[]
  oculus: { center: Point2; radius: number }
  colors: { tint: string; sheen: string; lead: string; stone: string }
}

function strokePolyline(context: Canvas2D, points: readonly Point2[]) {
  context.beginPath()
  for (const [x, y] of points) {
    context.lineTo(x, y)
  }
  context.stroke()
}

function paintLeading(context: Canvas2D, lead: string) {
  const { width, height } = context.canvas
  const cell = { x: width / 6, y: width / 3.6 }
  context.strokeStyle = lead
  context.lineWidth = 1.8
  context.globalAlpha = 0.9
  context.beginPath()
  for (let start = -height; start < width + height; start += cell.x) {
    context.moveTo(start, 0)
    context.lineTo(start + (height * cell.x) / cell.y, height)
    context.moveTo(start, 0)
    context.lineTo(start - (height * cell.x) / cell.y, height)
  }
  context.stroke()
  context.globalAlpha = 1
}

function paintTracery(context: Canvas2D, spec: GlassSpec) {
  const strokes = [...spec.tracery, spec.opening]
  context.lineJoin = "round"
  context.lineCap = "round"
  context.strokeStyle = spec.colors.lead
  context.lineWidth = 13
  context.globalAlpha = 0.7
  for (const points of strokes) {
    strokePolyline(
      context,
      points.map(([x, y]) => [x + 2, y + 2] as const)
    )
  }
  context.globalAlpha = 1
  context.strokeStyle = spec.colors.stone
  context.lineWidth = 10
  for (const points of strokes) {
    strokePolyline(context, points)
  }
  context.beginPath()
  context.arc(...spec.oculus.center, spec.oculus.radius, 0, Math.PI * 2)
  context.stroke()
}

/** Leaded quarries, moon sheen and stone tracery; the panes stay see-through. */
export function paintLeadedGlass(context: Canvas2D, spec: GlassSpec) {
  const { width, height } = context.canvas
  context.clearRect(0, 0, width, height)
  context.fillStyle = spec.colors.tint
  context.globalAlpha = 0.3
  context.fillRect(0, 0, width, height)
  const sheen = context.createLinearGradient(0, 0, width, height * 0.6)
  sheen.addColorStop(0, spec.colors.sheen)
  sheen.addColorStop(0.55, `${spec.colors.sheen}00`)
  context.globalAlpha = 0.22
  context.fillStyle = sheen
  context.fillRect(0, 0, width, height)
  paintLeading(context, spec.colors.lead)
  paintTracery(context, spec)
}

export type FanlightColors = CurtainColors & { lead: string; stone: string }

function paintFan(context: Canvas2D, lead: string) {
  const { width, height } = context.canvas
  const hub = { x: width / 2, y: height + 6 }
  context.strokeStyle = lead
  context.globalAlpha = 0.9
  context.lineWidth = 2
  context.beginPath()
  for (let spoke = 1; spoke < 24; spoke += 1) {
    const angle = Math.PI * (1 - spoke / 24)
    context.moveTo(hub.x, hub.y)
    context.lineTo(
      hub.x + Math.cos(angle) * width,
      hub.y - Math.sin(angle) * width
    )
  }
  for (const radius of [height * 0.55, height * 1.4, height * 3]) {
    context.moveTo(hub.x + radius, hub.y)
    context.arc(hub.x, hub.y, radius, 0, Math.PI, true)
  }
  context.stroke()
  context.globalAlpha = 1
}

/** Thin transom light over the door: a leaded fan, lit from the hall. */
export function paintFanlight(context: Canvas2D, colors: FanlightColors) {
  const { width, height } = context.canvas
  context.fillStyle = colors.room
  context.fillRect(0, 0, width, height)
  radialGlow(context, {
    x: width / 2,
    y: height,
    radius: width * 0.42,
    color: colors.glow,
    alpha: 0.7,
  })
  radialGlow(context, {
    x: width / 2,
    y: height,
    radius: width * 0.12,
    color: colors.core,
    alpha: 0.5,
  })
  paintFan(context, colors.lead)
  context.fillStyle = colors.stone
  context.beginPath()
  context.arc(width / 2, height + 6, height * 0.42, 0, Math.PI, true)
  context.fill()
}

/** Soft, horizontally tiling mist that thins out towards the top. */
export function paintMist(
  context: Canvas2D,
  spec: { seed: number; color: string }
) {
  const { width, height } = context.canvas
  const random = createRandom(spec.seed)
  context.clearRect(0, 0, width, height)
  for (let index = 0; index < 160; index += 1) {
    const radius = height * (0.12 + random() ** 2 * 0.7)
    const x = random() * width
    const y = height * (1 - random() ** 1.4 * 0.75)
    const alpha = 0.02 + random() ** 2 * 0.14
    for (const column of [-width, 0, width]) {
      radialGlow(context, {
        x: x + column,
        y,
        radius,
        color: spec.color,
        alpha,
      })
    }
  }
  const fade = context.createLinearGradient(0, 0, 0, height)
  fade.addColorStop(0, `${spec.color}00`)
  fade.addColorStop(0.6, spec.color)
  context.globalCompositeOperation = "destination-in"
  context.fillStyle = fade
  context.fillRect(0, 0, width, height)
  context.globalCompositeOperation = "source-over"
}

/** Lace motifs repeat every this many pixels, so the mask tiles seamlessly. */
export const laceMaskSize = { width: 240, height: 228 }

const laceRepeat = { column: 40, row: 38, net: 6 }

function paintPeriodicNet(context: Canvas2D) {
  const { width, height } = context.canvas
  context.lineWidth = 0.7
  context.globalAlpha = 0.22
  context.beginPath()
  for (let start = -height; start <= width + height; start += laceRepeat.net) {
    context.moveTo(start, 0)
    context.lineTo(start + height * 0.5, height)
    context.moveTo(start, 0)
    context.lineTo(start - height * 0.5, height)
  }
  context.stroke()
}

/**
 * White lace on black for shaders to light from behind: the curtain's net
 * and medallions, laid out on whole repeats so the tile wraps cleanly.
 */
export function paintLaceMask(
  context: Canvas2D,
  colors: { thread: string; ground: string }
) {
  const { width, height } = context.canvas
  context.fillStyle = colors.ground
  context.fillRect(0, 0, width, height)
  context.strokeStyle = colors.thread
  context.fillStyle = colors.thread
  paintPeriodicNet(context)
  const rows = Math.round(height / laceRepeat.row)
  const columns = Math.round(width / laceRepeat.column)
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * laceRepeat.column + (row % 2) * (laceRepeat.column / 2)
      const y = laceRepeat.row / 2 + row * laceRepeat.row
      for (const wrapX of [-width, 0, width]) {
        for (const wrapY of [-height, 0, height]) {
          paintMedallion(context, x + wrapX, y + wrapY)
        }
      }
    }
  }
  context.globalAlpha = 1
}
