export type Point = { x: number; y: number }
export type Box = { left: number; top: number; right: number; bottom: number }
export type Arc = {
  center: Point
  radius: number
  start: number
  sweep: number
}

export type LaceLayout = {
  unit: number
  size: number
  center: Point
  opening: Point
  border: number
  base: Box
  inner: Box
}

export const TAU = Math.PI * 2

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function polar(origin: Point, radius: number, angle: number): Point {
  const x = origin.x + Math.cos(angle) * radius
  return { x, y: origin.y + Math.sin(angle) * radius }
}

export function shift(point: Point, normal: Point, amount: number): Point {
  return { x: point.x + normal.x * amount, y: point.y + normal.y * amount }
}

export function direction(x: number, y: number): Point {
  const length = Math.max(Math.hypot(x, y), 1e-9)
  return { x: x / length, y: y / length }
}

export function gapBetween(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

export function shrink({ left, top, right, bottom }: Box, amount: number): Box {
  const start = { left: left + amount, top: top + amount }
  return { ...start, right: right - amount, bottom: bottom - amount }
}

export function corners({ left, top, right, bottom }: Box): Point[] {
  const xs = [left, right, right, left]
  return [top, top, bottom, bottom].map((y, index) => ({ x: xs[index], y }))
}

// Band widths in lace units (1/512 of the frame's short side), from the outer
// edge inward: scallop edging, trim, open net, corded border around the hole.
const laceBand = { edge: 8, trim: 5, net: 18, border: 5 }
const laceBandUnits =
  laceBand.edge + laceBand.trim + laceBand.net + laceBand.border
const scallopChord = 10
const scallopSweep = Math.PI * 0.8
const lobeRadius = 6.5

// Margin around a print, as a share of its short side, that puts the opening
// right on the print edge.
export const laceMarginRatio = laceBandUnits / (512 - laceBandUnits * 2)

export function laceLayout(spec: {
  width: number
  height: number
}): LaceLayout {
  const { width, height } = spec
  const size = Math.max(Math.min(width, height), 1e-6)
  const unit = size / 512
  const frame = { left: 0, top: 0, right: width, bottom: height }
  const base = shrink(frame, laceBand.edge * unit)
  const inner = shrink(base, laceBand.trim * unit)
  const border = laceBand.border * unit
  const inset = (laceBand.net + laceBand.border) * unit
  const opening = {
    x: Math.max((inner.right - inner.left) / 2 - inset, unit),
    y: Math.max((inner.bottom - inner.top) / 2 - inset, unit),
  }
  const center = { x: width / 2, y: height / 2 }
  return { unit, size, center, opening, border, base, inner }
}

export function layoutArcs(lace: LaceLayout): Arc[] {
  const lobe = lace.unit * lobeRadius
  const points = corners(lace.base)
  return points.flatMap((corner, index) => {
    const next = points[(index + 1) % 4]
    const previous = points[(index + 3) % 4]
    const outgoing = direction(next.x - corner.x, next.y - corner.y)
    const inward = { x: -outgoing.y, y: outgoing.x }
    const back = Math.atan2(corner.y - previous.y, corner.x - previous.x)
    const start =
      Math.atan2(-outgoing.y, -outgoing.x) + (Math.PI - scallopSweep) / 2
    const span = gapBetween(corner, next) - lobe * 2
    const count = Math.max(Math.round(span / (lace.unit * scallopChord)), 3)
    const step = span / count
    const radius = step / 2 / Math.sin(scallopSweep / 2)
    const depth = radius * Math.cos(scallopSweep / 2)
    const sides = Array.from({ length: count }, (_, item) => {
      const middle = shift(corner, outgoing, lobe + step * (item + 0.5))
      const center = shift(middle, inward, depth)
      return { center, radius, start, sweep: scallopSweep }
    })
    const lobeArc = { center: corner, radius: lobe, start: back + Math.PI }
    return [{ ...lobeArc, sweep: Math.PI * 1.5 }, ...sides]
  })
}

// The opening is a rectangle with small rounded corners, sized as a share of
// its shorter half side, so nearly the whole artwork shows.
const openingCornerRatio = 0.06

function openingCorner(radius: Point): number {
  return Math.min(radius.x, radius.y) * openingCornerRatio
}

export function openingPoints(radius: Point, cornerSteps: number): Point[] {
  const corner = openingCorner(radius)
  const inset = { x: radius.x - corner, y: radius.y - corner }
  return [0, 1, 2, 3].flatMap((quarter) => {
    const middle = ((quarter + 0.5) * Math.PI) / 2
    const hub = {
      x: Math.sign(Math.cos(middle)) * inset.x,
      y: Math.sign(Math.sin(middle)) * inset.y,
    }
    return Array.from({ length: cornerSteps + 1 }, (_, step) =>
      polar(hub, corner, ((quarter + step / cornerSteps) * Math.PI) / 2)
    )
  })
}

export function openingReach(radius: Point, normal: Point): number {
  const corner = openingCorner(radius)
  const x = Math.max(Math.abs(normal.x), 1e-9)
  const y = Math.max(Math.abs(normal.y), 1e-9)
  const reach = Math.min(radius.x / x, radius.y / y)
  const hub = { x: radius.x - corner, y: radius.y - corner }
  if (reach * x <= hub.x || reach * y <= hub.y) {
    return reach
  }
  const along = x * hub.x + y * hub.y
  const offset = hub.x ** 2 + hub.y ** 2 - corner ** 2
  return along + Math.sqrt(Math.max(along ** 2 - offset, 0))
}

// 0 at the center, 1 on the opening edge, above 1 outside it.
export function openingFill(radius: Point, point: Point): number {
  const normal = direction(point.x, point.y)
  return Math.hypot(point.x, point.y) / openingReach(radius, normal)
}

export function laceOpening(lace: LaceLayout): Point {
  return lace.opening
}

export function arcPoints(arc: Arc, stepsPerTurn: number): Point[] {
  const steps = Math.max(Math.ceil((arc.sweep / TAU) * stepsPerTurn), 2)
  return Array.from({ length: steps + 1 }, (_, index) =>
    polar(arc.center, arc.radius, arc.start + (arc.sweep * index) / steps)
  )
}

export function scallopOutline(lace: LaceLayout, stepsPerTurn = 28): Point[] {
  return layoutArcs(lace).flatMap((arc) => arcPoints(arc, stepsPerTurn))
}
