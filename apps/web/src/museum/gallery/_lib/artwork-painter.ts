export type ArtworkMotif = "blocks" | "circles" | "stripes" | "horizon" | "grid"

export type PaintOptions = {
  width: number
  height: number
  seed: number
  motif: ArtworkMotif
  palette: readonly string[]
}

type Random = () => number

type Scene = {
  context: CanvasRenderingContext2D
  width: number
  height: number
  random: Random
  colors: readonly string[]
}

type Rect = { x: number; y: number; width: number; height: number }

type Painter = (scene: Scene) => void

function createRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function between(random: Random, min: number, max: number): number {
  return min + random() * (max - min)
}

function pickColors(random: Random, palette: readonly string[]): string[] {
  const pool = [...palette]
  const count = Math.min(pool.length, 3 + Math.floor(random() * 3))
  const picked: string[] = []
  while (picked.length < count) {
    const [color] = pool.splice(Math.floor(random() * pool.length), 1)
    if (color === undefined) {
      break
    }
    picked.push(color)
  }
  return picked
}

function colorAt(colors: readonly string[], index: number): string {
  if (colors.length === 0) {
    return ""
  }
  return colors.at(index % colors.length) ?? ""
}

function accentColor(scene: Scene, exclude?: string): string {
  const accents = scene.colors.slice(1).filter((color) => color !== exclude)
  const pool = accents.length > 0 ? accents : scene.colors
  return colorAt(pool, Math.floor(scene.random() * pool.length))
}

function fillRect(scene: Scene, rect: Rect, color: string): void {
  scene.context.fillStyle = color
  scene.context.fillRect(rect.x, rect.y, rect.width, rect.height)
}

function splitRect(rect: Rect, random: Random, gap: number): Rect[] {
  const ratio = between(random, 0.3, 0.7)
  if (rect.width >= rect.height) {
    const first = rect.width * ratio - gap / 2
    return [
      { ...rect, width: first },
      { ...rect, x: rect.x + first + gap, width: rect.width - first - gap },
    ]
  }
  const first = rect.height * ratio - gap / 2
  return [
    { ...rect, height: first },
    { ...rect, y: rect.y + first + gap, height: rect.height - first - gap },
  ]
}

function paintBlocks(scene: Scene): void {
  const { width, height, random } = scene
  const gap = Math.min(width, height) * 0.035
  let rects: Rect[] = [
    { x: gap, y: gap, width: width - gap * 2, height: height - gap * 2 },
  ]
  const splits = 4 + Math.floor(random() * 4)
  for (let index = 0; index < splits; index += 1) {
    const largest = rects.reduce<Rect | undefined>(
      (best, rect) =>
        best === undefined ||
        rect.width * rect.height > best.width * best.height
          ? rect
          : best,
      undefined
    )
    const target =
      random() < 0.3 ? rects[Math.floor(random() * rects.length)] : largest
    if (target === undefined) {
      break
    }
    rects = [
      ...rects.filter((rect) => rect !== target),
      ...splitRect(target, random, gap),
    ]
  }
  for (const rect of rects) {
    const color =
      random() < 0.35 ? colorAt(scene.colors, 1) : accentColor(scene)
    fillRect(scene, rect, color)
  }
}

function paintCircles(scene: Scene): void {
  const { context, width, height, random } = scene
  const base = Math.min(width, height)
  const count = 3 + Math.floor(random() * 3)
  let previous = ""
  for (let index = 0; index < count; index += 1) {
    const color = accentColor(scene, previous)
    previous = color
    context.globalAlpha = between(random, 0.75, 0.95)
    context.fillStyle = color
    context.beginPath()
    context.arc(
      between(random, 0.15, 0.85) * width,
      between(random, 0.15, 0.85) * height,
      between(random, 0.18, 0.42) * base,
      0,
      Math.PI * 2
    )
    context.fill()
  }
  context.globalAlpha = 1
  context.strokeStyle = accentColor(scene, previous)
  context.lineWidth = base * 0.03
  context.beginPath()
  const start = between(random, 0, Math.PI * 2)
  context.arc(
    width / 2,
    height / 2,
    base * between(random, 0.3, 0.45),
    start,
    start + between(random, Math.PI * 0.6, Math.PI * 1.4)
  )
  context.stroke()
}

function paintStripes(scene: Scene): void {
  const { context, width, height, random } = scene
  const diagonal = random() < 0.5
  const span = Math.hypot(width, height)
  context.translate(width / 2, height / 2)
  if (diagonal) {
    context.rotate(random() < 0.5 ? Math.PI / 4 : -Math.PI / 4)
  }
  let offset = -span / 2
  let previous = ""
  while (offset < span / 2) {
    const band = span * between(random, 0.04, 0.16)
    const color = accentColor(scene, previous)
    previous = color
    if (random() < 0.8) {
      fillRect(
        scene,
        { x: offset, y: -span / 2, width: band, height: span },
        color
      )
    }
    offset += band
  }
}

function paintSoftField(scene: Scene, rect: Rect, color: string): void {
  const layers = 6
  const feather = Math.min(rect.width, rect.height) * 0.08
  scene.context.globalAlpha = 0.3
  for (let index = 0; index < layers; index += 1) {
    const inset = feather * (1 - index / layers)
    fillRect(
      scene,
      {
        x: rect.x + inset,
        y: rect.y + inset,
        width: rect.width - inset * 2,
        height: rect.height - inset * 2,
      },
      color
    )
  }
  scene.context.globalAlpha = 1
}

function paintHorizon(scene: Scene): void {
  const { width, height, random } = scene
  const marginX = width * 0.08
  const marginY = height * 0.07
  const gap = height * 0.03
  const fields = random() < 0.5 ? 2 : 3
  const weights = Array.from({ length: fields }, () =>
    between(random, 0.6, 1.4)
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const available = height - marginY * 2 - gap * (fields - 1)
  let y = marginY
  let previous = ""
  for (const weight of weights) {
    const fieldHeight = (available * weight) / total
    const color = accentColor(scene, previous)
    previous = color
    paintSoftField(
      scene,
      { x: marginX, y, width: width - marginX * 2, height: fieldHeight },
      color
    )
    y += fieldHeight + gap
  }
}

function paintGridCell(scene: Scene, cell: Rect, dots: boolean): void {
  const { context, random } = scene
  const size = Math.min(cell.width, cell.height) * between(random, 0.45, 0.8)
  const centerX = cell.x + cell.width / 2
  const centerY = cell.y + cell.height / 2
  context.fillStyle = accentColor(scene)
  if (dots) {
    context.beginPath()
    context.arc(centerX, centerY, size / 2, 0, Math.PI * 2)
    context.fill()
    return
  }
  context.fillRect(centerX - size / 2, centerY - size / 2, size, size)
}

function paintGrid(scene: Scene): void {
  const { width, height, random } = scene
  const margin = Math.min(width, height) * 0.06
  const innerWidth = width - margin * 2
  const innerHeight = height - margin * 2
  const cellTarget = Math.min(innerWidth, innerHeight) / (4 + random() * 4)
  const columns = Math.max(1, Math.round(innerWidth / cellTarget))
  const rows = Math.max(1, Math.round(innerHeight / cellTarget))
  const cellWidth = innerWidth / columns
  const cellHeight = innerHeight / rows
  const dots = random() < 0.5
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (random() < 0.08) {
        continue
      }
      paintGridCell(
        scene,
        {
          x: margin + column * cellWidth,
          y: margin + row * cellHeight,
          width: cellWidth,
          height: cellHeight,
        },
        dots
      )
    }
  }
}

const painters: Record<ArtworkMotif, Painter> = {
  blocks: paintBlocks,
  circles: paintCircles,
  stripes: paintStripes,
  horizon: paintHorizon,
  grid: paintGrid,
}

export function paintArtwork(
  context: CanvasRenderingContext2D,
  options: PaintOptions
): void {
  const { width, height, seed, motif, palette } = options
  const random = createRandom(seed)
  const colors = pickColors(random, palette)
  const scene: Scene = { context, width, height, random, colors }
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = "source-over"
  fillRect(scene, { x: 0, y: 0, width, height }, colorAt(colors, 0))
  painters[motif](scene)
  context.restore()
}
