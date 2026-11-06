import {
  leafThickness,
  type LeafSpec,
} from "@/museum/entrance/_lib/entrance-layout"
import { extrude, mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import {
  archedOpening,
  lancetHalf,
  polygonPath,
  polygonShape,
  type Point2,
} from "@/museum/entrance/_lib/manor-arches"
import {
  CatmullRomCurve3,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from "three"

/** Leaf layout measured from the hinge edge (u) and the floor (y). */
const panel = { from: 0.135, to: 0.6, frame: 0.038 }
const lowerPanel = { bottom: 0.34, top: 1.0 }
const upperPanel = { bottom: 1.27, apex: 2.5 }
const strapRows = [0.19, 1.135, 2.65] as const
const strap = { half: 0.026, length: 0.47, depth: 0.007 }
const studRows = { from: 0.32, to: 2.56, step: 0.16 }
const studColumns = [0.068, 0.645] as const
const face = leafThickness

type Mirror = (point: Point2) => Point2

function rectangle(u0: number, u1: number, y0: number, y1: number): Point2[] {
  return [
    [u0, y0],
    [u1, y0],
    [u1, y1],
    [u0, y1],
  ]
}

function lancet(inset: number): Point2[] {
  const half = (panel.to - panel.from) / 2
  const arch = lancetHalf(half)
  const spring = upperPanel.apex - half * Math.sqrt(3)
  return archedOpening({
    center: [(panel.from + panel.to) / 2, spring],
    arch,
    halfSpan: half - inset,
    sill: upperPanel.bottom + inset,
  })
}

function moulding(outer: Point2[], inner: Point2[], mirror: Mirror) {
  const shape = polygonShape(outer.map(mirror))
  shape.holes.push(polygonPath(inner.map(mirror)))
  return extrude(shape, { z: face - 0.003, depth: 0.017, bevel: 0.005 })
}

function lowerRectangle(inset: number) {
  return rectangle(
    panel.from + inset,
    panel.to - inset,
    lowerPanel.bottom + inset,
    lowerPanel.top - inset
  )
}

/** Raised mouldings: a plain lower panel under a lancet-headed upper one. */
export function leafCarving(spec: LeafSpec): BufferGeometry {
  const mirror: Mirror = ([u, y]) => [spec.sign * u, y]
  return mergeParts([
    moulding(lowerRectangle(0), lowerRectangle(panel.frame), mirror),
    moulding(lancet(0), lancet(panel.frame), mirror),
  ])
}

const inlay = { from: panel.frame + 0.014, to: panel.frame + 0.021 }

function inlayBand(outline: (inset: number) => Point2[], mirror: Mirror) {
  const shape = polygonShape(outline(inlay.from).map(mirror))
  shape.holes.push(polygonPath(outline(inlay.to).map(mirror)))
  return extrude(shape, { z: face, depth: 0.004 })
}

/** A fine pearl bead set just inside each moulding. */
export function leafInlay(spec: LeafSpec): BufferGeometry {
  const mirror: Mirror = ([u, y]) => [spec.sign * u, y]
  return mergeParts([
    inlayBand(lowerRectangle, mirror),
    inlayBand(lancet, mirror),
  ])
}

function strapShape(y: number, mirror: Mirror) {
  const { half, length } = strap
  return polygonShape(
    (
      [
        [0, -half],
        [length, -half],
        [length + 0.022, -half * 1.9],
        [length + 0.1, 0],
        [length + 0.022, half * 1.9],
        [length, half],
        [0, half],
      ] as const
    ).map(([u, v]) => mirror([u, y + v]))
  )
}

/** A C-scroll branching off a strap, curling over and back on itself. */
function scroll(y: number, side: 1 | -1, mirror: Mirror) {
  const base = 0.21
  const center = [base + 0.075, side * (strap.half + 0.04)] as const
  const steps = 30
  const curl = Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps
    const angle = (200 / 180) * Math.PI - t * Math.PI * 2.3
    const radius = 0.055 * (1 - 0.75 * t)
    return [
      center[0] + Math.cos(angle) * radius,
      center[1] + side * Math.sin(angle) * radius,
    ] as const
  })
  const points = [[base - 0.02, side * strap.half * 0.3] as const, ...curl]
  return new TubeGeometry(
    new CatmullRomCurve3(
      points.map(([u, v]) => {
        const [x, py] = mirror([u, y + v])
        return new Vector3(x, py, face + 0.004)
      })
    ),
    56,
    0.0055,
    5,
    false
  )
}

function stud(point: Point2, radius: number, z: number) {
  return new SphereGeometry(radius, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2)
    .rotateX(Math.PI / 2)
    .scale(1, 1, 0.7)
    .translate(point[0], point[1], z)
}

function studs(mirror: Mirror) {
  const points: Point2[] = []
  for (let y = studRows.from; y <= studRows.to; y += studRows.step) {
    if (strapRows.every((row) => Math.abs(row - y) > 0.07)) {
      points.push(...studColumns.map((u) => mirror([u, y])))
    }
  }
  const rivets = strapRows.flatMap((y) =>
    [0.04, 0.15, 0.33, 0.46].map((u) => mirror([u, y]))
  )
  return [
    ...points.map((point) => stud(point, 0.012, face)),
    ...rivets.map((point) => stud(point, 0.0085, face + strap.depth)),
  ]
}

/** Strap hinges with scrolled branches, rivets and a column of iron studs. */
export function leafIronwork(spec: LeafSpec): BufferGeometry {
  const mirror: Mirror = ([u, y]) => [spec.sign * u, y]
  return mergeParts([
    ...strapRows.flatMap((y) => [
      extrude(strapShape(y, mirror), {
        z: face,
        depth: strap.depth,
        bevel: 0.0015,
      }),
      scroll(y, 1, mirror),
      scroll(y, -1, mirror),
    ]),
    ...studs(mirror),
  ])
}
