import { cssFontFamily, loadFontFamilies } from "@/museum/_lib/css-font"
import type { ArcPath } from "@/museum/entrance/_lib/neon-arc"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"

export const galleryName = "Dollashashin's Gallery"

export const signCanvasSize = { width: 2048, height: 512 }

export const signAspect = signCanvasSize.width / signCanvasSize.height

const { neon, palette } = sceneTokens
const { width, height } = signCanvasSize
const padding = 80
const haloScale = 0.5
const haloEdge = 56
const clearBlack = `${palette.black}00`

/** How far a dimmed letter's glow fades into its neighbours, in pixels. */
export const signFeather = 26

/** How far each letter's tag reaches past its tube, in pixels. */
const tagReach = 12
const tube = { rim: 5, edge: 2 }
const glowPasses = [
  { blur: 48, alpha: 0.6, color: neon.glow },
  { blur: 26, alpha: 1, color: neon.glow },
  { blur: 12, alpha: 1, color: neon.glow },
  { blur: 5, alpha: 1, color: neon.glow },
  { blur: 2, alpha: 1, color: neon.rim },
]
const arcStrokes = [
  { width: 16, blur: 44, color: neon.arcGlow },
  { width: 7, blur: 16, color: neon.arcGlow },
  { width: 3.5, blur: 6, color: neon.arc },
]

type Layer = {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
}

/**
 * The sign in still layers: the unlit glass, the lit tubes, their halo, a
 * tag map saying which letter owns each tube (its index + 1 in red), and a
 * layer for arcs. The neon shader mixes them per letter, so a flickering
 * letter never repaints a canvas; only a live arc does.
 */
export type SignLayers = {
  unlit: Layer
  core: Layer
  halo: Layer
  tags: Layer
  arc: Layer
}

/** A letter's tube in canvas pixels: its x-range and ink extent. */
export type LetterSpan = {
  start: number
  end: number
  top: number
  middle: number
  bottom: number
}

type TextLayout = {
  font: string
  x: number
  baseline: number
}

export type SignPainter = {
  layers: SignLayers | null
  spans: LetterSpan[]
  /** Bumped whenever the layers are rebuilt, e.g. once the font loads. */
  version: number
}

function createLayer(scale = 1): Layer | null {
  const canvas = document.createElement("canvas")
  canvas.width = width * scale
  canvas.height = height * scale
  const context = canvas.getContext("2d")
  if (!context) {
    return null
  }
  context.scale(scale, scale)
  return { canvas, context }
}

function createLayers(): SignLayers | null {
  const unlit = createLayer()
  const core = createLayer()
  const halo = createLayer(haloScale)
  const tags = createLayer(haloScale)
  const arc = createLayer()
  if (!unlit || !core || !halo || !tags || !arc) {
    return null
  }
  return { unlit, core, halo, tags, arc }
}

function layoutText(context: CanvasRenderingContext2D, family: string) {
  const maxWidth = width - padding * 2
  let size = height * 0.62
  context.font = `${size}px ${family}`
  const measured = context.measureText(galleryName).width
  if (measured > maxWidth) {
    size *= maxWidth / measured
  }
  const font = `${size}px ${family}`
  context.font = font
  const ink = context.measureText(galleryName)
  return {
    font,
    x: (width - ink.width) / 2,
    baseline:
      (height + ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2,
  } satisfies TextLayout
}

function measureSpans(context: CanvasRenderingContext2D, text: TextLayout) {
  const last = galleryName.length - 1
  const edge = (index: number) =>
    text.x + context.measureText(galleryName.slice(0, index)).width
  return Array.from(galleryName, (letter, index): LetterSpan => {
    const glyph = context.measureText(letter)
    const top = text.baseline - glyph.actualBoundingBoxAscent
    const bottom = text.baseline + glyph.actualBoundingBoxDescent
    return {
      start: index === 0 ? 0 : edge(index),
      end: index === last ? width : edge(index + 1),
      top,
      middle: (top + bottom) / 2,
      bottom,
    }
  })
}

function prepare(layer: Layer, text: TextLayout) {
  const { context } = layer
  context.clearRect(0, 0, width, height)
  context.font = text.font
  context.textAlign = "left"
  context.textBaseline = "alphabetic"
  return context
}

function drawUnlit(layer: Layer, text: TextLayout) {
  const context = prepare(layer, text)
  const ink = context.measureText(galleryName)
  const glass = context.createLinearGradient(
    0,
    text.baseline - ink.actualBoundingBoxAscent,
    0,
    text.baseline + ink.actualBoundingBoxDescent
  )
  glass.addColorStop(0, neon.tubeEdge)
  glass.addColorStop(0.45, neon.tube)
  glass.addColorStop(1, neon.tubeShade)
  context.lineJoin = "round"
  context.lineWidth = tube.edge
  context.strokeStyle = neon.tubeEdge
  context.strokeText(galleryName, text.x, text.baseline)
  context.fillStyle = glass
  context.fillText(galleryName, text.x, text.baseline)
}

function drawCore(layer: Layer, text: TextLayout) {
  const context = prepare(layer, text)
  context.lineJoin = "round"
  context.lineWidth = tube.rim
  context.strokeStyle = neon.rim
  context.strokeText(galleryName, text.x, text.baseline)
  context.fillStyle = neon.core
  context.fillText(galleryName, text.x, text.baseline)
}

/** Erases the halo towards the canvas border so wide blurs never end in a hard edge. */
function fadeEdges(context: CanvasRenderingContext2D) {
  const edges = [
    [0, 0, 0, haloEdge],
    [0, height, 0, height - haloEdge],
    [0, 0, haloEdge, 0],
    [width, 0, width - haloEdge, 0],
  ] as const
  context.globalCompositeOperation = "destination-out"
  for (const [fromX, fromY, toX, toY] of edges) {
    const gradient = context.createLinearGradient(fromX, fromY, toX, toY)
    gradient.addColorStop(0, palette.black)
    gradient.addColorStop(1, clearBlack)
    context.fillStyle = gradient
    context.fillRect(0, 0, width, height)
  }
  context.globalCompositeOperation = "source-over"
}

function drawHalo(layer: Layer, text: TextLayout) {
  const context = prepare(layer, text)
  for (const pass of glowPasses) {
    context.globalAlpha = pass.alpha
    context.shadowBlur = pass.blur
    context.shadowColor = pass.color
    context.fillStyle = pass.color
    context.fillText(galleryName, text.x, text.baseline)
  }
  context.globalAlpha = 1
  context.shadowBlur = 0
  fadeEdges(context)
}

/**
 * Each letter drawn alone, fattened, in its own tag colour. Script letters
 * overlap their neighbours' x-ranges, so the tag, not the x-range, says
 * which tube a pixel belongs to.
 */
function drawTags(layer: Layer, text: TextLayout) {
  const context = prepare(layer, text)
  context.lineJoin = "round"
  context.lineWidth = tagReach
  Array.from(galleryName).forEach((letter, index) => {
    if (!letter.trim()) {
      return
    }
    const x = text.x + context.measureText(galleryName.slice(0, index)).width
    const tag = `rgb(${index + 1}, 0, 0)`
    context.fillStyle = tag
    context.strokeStyle = tag
    context.strokeText(letter, x, text.baseline)
    context.fillText(letter, x, text.baseline)
  })
}

function layoutSign(painter: SignPainter, family: string) {
  const { layers } = painter
  if (!layers) {
    return
  }
  const text = layoutText(layers.unlit.context, family)
  painter.spans = measureSpans(layers.unlit.context, text)
  drawUnlit(layers.unlit, text)
  drawCore(layers.core, text)
  drawHalo(layers.halo, text)
  drawTags(layers.tags, text)
  painter.version += 1
}

export function createSignPainter(): SignPainter {
  const painter: SignPainter = {
    layers: createLayers(),
    spans: [],
    version: 0,
  }
  const family = cssFontFamily("font-heading")
  layoutSign(painter, family)
  void loadFontFamilies([family], galleryName)
    .then(() => layoutSign(painter, family))
    .catch(() => undefined)
  return painter
}

function tracePaths(
  context: CanvasRenderingContext2D,
  paths: readonly ArcPath[]
) {
  context.beginPath()
  for (const { points, count } of paths) {
    context.moveTo(points[0], points[1])
    for (let index = 1; index < count; index += 1) {
      context.lineTo(points[index * 2], points[index * 2 + 1])
    }
  }
}

/** Repaints the arc layer: a weak arc is a thin violet thread, a strong one a fat bolt. */
export function paintArcs(
  painter: SignPainter,
  paths: readonly ArcPath[],
  strength: number
) {
  const context = painter.layers?.arc.context
  if (!context) {
    return
  }
  const thickness = 0.45 + 0.55 * strength
  context.clearRect(0, 0, width, height)
  context.save()
  context.lineCap = "round"
  context.lineJoin = "round"
  tracePaths(context, paths)
  for (const stroke of arcStrokes) {
    context.lineWidth = stroke.width * thickness
    context.shadowBlur = stroke.blur * thickness
    context.shadowColor = stroke.color
    context.strokeStyle = stroke.color
    context.stroke()
  }
  context.restore()
}
