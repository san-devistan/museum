import {
  laceLayout,
  laceOpening,
  openingPoints,
  scallopOutline,
} from "@/museum/gallery/_lib/lace-outline"
import {
  ExtrudeGeometry,
  Path,
  Shape,
  Vector2,
  type BufferGeometry,
} from "three"

export const laceFrameDepth = 0.05
export const laceFrameBevel = 0.005

const openingCornerSteps = 16

type FrameSize = { width: number; height: number }

function outlineShape(size: FrameSize) {
  const layout = laceLayout(size)
  const outline = scallopOutline(layout)
  const toLocal = (x: number, y: number) =>
    [x - size.width / 2, size.height / 2 - y] as const
  const shape = new Shape()
  outline.forEach((point, index) => {
    const [x, y] = toLocal(point.x, point.y)
    if (index === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  })
  shape.closePath()
  const opening = laceOpening(layout)
  const hole = new Path()
  hole.setFromPoints(
    openingPoints(opening, openingCornerSteps).map(
      ({ x, y }) => new Vector2(x, y)
    )
  )
  hole.closePath()
  shape.holes.push(hole)
  return shape
}

function planarUvs(geometry: BufferGeometry, size: FrameSize) {
  const position = geometry.getAttribute("position")
  const uv = geometry.getAttribute("uv")
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(
      index,
      position.getX(index) / size.width + 0.5,
      position.getY(index) / size.height + 0.5
    )
  }
  uv.needsUpdate = true
}

const frames = new Map<string, BufferGeometry>()

export function laceFrameGeometry(size: FrameSize) {
  const key = `${size.width}:${size.height}`
  const cached = frames.get(key)
  if (cached) {
    return cached
  }
  const geometry = new ExtrudeGeometry(outlineShape(size), {
    depth: laceFrameDepth - laceFrameBevel * 2,
    bevelEnabled: true,
    bevelThickness: laceFrameBevel,
    bevelSize: laceFrameBevel,
    bevelSegments: 2,
    curveSegments: 1,
  })
  geometry.translate(0, 0, laceFrameBevel)
  planarUvs(geometry, size)
  frames.set(key, geometry)
  return geometry
}
