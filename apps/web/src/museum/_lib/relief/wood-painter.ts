import type { HeightField } from "@/museum/_lib/relief/height-field"
import { woodField } from "@/museum/_lib/relief/relief-fields"

export type WoodPaintOptions = {
  field: HeightField
  base: string
  grain: string
}

type Rgb = { r: number; g: number; b: number }

function sampleColor(context: CanvasRenderingContext2D, color: string): Rgb {
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return { r, g, b }
}

export function paintWood(
  context: CanvasRenderingContext2D,
  options: WoodPaintOptions
) {
  const { field } = options
  const base = sampleColor(context, options.base)
  const grain = sampleColor(context, options.grain)
  const output = context.createImageData(field.width, field.height)
  for (let index = 0; index < field.values.length; index += 1) {
    const amount = Math.min(1, Math.max(0, (field.values[index] ?? 0) - 0.45))
    const offset = index * 4
    output.data[offset] = base.r + (grain.r - base.r) * amount * 0.22
    output.data[offset + 1] = base.g + (grain.g - base.g) * amount * 0.22
    output.data[offset + 2] = base.b + (grain.b - base.b) * amount * 0.22
    output.data[offset + 3] = 255
  }
  context.putImageData(output, 0, 0)
}

export { woodField }
