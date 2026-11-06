import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
  type Color,
  type Curve,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

export type Vec3 = readonly [number, number, number]

export function toVector([x, y, z]: Vec3) {
  return new Vector3(x, y, z)
}

export function curveThrough(points: readonly Vec3[]) {
  return new CatmullRomCurve3(points.map(toVector), false, "centripetal")
}

type TubeOptions = {
  curve: Curve<Vector3>
  segments: number
  radialSegments: number
  radius: (t: number) => number
}

export function taperedTube({
  curve,
  segments,
  radialSegments,
  radius,
}: TubeOptions) {
  const frames = curve.computeFrenetFrames(segments, false)
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const point = new Vector3()
  const normal = new Vector3()
  for (let ring = 0; ring <= segments; ring += 1) {
    const t = ring / segments
    curve.getPointAt(t, point)
    const size = radius(t)
    for (let side = 0; side <= radialSegments; side += 1) {
      const angle = (side / radialSegments) * Math.PI * 2
      normal
        .copy(frames.normals[ring])
        .multiplyScalar(-Math.cos(angle))
        .addScaledVector(frames.binormals[ring], Math.sin(angle))
        .normalize()
      normals.push(normal.x, normal.y, normal.z)
      positions.push(
        point.x + normal.x * size,
        point.y + normal.y * size,
        point.z + normal.z * size
      )
    }
  }
  const stride = radialSegments + 1
  for (let ring = 1; ring <= segments; ring += 1) {
    for (let side = 1; side <= radialSegments; side += 1) {
      const a = stride * (ring - 1) + side - 1
      const b = stride * ring + side - 1
      const c = stride * ring + side
      const d = stride * (ring - 1) + side
      indices.push(a, b, d, b, c, d)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  return geometry
}

export function gridIndices(rows: number, columns: number) {
  const indices: number[] = []
  const stride = columns + 1
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column
      const c = a + stride
      indices.push(a, c, a + 1, a + 1, c, c + 1)
    }
  }
  return indices
}

export function meshFromArrays(
  positions: number[],
  indices: number[],
  colors?: number[]
) {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  if (colors) {
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
  }
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const keptAttributes = new Set(["position", "normal", "color", "living"])

export function shapeOnly(geometry: BufferGeometry) {
  for (const name of Object.keys(geometry.attributes)) {
    if (!keptAttributes.has(name)) {
      geometry.deleteAttribute(name)
    }
  }
  return geometry
}

export function painted(geometry: BufferGeometry, color: Color) {
  const count = geometry.getAttribute("position").count
  const colors = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    colors.set([color.r, color.g, color.b], index * 3)
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
  return geometry
}

type Placement = {
  position: Vec3
  rotation?: Quaternion
  scale?: number
}

const placementMatrix = new Matrix4()
const unitScale = new Vector3()

export function placed(
  geometry: BufferGeometry,
  { position, rotation, scale = 1 }: Placement
) {
  placementMatrix.compose(
    toVector(position),
    rotation ?? new Quaternion(),
    unitScale.setScalar(scale)
  )
  return geometry.clone().applyMatrix4(placementMatrix)
}

export function mergeAll(geometries: BufferGeometry[]) {
  const merged = mergeGeometries(geometries.map(shapeOnly), false)
  if (!merged) {
    throw new Error("Ikebana geometry merge failed")
  }
  for (const geometry of geometries) {
    geometry.dispose()
  }
  merged.computeBoundingSphere()
  return merged
}
