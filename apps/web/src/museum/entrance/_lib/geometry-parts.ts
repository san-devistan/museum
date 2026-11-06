import { meteredBox } from "@/museum/_lib/metered-box"
import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Quaternion,
  Vector3,
  type Shape,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

export type Bounds = readonly [x: number, y: number, z: number]

const keptAttributes = new Set(["position", "normal", "uv"])

/** Merges parts into one drawable, dropping attributes they don't all share. */
export function mergeParts(parts: readonly BufferGeometry[]): BufferGeometry {
  const flat = parts.map((part) => {
    const geometry = part.index ? part.toNonIndexed() : part
    for (const name of Object.keys(geometry.attributes)) {
      if (!keptAttributes.has(name)) {
        geometry.deleteAttribute(name)
      }
    }
    return geometry
  })
  return mergeGeometries(flat) ?? new BufferGeometry()
}

/** An axis-aligned block between two corners, with UVs in metres. */
export function slab(min: Bounds, max: Bounds) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]] as const
  return meteredBox(size)
    .clone()
    .translate(
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2
    )
}

/** A flat shape pushed out from `z` by `depth`, edges softly chamfered. */
export function extrude(
  shape: Shape,
  spec: { z: number; depth: number; bevel?: number }
) {
  const bevel = spec.bevel ?? 0
  return new ExtrudeGeometry(shape, {
    depth: spec.depth - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  }).translate(0, 0, spec.z + bevel)
}

/** Remaps a geometry's UVs so `bounds` (x/y in metres) spans 0..1. */
export function fitUvs(
  geometry: BufferGeometry,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
) {
  const position = geometry.getAttribute("position")
  const uv = geometry.getAttribute("uv")
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(
      index,
      (position.getX(index) - bounds.minX) / (bounds.maxX - bounds.minX),
      (position.getY(index) - bounds.minY) / (bounds.maxY - bounds.minY)
    )
  }
  uv.needsUpdate = true
  return geometry
}

const up = new Vector3(0, 1, 0)

/**
 * A flat convex polygon, fanned from its first corner. UVs are in metres:
 * u along the first edge, v across the face towards the last corner, so a
 * roof slope given eave-first tiles its slates up the slope. Corners run
 * counter-clockwise seen from the side the face shows. Faces cut from one
 * plane share a UV `origin` so their texture runs on across the cut.
 */
export function facet(
  corners: readonly Bounds[],
  options: { origin?: Bounds } = {}
) {
  const points = corners.map((corner) => new Vector3(...corner))
  const [origin, second, third] = points
  if (!origin || !second || !third) {
    return new BufferGeometry()
  }
  const uvOrigin = options.origin ? new Vector3(...options.origin) : origin
  const uAxis = second.clone().sub(origin).normalize()
  const normal = uAxis.clone().cross(third.clone().sub(origin)).normalize()
  const vAxis = normal.clone().cross(uAxis)
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const offset = new Vector3()
  for (let index = 1; index < points.length - 1; index += 1) {
    for (const point of [origin, points[index], points[index + 1]]) {
      if (point) {
        offset.copy(point).sub(uvOrigin)
        positions.push(point.x, point.y, point.z)
        normals.push(normal.x, normal.y, normal.z)
        uvs.push(offset.dot(uAxis), offset.dot(vAxis))
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  return geometry
}

/** A thin round bar between two points: ridge rolls, gutters, spikes. */
export function rod(
  from: Bounds,
  to: Bounds,
  radius: number | readonly [bottom: number, top: number]
) {
  const start = new Vector3(...from)
  const direction = new Vector3(...to).sub(start)
  const length = direction.length()
  const [bottom, top] = typeof radius === "number" ? [radius, radius] : radius
  return new CylinderGeometry(top, bottom, length, 7, 1)
    .applyQuaternion(
      new Quaternion().setFromUnitVectors(up, direction.normalize())
    )
    .translate(
      start.x + (to[0] - from[0]) / 2,
      start.y + (to[1] - from[1]) / 2,
      start.z + (to[2] - from[2]) / 2
    )
}
