import {
  createRandom,
  fractalNoise,
  paintNormalMap,
  type HeightField,
} from "@/museum/_lib/relief/height-field"

type ReliefSpec = {
  width: number
  height: number
  seed: number
  paint: HTMLCanvasElement
}

const weavePerPixel = 0.42
const impastoWeight = 0.55
const strokeWeight = 0.2

function luminance(data: Uint8ClampedArray, index: number) {
  const offset = index * 4
  return (
    ((data[offset] ?? 0) * 0.3 +
      (data[offset + 1] ?? 0) * 0.59 +
      (data[offset + 2] ?? 0) * 0.11) /
    255
  )
}

function brushField(spec: ReliefSpec): HeightField {
  const { width, height } = spec
  const random = createRandom(spec.seed)
  const strokes = fractalNoise(random, { x: 18, y: 6, octaves: 3 })
  const context = spec.paint.getContext("2d", { willReadFrequently: true })
  const paint = context?.getImageData(0, 0, width, height).data
  const values = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      const weave =
        Math.sin(x * weavePerPixel * Math.PI) *
        Math.sin(y * weavePerPixel * Math.PI)
      const impasto = paint ? luminance(paint, index) : 0
      values[index] =
        0.5 +
        0.08 * weave +
        impastoWeight * impasto +
        strokeWeight * strokes(x / width, y / height)
    }
  }
  return { width, height, values }
}

export function paintCanvasRelief(
  context: CanvasRenderingContext2D,
  spec: ReliefSpec
) {
  paintNormalMap(context, { field: brushField(spec), strength: 2.2 })
}
