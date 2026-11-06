export type DamaskPaintOptions = {
  width: number
  height: number
  seed: number
  ground: string
  ink: string
  inkAlpha: number
  stripeAlpha: number
  grainAlpha: number
}

type Point = { x: number; y: number }
type Rgb = { r: number; g: number; b: number }
type Sampler = (u: number, v: number) => number
type Numbers = readonly number[]

type MotifShapes = {
  drops: readonly Numbers[]
  rings: readonly Numbers[]
  ovals: readonly Numbers[]
  scrolls: readonly Numbers[]
  leaves: readonly Numbers[]
  dots: readonly Numbers[]
}

const designWidth = 256
const designHeight = 512
const stripesPerTile = 24
const fullTurn = 2 * Math.PI

const mainMotif: MotifShapes = {
  drops: [
    [-104, 36, 38],
    [-228, -150, 13],
    [224, 166, 13],
  ],
  rings: [
    [-84, 22, 26, 3.5],
    [-58, 10, 13, 2.5],
    [-214, -160, 6, 2],
    [212, 176, 6, 2],
  ],
  ovals: [
    [0, -146, 22, 5],
    [0, 48, 36, 6],
    [0, 74, 16, 10],
    [0, 102, 3.5, 22],
    [0, 128, 18, 5],
    [0, 156, 9, 6],
  ],
  scrolls: [
    [6, 66, 92, 84, 116, -40, 0, 30, 1.2, -1, 5, 14, 2.5],
    [8, -146, 54, -138, 44, -196, 2, 14, 1, 1, 4, 13, 2],
    [6, 130, 30, 176, 96, 176, 1, 20, 1.1, -1, 4, 10, 2],
  ],
  leaves: [
    [108, 34, 140, 62, 9, 6],
    [114, 4, 144, 14, 8, 4],
    [22, 44, 70, -14, 13, 7],
    [24, -146, 92, -160, 10, -6],
    [30, -140, 84, -110, 8, 5],
    [12, 130, 70, 112, 9, -5],
    [14, 138, 52, 214, 10, 6],
    [100, 178, 132, 210, 7, -4],
  ],
  dots: [
    [62, -226, 3],
    [96, -186, 2.6],
    [124, -96, 2.6],
    [34, 104, 3],
    [46, 160, 2.4],
  ],
}

const fillerMotif: MotifShapes = {
  drops: [
    [-24, -4, 7],
    [24, 4, 7],
  ],
  rings: [],
  ovals: [[0, 0, 7, 7]],
  scrolls: [[6, 2, 36, 16, 64, 10, 1, 11, 1, -1, 3, 6, 1.5]],
  leaves: [
    [30, 8, 58, -18, 7, -4],
    [34, 12, 66, 30, 6, 4],
  ],
  dots: [[86, 0, 2.6]],
}

const point = (x: number, y: number): Point => ({ x, y })

function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function sampleColor(context: CanvasRenderingContext2D, color: string): Rgb {
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return { r, g, b }
}

const smooth = (value: number) => value * value * (3 - 2 * value)

function createPeriodicNoise(random: () => number, cells: Point): Sampler {
  const values = Float32Array.from({ length: cells.x * cells.y }, random)
  const at = (x: number, y: number) => values[y * cells.x + x] ?? 0
  return (u, v) => {
    const x = (u - Math.floor(u)) * cells.x
    const y = (v - Math.floor(v)) * cells.y
    const x0 = Math.floor(x) % cells.x
    const y0 = Math.floor(y) % cells.y
    const x1 = (x0 + 1) % cells.x
    const y1 = (y0 + 1) % cells.y
    const tx = smooth(x - Math.floor(x))
    const ty = smooth(y - Math.floor(y))
    const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx
    const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx
    return top * (1 - ty) + bottom * ty
  }
}

function createFbm(
  random: () => number,
  cells: Point,
  octaves: number
): Sampler {
  const layers = Array.from({ length: octaves }, (_, index) =>
    createPeriodicNoise(
      random,
      point(cells.x * 2 ** index, cells.y * 2 ** index)
    )
  )
  return (u, v) => {
    let sum = 0
    let total = 0
    let weight = 1
    for (const layer of layers) {
      sum += layer(u, v) * weight
      total += weight
      weight *= 0.5
    }
    return sum / total
  }
}

function cubicPoints(controls: readonly Point[]): Point[] {
  const [p0 = point(0, 0), p1 = p0, p2 = p1, p3 = p2] = controls
  return Array.from({ length: 24 }, (_, index) => {
    const t = index / 23
    const s = 1 - t
    const weights = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t]
    const [a = 0, b = 0, c = 0, d = 0] = weights
    return point(
      a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      a * p0.y + b * p1.y + c * p2.y + d * p3.y
    )
  })
}

function scrollPoints(scroll: Numbers): Point[] {
  const [sx = 0, sy = 0, px = 0, py = 0, ex = 0, ey = 0] = scroll
  const [quarterTurns = 0, radius = 1, turns = 1, direction = 1] =
    scroll.slice(6)
  const angle = (quarterTurns * Math.PI) / 2
  const center = point(
    ex - radius * Math.cos(angle),
    ey - radius * Math.sin(angle)
  )
  const handle = Math.hypot(ex - sx, ey - sy) * 0.4
  const tx = -Math.sin(angle) * direction * handle
  const ty = Math.cos(angle) * direction * handle
  const stem = cubicPoints([
    point(sx, sy),
    point(px, py),
    point(ex - tx, ey - ty),
    point(ex, ey),
  ])
  const spiral = Array.from({ length: 40 }, (_, index) => {
    const t = (index + 1) / 40
    const theta = angle + direction * t * turns * fullTurn
    const distance = radius * 0.28 ** t
    return point(
      center.x + distance * Math.cos(theta),
      center.y + distance * Math.sin(theta)
    )
  })
  return [...stem, ...spiral]
}

function fillRibbon(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  widths: Numbers
) {
  const [start = 1, peak = 1, end = 1] = widths
  const last = points.length - 1
  const left: Point[] = []
  const right: Point[] = []
  points.forEach((current, index) => {
    const previous = points[Math.max(0, index - 1)] ?? current
    const next = points[Math.min(last, index + 1)] ?? current
    const length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1
    const t = index / last
    const swell = Math.max(0, t < 0.35 ? t / 0.35 : (1 - t) / 0.65)
    const base = start * (1 - t) + end * t
    const half = (base + (peak - base) * swell) / 2
    const nx = (-(next.y - previous.y) / length) * half
    const ny = ((next.x - previous.x) / length) * half
    left.push(point(current.x + nx, current.y + ny))
    right.unshift(point(current.x - nx, current.y - ny))
  })
  context.beginPath()
  for (const vertex of [...left, ...right]) context.lineTo(vertex.x, vertex.y)
  context.closePath()
  context.fill()
  const tail = points[last] ?? point(0, 0)
  context.beginPath()
  context.arc(tail.x, tail.y, end * 1.3, 0, fullTurn)
  context.fill()
}

function teardropPath(context: CanvasRenderingContext2D, drop: Numbers) {
  const [tip = 0, end = 0, hw = 0] = drop
  const at = (t: number) => tip + (end - tip) * t
  const curves = [
    [hw * 0.25, at(0.25), hw, at(0.45), hw, at(0.68)],
    [hw, at(0.9), hw * 0.55, end, 0, end],
    [-hw * 0.55, end, -hw, at(0.9), -hw, at(0.68)],
    [-hw, at(0.45), -hw * 0.25, at(0.25), 0, tip],
  ]
  context.beginPath()
  context.moveTo(0, tip)
  for (const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] of curves) {
    context.bezierCurveTo(a, b, c, d, e, f)
  }
  context.closePath()
}

function drawLeaf(context: CanvasRenderingContext2D, leaf: Numbers) {
  const [bx = 0, by = 0, tx = 0, ty = 0, width = 1, bend = 0] = leaf
  const dx = tx - bx
  const dy = ty - by
  const length = Math.hypot(dx, dy) || 1
  const along = (t: number, side: number) =>
    point(
      bx + dx * t - (dy / length) * side,
      by + dy * t + (dx / length) * side
    )
  const a1 = along(0.25, width)
  const a2 = along(0.7, width * 0.8 + bend)
  const b1 = along(0.75, bend - width * 0.3)
  const b2 = along(0.3, -width * 0.6)
  context.beginPath()
  context.moveTo(bx, by)
  context.bezierCurveTo(a1.x, a1.y, a2.x, a2.y, tx, ty)
  context.bezierCurveTo(b1.x, b1.y, b2.x, b2.y, bx, by)
  context.fill()
  const ribStart = along(0.12, 0)
  const ribControl = along(0.45, bend * 0.45 + width * 0.15)
  const ribEnd = along(0.78, bend * 0.6)
  context.globalCompositeOperation = "destination-out"
  context.lineWidth = Math.max(1.2, width * 0.18)
  context.beginPath()
  context.moveTo(ribStart.x, ribStart.y)
  context.quadraticCurveTo(ribControl.x, ribControl.y, ribEnd.x, ribEnd.y)
  context.stroke()
  context.globalCompositeOperation = "source-over"
}

function drawHalf(context: CanvasRenderingContext2D, shapes: MotifShapes) {
  for (const scroll of shapes.scrolls) {
    fillRibbon(context, scrollPoints(scroll), scroll.slice(10))
  }
  for (const leaf of shapes.leaves) drawLeaf(context, leaf)
  for (const [x = 0, y = 0, radius = 1] of shapes.dots) {
    context.beginPath()
    context.arc(x, y, radius, 0, fullTurn)
    context.fill()
  }
}

function drawMotif(context: CanvasRenderingContext2D, shapes: MotifShapes) {
  for (const drop of shapes.drops) {
    teardropPath(context, drop)
    context.fill()
  }
  for (const [x = 0, y = 0, rx = 1, ry = 1] of shapes.ovals) {
    context.beginPath()
    context.ellipse(x, y, rx, ry, 0, 0, fullTurn)
    context.fill()
  }
  drawHalf(context, shapes)
  context.save()
  context.scale(-1, 1)
  drawHalf(context, shapes)
  context.restore()
  context.globalCompositeOperation = "destination-out"
  for (const ring of shapes.rings) {
    context.lineWidth = ring[3] ?? 1
    teardropPath(context, ring)
    context.stroke()
  }
  context.globalCompositeOperation = "source-over"
}

function drawMotifMask(
  context: CanvasRenderingContext2D,
  options: DamaskPaintOptions
) {
  const cellWidth = options.width / 2
  const cellHeight = options.height / 2
  const scaleX = cellWidth / designWidth
  const scaleY = cellHeight / designHeight
  context.fillStyle = options.ink
  context.strokeStyle = options.ink
  context.lineCap = "round"
  for (const column of [0, 1]) {
    const drop = column * cellHeight * 0.5
    for (const row of [-1, 0, 1, 2]) {
      for (const shift of [-1, 0, 1]) {
        const x = cellWidth * (column + 0.5) + shift * options.width
        const y = cellHeight * row + drop
        context.setTransform(scaleX, 0, 0, scaleY, x, y + cellHeight / 2)
        drawMotif(context, mainMotif)
        context.setTransform(scaleX, 0, 0, scaleY, x, y)
        drawMotif(context, fillerMotif)
      }
    }
  }
  context.setTransform(1, 0, 0, 1, 0, 0)
}

function stripeCoverage(width: number): Float32Array {
  const spacing = width / stripesPerTile
  const lineWidth = Math.max(1, width / 420)
  return Float32Array.from({ length: width }, (_, x) => {
    const offset = (x + 0.5) % spacing
    const distance = Math.min(offset, spacing - offset)
    const twin = Math.abs(distance - spacing * 0.16)
    const main = Math.min(1, Math.max(0, lineWidth / 2 + 0.5 - distance))
    const faint = Math.min(1, Math.max(0, 1 - twin)) * 0.45
    return Math.min(1, main + faint)
  })
}

function lineNoise(random: () => number, length: number): Float32Array {
  const raw = Float32Array.from({ length }, random)
  const at = (index: number) => raw[(index + length) % length] ?? 0
  return raw.map((value, index) => (value + at(index + 1) + at(index - 1)) / 3)
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

export function paintDamask(
  context: CanvasRenderingContext2D,
  options: DamaskPaintOptions
): void {
  const { width, height } = options
  const random = createRandom(options.seed)
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = "source-over"
  const ground = sampleColor(context, options.ground)
  const ink = sampleColor(context, options.ink)
  context.clearRect(0, 0, width, height)
  drawMotifMask(context, options)
  const mask = context.getImageData(0, 0, width, height).data
  const output = context.createImageData(width, height)
  const wear = createFbm(random, point(3, 6), 4)
  const mottle = createFbm(random, point(6, 12), 3)
  const rows = lineNoise(random, height)
  const columns = lineNoise(random, width)
  const stripes = stripeCoverage(width)
  for (let y = 0; y < height; y += 1) {
    const v = y / height
    const row = rows[y] ?? 0
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const u = x / width
      const worn = wear(u, v)
      const coverage = (mask[index + 3] ?? 0) / 255
      const motif = coverage * options.inkAlpha * (0.45 + 0.75 * worn)
      const stripe = (stripes[x] ?? 0) * options.stripeAlpha * (0.5 + worn)
      const grain =
        options.grainAlpha *
        (0.45 * random() +
          0.2 * row +
          0.15 * (columns[x] ?? 0) +
          0.4 * mottle(u, v))
      const layer = (from: number, to: number) =>
        mix(
          mix(mix(from, to, stripe), to, motif * (0.88 + 0.12 * row)),
          to,
          grain
        )
      output.data[index] = layer(ground.r, ink.r)
      output.data[index + 1] = layer(ground.g, ink.g)
      output.data[index + 2] = layer(ground.b, ink.b)
      output.data[index + 3] = 255
    }
  }
  context.putImageData(output, 0, 0)
  context.restore()
}
