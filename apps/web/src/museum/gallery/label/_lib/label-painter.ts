import type { ArtworkLabel } from "@/museum/_lib/exhibit"
import { createRandom } from "@/museum/_lib/relief/height-field"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"

export type LabelFonts = { heading: string; body: string }

type Ink = {
  context: CanvasRenderingContext2D
  fonts: LabelFonts
  width: number
}

export const labelCanvas = { width: 768, height: 512 }

const margin = 64
const fibreCount = 900
const { color } = sceneTokens

function paperSeed(id: string) {
  let hash = 2166136261
  for (const character of id) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }
  return hash >>> 0
}

function paintPaper(context: CanvasRenderingContext2D, seed: number) {
  const { width, height } = labelCanvas
  context.fillStyle = color.paper
  context.fillRect(0, 0, width, height)
  const random = createRandom(seed)
  context.lineCap = "round"
  for (let index = 0; index < fibreCount; index += 1) {
    const x = random() * width
    const y = random() * height
    const angle = random() * Math.PI
    const length = 4 + random() * 14
    context.globalAlpha = 0.03 + random() * 0.05
    context.strokeStyle = random() > 0.5 ? color.pin : color.ink
    context.lineWidth = 0.6 + random()
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    context.stroke()
  }
  context.globalAlpha = 1
}

function fitText(ink: Ink, text: string, font: (size: number) => string) {
  const { context, width } = ink
  let size = 1
  for (const candidate of [96, 84, 72, 64, 56, 48, 42, 36]) {
    size = candidate
    context.font = font(candidate)
    if (context.measureText(text).width <= width) {
      break
    }
  }
  return size
}

function wrapLines(ink: Ink, text: string) {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word
    if (line && ink.context.measureText(next).width > ink.width) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  return line ? [...lines, line] : lines
}

function paintText(ink: Ink, label: ArtworkLabel) {
  const { context, fonts } = ink
  context.textBaseline = "alphabetic"
  context.fillStyle = color.ink
  const titleSize = fitText(ink, label.title, (size) => {
    return `${size}px ${fonts.heading}`
  })
  let y = margin + 16 + titleSize * 0.9
  context.fillText(label.title, margin, y)
  y += 44
  context.fillStyle = color.inkAccent
  context.fillRect(margin, y, 96, 4)
  y += 66
  context.fillStyle = color.ink
  if (label.artist) {
    context.font = `500 40px ${fonts.body}`
    context.fillText(label.artist, margin, y)
    y += 52
  }
  context.font = `32px ${fonts.body}`
  context.globalAlpha = 0.72
  if (label.year) {
    context.fillText(label.year, margin, y)
    y += 48
  }
  if (label.medium) {
    context.font = `28px ${fonts.body}`
    for (const line of wrapLines(ink, label.medium).slice(0, 2)) {
      context.fillText(line, margin, y)
      y += 38
    }
  }
  context.globalAlpha = 1
}

export function paintLabel(
  context: CanvasRenderingContext2D,
  label: ArtworkLabel,
  fonts: LabelFonts
) {
  paintPaper(context, paperSeed(label.id))
  paintText({ context, fonts, width: labelCanvas.width - margin * 2 }, label)
}
