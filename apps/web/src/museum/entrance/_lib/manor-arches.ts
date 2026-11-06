import { Path, Shape } from "three"

export type Point2 = readonly [x: number, y: number]

/** Left half of an arch for a given half span, from springing to apex. */
export type HalfArch = (halfSpan: number) => Point2[]

const archSteps = 28

/**
 * Flat Tudor arch: springs vertically at (-halfSpan, 0) and meets its mirror
 * in a soft point. Wider concentric rings rise by the same amount they widen,
 * so a ring keeps its thickness over the crown.
 */
export function tudorHalf(base: { halfSpan: number; rise: number }): HalfArch {
  return (halfSpan) => {
    const rise = base.rise + (halfSpan - base.halfSpan)
    return Array.from({ length: archSteps + 1 }, (_, index) => {
      const s = index / archSteps
      return [-halfSpan * (1 - s * s), rise * s] as const
    })
  }
}

/**
 * Two-centred pointed arch. Both arcs are centred `offset` past the axis, so
 * concentric rings share their centres.
 */
export function lancetHalf(offset: number): HalfArch {
  return (halfSpan) => {
    const radius = halfSpan + offset
    const apexAngle = Math.acos(-offset / radius)
    return Array.from({ length: archSteps + 1 }, (_, index) => {
      const angle = Math.PI + (apexAngle - Math.PI) * (index / archSteps)
      return [offset + radius * Math.cos(angle), radius * Math.sin(angle)]
    })
  }
}

export function archApex(arch: HalfArch, halfSpan: number) {
  return arch(halfSpan).at(-1)?.[1] ?? 0
}

/** A reversed copy, leaving the input untouched. */
export function reversed<T>(items: readonly T[]): T[] {
  const result: T[] = []
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]
    if (item !== undefined) {
      result.push(item)
    }
  }
  return result
}

/** Full arch curve from the left springing point, over the apex, to the right. */
export function archCurve(half: readonly Point2[]): Point2[] {
  const right = reversed(half.slice(0, -1)).map(([x, y]) => [-x, y] as const)
  return [...half, ...right]
}

export function shift(points: readonly Point2[], by: Point2): Point2[] {
  return points.map(([x, y]) => [x + by[0], y + by[1]] as const)
}

function trace<T extends Path>(path: T, points: readonly Point2[]): T {
  points.forEach(([x, y], index) => {
    if (index === 0) {
      path.moveTo(x, y)
    } else {
      path.lineTo(x, y)
    }
  })
  path.closePath()
  return path
}

export function polygonShape(points: readonly Point2[]) {
  return trace(new Shape(), points)
}

export function polygonPath(points: readonly Point2[]) {
  return trace(new Path(), points)
}

export type ArchRing = {
  center: Point2
  arch: HalfArch
  inner: number
  outer: number
}

/** The band between two concentric arches springing at `center`. */
export function archRingShape(ring: ArchRing) {
  const outer = archCurve(ring.arch(ring.outer))
  const inner = reversed(archCurve(ring.arch(ring.inner)))
  return polygonShape(shift([...outer, ...inner], ring.center))
}

/** Outline of an arched opening with straight jambs down to `sill`. */
export function archedOpening(spec: {
  center: Point2
  arch: HalfArch
  halfSpan: number
  sill: number
}): Point2[] {
  const [x] = spec.center
  return [
    [x - spec.halfSpan, spec.sill],
    ...shift(archCurve(spec.arch(spec.halfSpan)), spec.center),
    [x + spec.halfSpan, spec.sill],
  ]
}

/** Evenly spaced points along a polyline. */
export function resample(points: readonly Point2[], spacing: number): Point2[] {
  const result: Point2[] = []
  let carry = 0
  for (let index = 1; index < points.length; index += 1) {
    const [ax, ay] = points[index - 1] ?? [0, 0]
    const [bx, by] = points[index] ?? [0, 0]
    const length = Math.hypot(bx - ax, by - ay)
    let along = carry
    while (along <= length) {
      const t = length === 0 ? 0 : along / length
      result.push([ax + (bx - ax) * t, ay + (by - ay) * t])
      along += spacing
    }
    carry = along - length
  }
  return result
}
