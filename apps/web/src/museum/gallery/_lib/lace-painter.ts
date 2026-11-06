import {
  clamp,
  corners,
  direction,
  gapBetween,
  laceLayout,
  layoutArcs,
  openingPoints,
  openingReach,
  polar,
  shift,
  shrink,
  TAU,
  type Arc,
  type Box,
  type Point,
} from "@/museum/gallery/_lib/lace-outline"

export type LacePaintOptions = {
  width: number
  height: number
  seed: number
  thread: string
  shade: string
}

type Ink = { color?: string; width?: number; alpha?: number; dash?: number }
type Track = { total: number; at: (fraction: number) => number }
type Band = { point: Point; normal: Point; gap: number }
type Spot = { center: Point; radius: number }
type Leaf = { base: Point; angle: number; length: number; color: string }
type Flower = Spot & { petals: number; angle: number }
type Vine = { track: Track; count: number; phase: number }

type Lace = ReturnType<typeof createLace>

const openingCornerSteps = 24

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

function createLace(
  context: CanvasRenderingContext2D,
  options: LacePaintOptions
) {
  const { thread, shade } = options
  const random = createRandom(options.seed)
  return { context, thread, shade, random, ...laceLayout(options) }
}

function paint(lace: Lace, ink: Ink, trace: () => void): void {
  const { context, unit } = lace
  const color = ink.color ?? lace.thread
  const erase = ink.color === undefined ? "destination-out" : "source-over"
  context.save()
  context.beginPath()
  trace()
  Object.assign(context, { lineCap: "round", lineJoin: "round" })
  Object.assign(context, { fillStyle: color, strokeStyle: color })
  context.globalAlpha = ink.alpha ?? 1
  context.globalCompositeOperation = erase
  context.lineWidth = (ink.width ?? 1) * unit
  context.setLineDash(ink.dash === undefined ? [] : [0, ink.dash * unit])
  context[ink.width === undefined ? "fill" : "stroke"]()
  context.restore()
}

function arcTrace(lace: Lace, { center, radius, start, sweep }: Arc) {
  return () =>
    lace.context.arc(center.x, center.y, radius, start, start + sweep)
}

function traceOpening(
  context: CanvasRenderingContext2D,
  center: Point,
  radius: Point
) {
  const points = openingPoints(radius, openingCornerSteps)
  points.forEach((point, index) => {
    const x = center.x + point.x
    const y = center.y + point.y
    if (index === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  })
  context.closePath()
}

function dot(lace: Lace, ink: Ink, spot: Spot): void {
  paint(lace, ink, arcTrace(lace, { ...spot, start: 0, sweep: TAU }))
}

function segment(lace: Lace, from: Point, to: Point): void {
  lace.context.moveTo(from.x, from.y)
  lace.context.lineTo(to.x, to.y)
}

function rectangle(lace: Lace, { left, top, right, bottom }: Box): void {
  lace.context.rect(left, top, right - left, bottom - top)
}

function equalize(curve: (angle: number) => Point): Track {
  const lengths = [0]
  let previous = curve(0)
  for (let index = 1; index <= 720; index += 1) {
    const point = curve((index / 720) * TAU)
    lengths.push(lengths[index - 1] + gapBetween(previous, point))
    previous = point
  }
  const total = Math.max(lengths[720], 1e-6)
  const at = (fraction: number) => {
    const target = (((fraction % 1) + 1) % 1) * total
    const index = Math.max(
      lengths.findIndex((length) => length >= target),
      1
    )
    const from = lengths[index - 1]
    const span = Math.max(lengths[index] - from, 1e-9)
    return ((index - 1 + (target - from) / span) / 720) * TAU
  }
  return { total, at }
}

function bandRim({ opening, border }: Lace): Point {
  return { x: opening.x + border, y: opening.y + border }
}

function bandGap(lace: Lace, normal: Point): { rim: number; gap: number } {
  const { inner, center } = lace
  const rim = openingReach(bandRim(lace), normal)
  const reachX = (center.x - inner.left) / Math.abs(normal.x)
  const reach = Math.min(reachX, (center.y - inner.top) / Math.abs(normal.y))
  return { rim, gap: Math.max(reach - rim, 0) }
}

function onBand(lace: Lace, angle: number): Band {
  const { opening } = lace
  const x = opening.x * Math.cos(angle)
  const normal = direction(x, opening.y * Math.sin(angle))
  const { rim, gap } = bandGap(lace, normal)
  return { point: shift(lace.center, normal, rim + gap / 2), normal, gap }
}

function swing(lace: Lace, gap: number): number {
  return Math.min(gap * 0.2, lace.size * 0.025)
}

function vinePoint(lace: Lace, vine: Vine, fraction: number): Point {
  const band = onBand(lace, vine.track.at(fraction))
  const wave = Math.sin(TAU * (vine.count * fraction + vine.phase))
  return shift(band.point, band.normal, wave * swing(lace, band.gap))
}

function drawNet(lace: Lace): void {
  const { center, inner } = lace
  const step = lace.unit * 5
  const reach = Math.hypot(inner.right - inner.left, inner.bottom - inner.top)
  const turn = lace.random() * step
  paint(lace, { color: lace.thread, width: 0.5, alpha: 0.6 }, () => {
    for (const family of [0, 1, 2]) {
      const way = polar({ x: 0, y: 0 }, 1, (family * Math.PI) / 3)
      const normal = { x: -way.y, y: way.x }
      const offset = turn + (family === 2 ? step / 2 : 0)
      for (let line = -reach; line < reach; line += step) {
        const middle = shift(center, normal, line + offset)
        segment(lace, shift(middle, way, -reach), shift(middle, way, reach))
      }
    }
  })
}

function drawLeaf(lace: Lace, leaf: Leaf): void {
  const { context } = lace
  const { base, angle, length } = leaf
  const along = (amount: number) => polar(base, length * amount, angle)
  const side = (turn: number) => polar(along(0.5), length * 0.38, angle + turn)
  paint(lace, { color: leaf.color }, () => {
    const [left, right, tip] = [side(-Math.PI / 2), side(Math.PI / 2), along(1)]
    context.moveTo(base.x, base.y)
    context.quadraticCurveTo(left.x, left.y, tip.x, tip.y)
    context.quadraticCurveTo(right.x, right.y, base.x, base.y)
  })
  const vein = Math.max(0.7, (length * 0.07) / lace.unit)
  paint(lace, { width: vein }, () => segment(lace, along(0.18), along(0.78)))
}

function drawFlower(lace: Lace, flower: Flower): void {
  const { center, radius, petals, angle } = flower
  const trace = (scale: number) => () => {
    for (let index = 0; index < petals; index += 1) {
      const turn = angle + (index * TAU) / petals
      const point = polar(center, radius * 0.56, turn)
      const [long, short] = [radius * 0.42 * scale, radius * 0.22 * scale]
      const start = polar(point, long, turn)
      lace.context.moveTo(start.x, start.y)
      lace.context.ellipse(point.x, point.y, long, short, turn, 0, TAU)
    }
  }
  paint(lace, { color: lace.thread }, trace(1))
  paint(lace, {}, trace(0.42))
  dot(lace, { color: lace.shade }, { center, radius: radius * 0.27 })
  dot(lace, {}, { center, radius: radius * 0.11 })
}

function drawCurl(lace: Lace, spot: Spot, attach: Point, turn: number): void {
  const { center, radius } = spot
  const start = Math.atan2(attach.y - center.y, attach.x - center.x)
  const end = start + turn * TAU * 1.15
  paint(lace, { color: lace.thread, width: 0.9 }, () => {
    lace.context.moveTo(attach.x, attach.y)
    for (let index = 0; index <= 40; index += 1) {
      const angle = start + ((end - start) * index) / 40
      const point = polar(center, radius * (1 - (index / 40) * 0.78), angle)
      lace.context.lineTo(point.x, point.y)
    }
  })
  const bead = Math.max(lace.unit * 1.5, radius * 0.13)
  const tip = polar(center, radius * 0.22, end)
  dot(lace, { color: lace.shade }, { center: tip, radius: bead })
}

function drawRosette(lace: Lace, spot: Spot): void {
  const { center, radius } = spot
  const turn = lace.random() * TAU
  const width = Math.max(2.6, (radius * 0.1) / lace.unit)
  const dash = (radius * 0.9 * TAU) / 8 / lace.unit
  const ring = { center, radius: radius * 0.9, start: turn + TAU / 16 }
  const trace = arcTrace(lace, { ...ring, sweep: TAU })
  paint(lace, { color: lace.thread, width, dash }, trace)
  for (let index = 0; index < 8; index += 1) {
    const angle = turn + (index * TAU) / 8
    const base = polar(center, radius * 0.3, angle)
    const color = index % 2 === 0 ? lace.thread : lace.shade
    drawLeaf(lace, { base, angle, length: radius * 0.68, color })
  }
  drawFlower(lace, { center, radius: radius * 0.42, petals: 6, angle: turn })
}

function drawVineMotifs(lace: Lace, vine: Vine, avoid: Spot[]): void {
  const span = 1 / vine.count
  for (let half = 0; half < vine.count * 2; half += 1) {
    const side = half % 2 === 0 ? 1 : -1
    const fraction = (0.25 + half / 2 - vine.phase) * span
    const band = onBand(lace, vine.track.at(fraction))
    const reach = swing(lace, band.gap)
    const outward = Math.atan2(band.normal.y * side, band.normal.x * side)
    for (const turn of [-1, 1]) {
      drawLeaf(lace, {
        base: vinePoint(lace, vine, fraction + turn * span * 0.08),
        angle: outward + turn * side * 0.55,
        length: Math.min(reach * 1.3, lace.size * 0.03),
        color: turn > 0 ? lace.thread : lace.shade,
      })
    }
    const center = shift(band.point, band.normal, -side * reach * 0.6)
    const radius = Math.min(reach * 1.2, vine.track.total * span * 0.2)
    const blocked = avoid.some(
      (spot) => gapBetween(spot.center, center) < spot.radius + radius
    )
    if (radius < lace.unit * 3 || blocked) {
      continue
    }
    const petals = 5 + Math.floor(lace.random() * 3)
    const flower = { center, radius, petals, angle: lace.random() * TAU }
    if (side > 0) {
      drawFlower(lace, flower)
    } else {
      const attach = vinePoint(lace, vine, fraction + span / 4)
      drawCurl(lace, flower, attach, petals % 2 === 0 ? 1 : -1)
    }
  }
}

function cornerSpots(lace: Lace): Spot[] {
  return corners(lace.inner).map((corner) => {
    const offset = { x: corner.x - lace.center.x, y: corner.y - lace.center.y }
    const { gap } = bandGap(lace, direction(offset.x, offset.y))
    const free = gap / 2 - swing(lace, gap)
    const radius = clamp(free * 0.4, 0, lace.size * 0.07)
    const step = radius + lace.unit * 5
    const x = corner.x - Math.sign(offset.x) * step
    return { center: { x, y: corner.y - Math.sign(offset.y) * step }, radius }
  })
}

function drawOpeningBorder(lace: Lace): void {
  const { context, thread, center, opening, border, unit } = lace
  const ring = (extra: number, ink: Ink) =>
    paint(lace, ink, () => {
      const radius = { x: opening.x + extra, y: opening.y + extra }
      traceOpening(context, center, radius)
    })
  ring(unit * 0.9, { color: thread, width: 1.5 })
  ring(border * 0.55, { color: thread, width: 1.2, dash: 2.6 })
  ring(border, { color: thread, width: 0.6 })
}

function innerArc(arc: Arc, radius: number): Arc {
  if (arc.sweep > Math.PI) {
    return { ...arc, radius }
  }
  const depth = arc.radius * Math.cos(arc.sweep / 2)
  const half = Math.acos(clamp(depth / radius, -1, 1))
  const start = arc.start + arc.sweep / 2 - half
  return { center: arc.center, radius, start, sweep: half * 2 }
}

function drawScallop(lace: Lace, arc: Arc): void {
  const { unit, thread } = lace
  const { center, radius, start, sweep } = arc
  const inner = innerArc(arc, radius - unit * 2)
  paint(lace, { color: thread, width: 0.55 }, arcTrace(lace, inner))
  const picots = sweep > Math.PI ? 5 : 1
  for (let index = 0; index < picots; index += 1) {
    const angle = start + (sweep * (index + 0.5)) / picots
    const spot = { center: polar(center, radius - unit * 1.1, angle) }
    dot(lace, { color: thread }, { ...spot, radius: unit * 0.55 })
  }
}

function zigzag(lace: Lace, box: Box, reach: number, step: number): void {
  const points = corners(box)
  points.forEach((corner, index) => {
    const next = points[(index + 1) % 4]
    const along = direction(next.x - corner.x, next.y - corner.y)
    const normal = { x: -along.y, y: along.x }
    const count = Math.max(Math.round(gapBetween(corner, next) / step), 2)
    const length = gapBetween(corner, next) / count
    for (let item = 0; item <= count; item += 1) {
      const point = shift(corner, along, length * item)
      const side = shift(point, normal, item % 2 === 0 ? -reach : reach)
      if (item === 0) {
        lace.context.moveTo(side.x, side.y)
      } else {
        lace.context.lineTo(side.x, side.y)
      }
    }
  })
}

function drawTrim(lace: Lace, arcs: Arc[]): void {
  const { base, inner, thread, unit } = lace
  const band = inner.left - base.left
  const middle = shrink(base, band / 2)
  const reach = band / 2 - unit * 0.9
  paint(lace, { color: thread, width: 1 }, () => rectangle(lace, base))
  paint(lace, { color: thread, width: 0.7 }, () => rectangle(lace, inner))
  paint(lace, { color: thread, width: 0.5 }, () =>
    zigzag(lace, middle, reach, band)
  )
  for (const arc of arcs) {
    drawScallop(lace, arc)
  }
  paint(lace, { color: thread, width: 1.4 }, () => {
    for (const arc of arcs) {
      arcTrace(lace, arc)()
    }
    lace.context.closePath()
  })
}

export function paintLace(
  context: CanvasRenderingContext2D,
  options: LacePaintOptions
): void {
  context.clearRect(0, 0, options.width, options.height)
  if (options.width < 8 || options.height < 8) {
    return
  }
  const lace = createLace(context, options)
  context.save()
  context.beginPath()
  rectangle(lace, lace.inner)
  traceOpening(context, lace.center, bandRim(lace))
  context.clip("evenodd")
  drawNet(lace)
  const track = equalize((angle) => onBand(lace, angle).point)
  const count = Math.max(Math.round(track.total / (lace.size * 0.11)), 4)
  const vine = { track, count, phase: lace.random() }
  const spots = cornerSpots(lace).filter((spot) => spot.radius > lace.unit * 4)
  const steps = Math.max(Math.round(track.total / (lace.unit * 2)), 64)
  const trace = () => {
    for (let index = 0; index <= steps; index += 1) {
      const point = vinePoint(lace, vine, index / steps)
      context.lineTo(point.x, point.y)
    }
  }
  paint(lace, { color: lace.thread, width: 1.3 }, trace)
  drawVineMotifs(lace, vine, spots)
  for (const spot of spots) {
    drawRosette(lace, spot)
  }
  context.restore()
  drawOpeningBorder(lace)
  drawTrim(lace, layoutArcs(lace))
}
