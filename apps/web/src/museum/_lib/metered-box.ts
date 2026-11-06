import { BoxGeometry, PlaneGeometry } from "three"

export type BoxSize = readonly [x: number, y: number, z: number]

const geometries = new Map<string, BoxGeometry>()
const verticesPerFace = 4

function faceSpans([x, y, z]: BoxSize): readonly (readonly [number, number])[] {
  return [
    [z, y],
    [z, y],
    [x, z],
    [x, z],
    [x, y],
    [x, y],
  ]
}

export function meteredBox(size: BoxSize) {
  const key = size.join(":")
  const cached = geometries.get(key)
  if (cached) {
    return cached
  }
  const geometry = new BoxGeometry(...size)
  const uv = geometry.getAttribute("uv")
  faceSpans(size).forEach(([spanU, spanV], face) => {
    for (let vertex = 0; vertex < verticesPerFace; vertex += 1) {
      const index = face * verticesPerFace + vertex
      uv.setXY(index, uv.getX(index) * spanU, uv.getY(index) * spanV)
    }
  })
  uv.needsUpdate = true
  geometries.set(key, geometry)
  return geometry
}

const planes = new Map<string, PlaneGeometry>()

export function meteredPlane(width: number, height: number) {
  const key = `${width}:${height}`
  const cached = planes.get(key)
  if (cached) {
    return cached
  }
  const geometry = new PlaneGeometry(width, height)
  const uv = geometry.getAttribute("uv")
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * width, uv.getY(index) * height)
  }
  uv.needsUpdate = true
  planes.set(key, geometry)
  return geometry
}
