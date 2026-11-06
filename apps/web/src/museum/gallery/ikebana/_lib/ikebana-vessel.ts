import { hashNoise, lerp } from "@/museum/gallery/ikebana/_lib/ikebana-random"
import { LatheGeometry, Vector2 } from "three"

export type VesselKind = "crumpled" | "column" | "suiban" | "moonJar"

type Profile = readonly (readonly [radius: number, height: number])[]

type Finish = "crumple" | "flutes" | "smooth"

export type VesselSpec = {
  outer: Profile
  inner: Profile
  lip: number
  stemDepth: number
  spread: number
  finish: Finish
  segments: number
}

export const vesselSpecs: Record<VesselKind, VesselSpec> = {
  crumpled: {
    outer: [
      [0, 0],
      [0.09, 0],
      [0.13, 0.012],
      [0.162, 0.04],
      [0.182, 0.075],
      [0.19, 0.11],
      [0.186, 0.145],
      [0.172, 0.18],
      [0.152, 0.212],
      [0.134, 0.24],
      [0.126, 0.262],
      [0.13, 0.28],
      [0.142, 0.296],
      [0.156, 0.31],
    ],
    inner: [],
    lip: 0.31,
    stemDepth: 0.2,
    spread: 0.075,
    finish: "crumple",
    segments: 26,
  },
  column: {
    outer: [
      [0, 0],
      [0.072, 0],
      [0.078, 0.008],
      [0.078, 0.024],
      [0.071, 0.034],
      [0.07, 0.3],
      [0.066, 0.48],
      [0.07, 0.505],
      [0.075, 0.52],
    ],
    inner: [
      [0.064, 0.52],
      [0.06, 0.49],
      [0.06, 0.4],
      [0, 0.4],
    ],
    lip: 0.52,
    stemDepth: 0.42,
    spread: 0.035,
    finish: "flutes",
    segments: 48,
  },
  suiban: {
    outer: [
      [0, 0],
      [0.15, 0],
      [0.158, 0.006],
      [0.152, 0.018],
      [0.17, 0.024],
      [0.21, 0.05],
      [0.235, 0.08],
      [0.242, 0.09],
    ],
    inner: [
      [0.228, 0.09],
      [0.22, 0.078],
      [0.19, 0.048],
      [0.16, 0.034],
      [0, 0.032],
    ],
    lip: 0.09,
    stemDepth: 0.034,
    spread: 0.02,
    finish: "smooth",
    segments: 64,
  },
  moonJar: {
    outer: [
      [0, 0],
      [0.07, 0],
      [0.076, 0.008],
      [0.075, 0.018],
      [0.12, 0.05],
      [0.158, 0.1],
      [0.172, 0.16],
      [0.165, 0.22],
      [0.135, 0.272],
      [0.085, 0.31],
      [0.056, 0.322],
      [0.052, 0.34],
      [0.058, 0.356],
      [0.064, 0.362],
    ],
    inner: [
      [0.05, 0.362],
      [0.046, 0.34],
      [0.046, 0.3],
      [0, 0.3],
    ],
    lip: 0.362,
    stemDepth: 0.3,
    spread: 0.028,
    finish: "smooth",
    segments: 56,
  },
}

export function vesselRadiusAt(spec: VesselSpec, height: number) {
  const { outer } = spec
  for (let index = 1; index < outer.length; index += 1) {
    const [radius, y] = outer[index] ?? [0, 0]
    const [previousRadius, previousY] = outer[index - 1] ?? [0, 0]
    if (height <= y && y > previousY) {
      return lerp(
        previousRadius,
        radius,
        (height - previousY) / (y - previousY)
      )
    }
  }
  return outer.at(-1)?.[0] ?? 0
}

const dents = [
  { angle: 0.6, height: 0.13, depth: 0.026 },
  { angle: 2.4, height: 0.2, depth: 0.02 },
  { angle: 3.9, height: 0.09, depth: 0.024 },
  { angle: 5.2, height: 0.24, depth: 0.018 },
] as const

function dentAmount(angle: number, height: number) {
  let total = 0
  for (const dent of dents) {
    const delta = Math.atan2(
      Math.sin(angle - dent.angle),
      Math.cos(angle - dent.angle)
    )
    const distance = (delta * 0.16) ** 2 + (height - dent.height) ** 2
    total += dent.depth * Math.exp(-distance / 0.0028)
  }
  return total
}

type Point = { x: number; y: number; z: number }
type Offset = { radial: number; twist: number; lift: number }

function crumpleOffset(point: Point, angle: number): Offset {
  const grip = Math.min(1, point.y / 0.03)
  const lipLift = point.y > 0.3 ? (hashNoise(point, 41) - 0.5) * 0.034 : 0
  return {
    radial:
      ((hashNoise(point, 11) - 0.5) * 0.03 - dentAmount(angle, point.y)) * grip,
    twist: (hashNoise(point, 23) - 0.5) * 0.11 * grip,
    lift: (hashNoise(point, 37) - 0.5) * 0.012 * grip + lipLift,
  }
}

const fluteCount = 12
const fluteDepth = 0.0045

function fluteOffset(point: Point, angle: number, lip: number): Offset {
  const onBody = point.y > 0.04 && point.y < lip - 0.03
  const groove = onBody ? Math.abs(Math.cos((angle * fluteCount) / 2)) : 1
  return { radial: -fluteDepth * (1 - groove ** 0.4), twist: 0, lift: 0 }
}

function shape(geometry: LatheGeometry, spec: VesselSpec) {
  if (spec.finish === "smooth") {
    return geometry
  }
  const position = geometry.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    const point = {
      x: position.getX(index),
      y: position.getY(index),
      z: position.getZ(index),
    }
    const radius = Math.hypot(point.x, point.z)
    if (radius < 0.02) {
      continue
    }
    const angle = Math.atan2(point.z, point.x)
    const offset =
      spec.finish === "crumple"
        ? crumpleOffset(point, angle)
        : fluteOffset(point, angle, spec.lip)
    const nextRadius = radius + offset.radial
    position.setXYZ(
      index,
      Math.cos(angle + offset.twist) * nextRadius,
      Math.max(0, point.y + offset.lift),
      Math.sin(angle + offset.twist) * nextRadius
    )
  }
  geometry.computeVertexNormals()
  return geometry
}

const geometries = new Map<VesselKind, LatheGeometry>()

export function vesselGeometry(kind: VesselKind) {
  const cached = geometries.get(kind)
  if (cached) {
    return cached
  }
  const spec = vesselSpecs[kind]
  const profile = [...spec.outer, ...spec.inner]
  const geometry = shape(
    new LatheGeometry(
      profile.map(([radius, y]) => new Vector2(radius, y)),
      spec.segments
    ),
    spec
  )
  geometries.set(kind, geometry)
  return geometry
}
