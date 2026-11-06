import {
  BufferGeometry,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
  Vector3,
} from "three"

// A moulding cross-section: how far the face stands off the wall, at what
// height. Points run along the visible face from one wall contact to the next.
export type ProfilePoint = readonly [inset: number, y: number]

export type WallPoint = readonly [x: number, z: number]

export type WallPath = {
  points: readonly WallPoint[]
  isClosed: boolean
}

type Corner = { point: WallPoint; miter: WallPoint; along: number }

const smoothAngle = Math.cos((50 * Math.PI) / 180)

function segmentNormal(from: WallPoint, to: WallPoint): WallPoint {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz) || 1
  return [-dz / length, dx / length]
}

function pathCorners(path: WallPath): Corner[] {
  const { points, isClosed } = path
  const count = points.length
  let along = 0
  return points.map((point, index) => {
    const previous = points[(index - 1 + count) % count] ?? point
    const next = points[(index + 1) % count] ?? point
    const hasPrevious = isClosed || index > 0
    const hasNext = isClosed || index < count - 1
    const before = hasPrevious ? segmentNormal(previous, point) : null
    const after = hasNext ? segmentNormal(point, next) : null
    const normals = [before, after].filter((normal) => normal !== null)
    const sum = normals.reduce<WallPoint>(
      (total, normal) => [total[0] + normal[0], total[1] + normal[1]],
      [0, 0]
    )
    const sumLength = Math.hypot(sum[0], sum[1]) || 1
    const unit: WallPoint = [sum[0] / sumLength, sum[1] / sumLength]
    const reference = normals[0] ?? unit
    const stretch =
      1 / Math.max(0.2, unit[0] * reference[0] + unit[1] * reference[1])
    if (index > 0) {
      along += Math.hypot(point[0] - previous[0], point[1] - previous[1])
    }
    return { point, miter: [unit[0] * stretch, unit[1] * stretch], along }
  })
}

function profileNormals(profile: readonly ProfilePoint[]) {
  const faces = profile.slice(1).map((end, index) => {
    const start = profile[index] ?? end
    const normal = new Vector2(end[1] - start[1], start[0] - end[0])
    return normal.normalize()
  })
  return faces.map((face, index) => {
    const previous = faces[index - 1]
    const next = faces[index + 1]
    const start =
      previous && previous.dot(face) > smoothAngle
        ? previous.clone().add(face).normalize()
        : face
    const end =
      next && next.dot(face) > smoothAngle
        ? next.clone().add(face).normalize()
        : face
    return { start, end }
  })
}

function profileLengths(profile: readonly ProfilePoint[]) {
  let total = 0
  return profile.map((point, index) => {
    const previous = profile[index - 1] ?? point
    total += Math.hypot(point[0] - previous[0], point[1] - previous[1])
    return total
  })
}

class SweepBuffer {
  positions: number[] = []
  normals: number[] = []
  uvs: number[] = []

  push(position: Vector3, normal: Vector3, uv: Vector2) {
    this.positions.push(position.x, position.y, position.z)
    this.normals.push(normal.x, normal.y, normal.z)
    this.uvs.push(uv.x, uv.y)
  }

  geometry() {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(this.positions, 3)
    )
    geometry.setAttribute("normal", new Float32BufferAttribute(this.normals, 3))
    geometry.setAttribute("uv", new Float32BufferAttribute(this.uvs, 2))
    return geometry
  }
}

type Vertex = { position: Vector3; normal: Vector3; uv: Vector2 }

function pushQuad(buffer: SweepBuffer, quad: readonly Vertex[]) {
  const [a, b, c, d] = quad
  if (!a || !b || !c || !d) {
    return
  }
  const facing = new Vector3()
    .subVectors(b.position, a.position)
    .cross(new Vector3().subVectors(d.position, a.position))
    .dot(a.normal)
  const order = facing >= 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c]
  for (const vertex of order) {
    buffer.push(vertex.position, vertex.normal, vertex.uv)
  }
}

function sweepVertex(
  corner: Corner,
  segment: WallPoint,
  profile: { point: ProfilePoint; normal: Vector2; v: number }
): Vertex {
  const [inset, y] = profile.point
  return {
    position: new Vector3(
      corner.point[0] + corner.miter[0] * inset,
      y,
      corner.point[1] + corner.miter[1] * inset
    ),
    normal: new Vector3(
      segment[0] * profile.normal.x,
      profile.normal.y,
      segment[1] * profile.normal.x
    ).normalize(),
    uv: new Vector2(corner.along, profile.v),
  }
}

function pushCap(
  buffer: SweepBuffer,
  corner: Corner,
  outward: WallPoint,
  profile: readonly ProfilePoint[]
) {
  const contour = profile.map(([inset, y]) => new Vector2(inset, y))
  const triangles = ShapeUtils.triangulateShape(contour, [])
  const normal = new Vector3(outward[0], 0, outward[1])
  const facing = new Vector3()
  for (const triangle of triangles) {
    const vertices = triangle.map((index) => {
      const [inset, y] = profile[index] ?? [0, 0]
      return new Vector3(
        corner.point[0] + corner.miter[0] * inset,
        y,
        corner.point[1] + corner.miter[1] * inset
      )
    })
    const [a, b, c] = vertices
    if (!a || !b || !c) {
      continue
    }
    facing.subVectors(b, a).cross(new Vector3().subVectors(c, a))
    const ordered = facing.dot(normal) >= 0 ? [a, b, c] : [a, c, b]
    for (const vertex of ordered) {
      buffer.push(vertex, normal, new Vector2(vertex.y, vertex.x))
    }
  }
}

// Sweeps a profile along the inside face of the walls with mitred corners.
// UVs are metered: u runs along the wall, v along the profile.
export function sweepAlongWalls(
  path: WallPath,
  profile: readonly ProfilePoint[]
) {
  const corners = pathCorners(path)
  const normals = profileNormals(profile)
  const lengths = profileLengths(profile)
  const buffer = new SweepBuffer()
  const segmentCount = path.isClosed ? corners.length : corners.length - 1
  for (let index = 0; index < segmentCount; index += 1) {
    const from = corners[index]
    const to = corners[(index + 1) % corners.length]
    if (!from || !to) {
      continue
    }
    const segment = segmentNormal(from.point, to.point)
    const end =
      index === corners.length - 1
        ? {
            ...to,
            along:
              from.along +
              Math.hypot(
                to.point[0] - from.point[0],
                to.point[1] - from.point[1]
              ),
          }
        : to
    normals.forEach((normal, step) => {
      const lower = {
        point: profile[step] ?? [0, 0],
        normal: normal.start,
        v: lengths[step] ?? 0,
      }
      const upper = {
        point: profile[step + 1] ?? [0, 0],
        normal: normal.end,
        v: lengths[step + 1] ?? 0,
      }
      pushQuad(buffer, [
        sweepVertex(from, segment, lower),
        sweepVertex(end, segment, lower),
        sweepVertex(end, segment, upper),
        sweepVertex(from, segment, upper),
      ])
    })
  }
  const first = corners[0]
  const last = corners.at(-1)
  if (!path.isClosed && first && last) {
    const second = corners[1] ?? last
    const beforeLast = corners.at(-2) ?? first
    pushCap(buffer, first, unitBetween(second.point, first.point), profile)
    pushCap(buffer, last, unitBetween(beforeLast.point, last.point), profile)
  }
  return buffer.geometry()
}

function unitBetween(from: WallPoint, to: WallPoint): WallPoint {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const length = Math.hypot(dx, dz) || 1
  return [dx / length, dz / length]
}
