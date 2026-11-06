import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  LatheGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

export type Profile = readonly (readonly [radius: number, y: number])[]

export function lathe(profile: Profile, segments: number) {
  return new LatheGeometry(
    profile.map(([radius, y]) => new Vector2(radius, y)),
    segments
  )
}

type TubeOptions = { radial?: number; perPoint?: number; isClosed?: boolean }

export function tube(
  points: readonly Vector3[],
  radius: number,
  { radial = 6, perPoint = 6, isClosed = false }: TubeOptions = {}
) {
  return new TubeGeometry(
    new CatmullRomCurve3([...points], isClosed),
    points.length * perPoint,
    radius,
    radial,
    isClosed
  )
}

// A flat ellipse loop in the XY plane, as tube control points.
export function ellipsePoints(
  radiusX: number,
  radiusY: number,
  steps: number
): Vector3[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2
    return new Vector3(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 0)
  })
}

function keepOnly(geometry: BufferGeometry, names: ReadonlySet<string>) {
  for (const name of Object.keys(geometry.attributes)) {
    if (!names.has(name)) {
      geometry.deleteAttribute(name)
    }
  }
  const count = geometry.getAttribute("position").count
  if (names.has("uv") && !geometry.getAttribute("uv")) {
    geometry.setAttribute(
      "uv",
      new Float32BufferAttribute(new Float32Array(count * 2), 2)
    )
  }
  return geometry
}

// One geometry from many static parts (disposed here). Parts keep only the
// listed attributes; mixed indexed and flat parts are all flattened.
export function mergeParts(
  parts: readonly BufferGeometry[],
  attributes: readonly string[] = ["position", "normal", "uv"]
) {
  const kept = new Set(attributes)
  const isIndexed = parts.every((part) => part.index !== null)
  const ready = parts.map((part) => {
    if (isIndexed || part.index === null) {
      return keepOnly(part, kept)
    }
    const flat = part.toNonIndexed()
    part.dispose()
    return keepOnly(flat, kept)
  })
  const merged = mergeGeometries(ready)
  for (const part of ready) {
    part.dispose()
  }
  return merged
}

// Paints a whole part one colour, for vertex-coloured merges.
export function tinted(geometry: BufferGeometry, color: string) {
  const tint = new Color(color)
  const count = geometry.getAttribute("position").count
  const colors = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    tint.toArray(colors, index * 3)
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
  return geometry
}

export type RibbonPath = {
  points: readonly Vector3[]
  // Which way the ribbon's face looks at each control point.
  normals: readonly Vector3[]
  width: number
  segments?: number
}

function normalAt(normals: readonly Vector3[], t: number, target: Vector3) {
  const scaled = t * (normals.length - 1)
  const index = Math.min(Math.floor(scaled), normals.length - 2)
  const from = normals[Math.max(index, 0)] ?? target.set(0, 1, 0)
  const to = normals[Math.max(index + 1, 0)] ?? from
  return target
    .copy(from)
    .lerp(to, scaled - index)
    .normalize()
}

// A flat satin strip following a curve, its face turned by the normals.
export function ribbonStrip({
  points,
  normals,
  width,
  segments = 64,
}: RibbonPath) {
  const curve = new CatmullRomCurve3([...points])
  const length = curve.getLength()
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const point = new Vector3()
  const tangent = new Vector3()
  const face = new Vector3()
  const side = new Vector3()
  for (let step = 0; step <= segments; step += 1) {
    const t = step / segments
    curve.getPointAt(t, point)
    curve.getTangentAt(t, tangent)
    normalAt(normals, t, face)
    side
      .crossVectors(tangent, face)
      .normalize()
      .multiplyScalar(width / 2)
    positions.push(point.x - side.x, point.y - side.y, point.z - side.z)
    positions.push(point.x + side.x, point.y + side.y, point.z + side.z)
    uvs.push(0, (t * length) / width, 1, (t * length) / width)
    if (step < segments) {
      const a = step * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  return geometry
}

export type BowSpec = { width: number; loop: number; tail: number }

const front = new Vector3(0, 0, 1)

function bowLoop(side: number, { width, loop }: BowSpec) {
  const points = [
    new Vector3(0, 0, 0.004),
    new Vector3(side * loop * 0.35, loop * 0.42, 0.01),
    new Vector3(side * loop, loop * 0.38, 0),
    new Vector3(side * loop * 1.08, 0, -0.004),
    new Vector3(side * loop, -loop * 0.3, 0),
    new Vector3(side * loop * 0.35, -loop * 0.32, 0.01),
    new Vector3(0, 0, 0.004),
  ]
  return ribbonStrip({
    points,
    normals: points.map(() => front),
    width,
    segments: 28,
  })
}

function bowTail(side: number, { width, tail }: BowSpec) {
  const points = [
    new Vector3(0, -width * 0.2, 0.008),
    new Vector3(side * tail * 0.12, -tail * 0.35, 0.012),
    new Vector3(side * tail * 0.2, -tail * 0.7, 0.008),
    new Vector3(side * tail * 0.32, -tail, 0),
  ]
  const twist = new Vector3(side * 0.4, 0, 1).normalize()
  return ribbonStrip({
    points,
    normals: [front, front, twist, twist],
    width,
    segments: 20,
  })
}

// A tied satin bow facing +z: two loops, two tails and the knot.
export function bowGeometry(spec: BowSpec) {
  const knot = new TubeGeometry(
    new CatmullRomCurve3(
      [
        new Vector3(0, spec.width * 0.55, 0.012),
        new Vector3(0, 0, 0.016),
        new Vector3(0, -spec.width * 0.55, 0.012),
      ],
      false
    ),
    6,
    spec.width * 0.3,
    8,
    false
  )
  return mergeParts([
    bowLoop(-1, spec),
    bowLoop(1, spec),
    bowTail(-1, spec),
    bowTail(1, spec),
    knot,
  ])
}

// Cheap repeatable hash in [0, 1) for seeded variation.
export function hash01(value: number) {
  const seed = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return seed - Math.floor(seed)
}
