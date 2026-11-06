import { openingFill, openingPoints } from "@/museum/gallery/_lib/lace-outline"
import { ExtrudeGeometry, Shape, Vector2, type BufferGeometry } from "three"

const cornerSteps = 12
const bulge = 0.012

export const canvasDepth = 0.035
export const canvasBevel = 0.006

function openingShape(halfWidth: number, halfHeight: number) {
  const points = openingPoints({ x: halfWidth, y: halfHeight }, cornerSteps)
  return new Shape(points.map(({ x, y }) => new Vector2(x, y)))
}

function domeFront(
  geometry: BufferGeometry,
  spec: { halfWidth: number; halfHeight: number }
) {
  const position = geometry.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    const z = position.getZ(index)
    if (z < canvasDepth - 0.0001) {
      continue
    }
    const radius = { x: spec.halfWidth, y: spec.halfHeight }
    const point = { x: position.getX(index), y: position.getY(index) }
    const rim = Math.max(0, 1 - openingFill(radius, point))
    position.setZ(index, z + bulge * Math.sqrt(rim))
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
}

function fixOvalUvs(
  geometry: BufferGeometry,
  spec: { halfWidth: number; halfHeight: number }
) {
  const position = geometry.getAttribute("position")
  const uv = geometry.getAttribute("uv")
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(
      index,
      position.getX(index) / (spec.halfWidth * 2) + 0.5,
      position.getY(index) / (spec.halfHeight * 2) + 0.5
    )
  }
  uv.needsUpdate = true
}

const geometries = new Map<string, BufferGeometry>()

export function stretchedCanvas(width: number, height: number) {
  const key = `${width}:${height}`
  const cached = geometries.get(key)
  if (cached) {
    return cached
  }
  const spec = { halfWidth: width / 2, halfHeight: height / 2 }
  const geometry = new ExtrudeGeometry(
    openingShape(spec.halfWidth, spec.halfHeight),
    {
      depth: canvasDepth,
      bevelEnabled: true,
      bevelThickness: canvasBevel,
      bevelSize: canvasBevel,
      bevelSegments: 3,
      curveSegments: 1,
      steps: 1,
    }
  )
  fixOvalUvs(geometry, spec)
  domeFront(geometry, spec)
  geometries.set(key, geometry)
  return geometry
}
