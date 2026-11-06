import { entranceDoor, playerSpawn } from "@/museum/_lib/museum-layout"
import type { MuseumPhase } from "@/museum/_lib/museum-store"
import { createRandom, type Random } from "@/museum/_lib/relief/height-field"
import {
  entranceSign,
  type Point,
} from "@/museum/entrance/_lib/entrance-layout"
import {
  createSignPainter,
  galleryName,
  paintArcs,
  signAspect,
  signCanvasSize,
  type LetterSpan,
  type SignPainter,
} from "@/museum/entrance/_lib/entrance-sign"
import {
  createArcPath,
  shapeArc,
  type ArcEnds,
  type ArcPath,
} from "@/museum/entrance/_lib/neon-arc"
import {
  createNeonFlicker,
  healNeonFlicker,
  settleNeonFlicker,
  stepNeonFlicker,
  type NeonFlicker,
} from "@/museum/entrance/_lib/neon-flicker"
import {
  createNeonMaterial,
  disposeNeonMaterial,
  refreshNeonLayers,
  setNeonUniform,
  type NeonMaterial,
} from "@/museum/entrance/_lib/neon-material"
import { signalCrackle } from "@/museum/entrance/_lib/neon-signal"
import {
  clearSparks,
  createSparkPool,
  emitSparks,
  stepSparks,
  type SparkOrigin,
  type SparkPool,
} from "@/museum/entrance/_lib/neon-sparks"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  MathUtils,
  PointsMaterial,
  SRGBColorSpace,
} from "three"

const { neon, palette } = sceneTokens
const [signX, signY, signZ] = entranceSign.center
const signHeight = entranceSign.width / signAspect

/** "Dollashashin's Gallery": every character with a tube can fail. */
const glyphs = Array.from(galleryName).flatMap((letter, index) =>
  letter.trim() ? [index] : []
)

export const neonLight = {
  position: [signX, signY - 0.1, signZ + 0.7] satisfies Point,
  intensity: 2.2,
  flash: 6,
  flashDecay: 13,
  distance: 4.5,
  decay: 2,
}

const sparkSettings = {
  pool: 64,
  burst: [18, 30] as const,
  size: 0.06,
  lift: 0.03,
}
const arcSettings = {
  duration: [0.12, 0.3] as const,
  jitter: 0.035,
  jag: 0.28,
  /** Chance an arc leaps to the next letter instead of hugging its own. */
  bridge: 0.35,
  level: { weak: 0.55, strong: 1 },
}
const forkSettings = { jag: 0.3, reach: 0.9 }
const insideFade = {
  from: playerSpawn.position[2] + 0.3,
  to: entranceDoor.innerZ - 0.3,
}

type NeonArc = {
  letter: number
  /** The neighbour a bridging arc leaps to, or -1. */
  partner: number
  strength: number
  remaining: number
  jitter: number
  bolt: ArcPath
  fork: ArcPath
  paths: readonly ArcPath[]
  random: Random
}

type SparkLayer = {
  pool: SparkPool
  geometry: BufferGeometry
  material: PointsMaterial
  sprite: CanvasTexture
  attributes: readonly BufferAttribute[]
}

export type NeonSign = {
  painter: SignPainter
  shader: NeonMaterial
  flicker: NeonFlicker
  sparks: SparkLayer
  arc: NeonArc
  mode: "live" | "steady" | "healed"
  flash: number
  paintedVersion: number
  lightIntensity: number
}

export type NeonFrame = {
  phase: MuseumPhase
  cameraZ: number
  delta: number
  reducedMotion: boolean
  // After midnight: every letter of the name burns, steady.
  isHealed: boolean
}

const sparkOrigin: SparkOrigin = { x: 0, y: 0, z: 0 }
const boltEnds: ArcEnds = { fromX: 0, fromY: 0, toX: 0, toY: 0 }
const forkEnds: ArcEnds = { fromX: 0, fromY: 0, toX: 0, toY: 0 }

function between(random: Random, [min, max]: readonly [number, number]) {
  return min + (max - min) * random()
}

function linear(hex: string) {
  const { r, g, b } = new Color(hex)
  return { r, g, b }
}

function createSparkSprite() {
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")
  if (context) {
    const radius = size / 2
    const glow = context.createRadialGradient(
      radius,
      radius,
      0,
      radius,
      radius,
      radius
    )
    glow.addColorStop(0, neon.sparkHot)
    glow.addColorStop(0.3, neon.sparkHot)
    glow.addColorStop(1, palette.black)
    context.fillStyle = glow
    context.fillRect(0, 0, size, size)
  }
  const sprite = new CanvasTexture(canvas)
  sprite.colorSpace = SRGBColorSpace
  return sprite
}

function createSparkLayer(seed: number): SparkLayer {
  const pool = createSparkPool(sparkSettings.pool, seed, {
    hot: linear(neon.sparkHot),
    warm: linear(neon.sparkWarm),
    ember: linear(neon.sparkEmber),
  })
  const position = new BufferAttribute(pool.positions, 3)
  const color = new BufferAttribute(pool.colors, 3)
  position.setUsage(DynamicDrawUsage)
  color.setUsage(DynamicDrawUsage)
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", position)
  geometry.setAttribute("color", color)
  const sprite = createSparkSprite()
  const material = new PointsMaterial({
    size: sparkSettings.size,
    map: sprite,
    vertexColors: true,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    toneMapped: false,
  })
  return { pool, geometry, material, sprite, attributes: [position, color] }
}

export function createNeonSign(): NeonSign {
  // A fresh seed per visit, so the sign never fails the same way twice.
  const seed = Math.floor(Math.random() * 2 ** 31)
  const painter = createSignPainter()
  const flicker = createNeonFlicker({
    letterCount: galleryName.length,
    glyphs,
    seed,
  })
  const bolt = createArcPath(4)
  const fork = createArcPath(3)
  const sign: NeonSign = {
    painter,
    shader: createNeonMaterial(painter.layers, flicker.levels),
    flicker,
    sparks: createSparkLayer(seed + 7),
    arc: {
      letter: -1,
      partner: -1,
      strength: 0,
      remaining: 0,
      jitter: 0,
      bolt,
      fork,
      paths: [bolt, fork],
      random: createRandom(seed + 11),
    },
    mode: "live",
    flash: 0,
    paintedVersion: -1,
    lightIntensity: 0,
  }
  refreshIfRelaid(sign)
  return sign
}

export function disposeNeonSign(sign: NeonSign) {
  disposeNeonMaterial(sign.shader)
  sign.sparks.geometry.dispose()
  sign.sparks.material.dispose()
  sign.sparks.sprite.dispose()
}

/** The still layers change only when the font arrives and the sign relays. */
function refreshIfRelaid(sign: NeonSign) {
  if (sign.paintedVersion !== sign.painter.version) {
    refreshNeonLayers(sign.shader, sign.painter.spans)
    sign.paintedVersion = sign.painter.version
  }
}

function markSparks(sign: NeonSign) {
  for (const attribute of sign.sparks.attributes) {
    attribute.needsUpdate = true
  }
}

/** The glyph next to `letter`, skipping the space, on a random side. */
function neighbour(letter: number, random: Random) {
  const order = glyphs.indexOf(letter)
  const side = random() < 0.5 ? -1 : 1
  return glyphs[order + side] ?? glyphs[order - side] ?? -1
}

function aroundLetter(span: LetterSpan, random: Random) {
  const reach = (span.end - span.start) * 0.7
  const tall = span.bottom - span.top
  boltEnds.fromX = span.start - reach * (0.3 + 0.7 * random())
  boltEnds.fromY = span.top - tall * 0.5 * random()
  boltEnds.toX = span.end + reach * (0.3 + 0.9 * random())
  boltEnds.toY = span.middle + tall * (random() - 0.5)
}

function acrossLetters(from: LetterSpan, to: LetterSpan, random: Random) {
  const tall = (from.bottom - from.top + to.bottom - to.top) / 2
  boltEnds.fromX = MathUtils.lerp(from.start, from.end, random())
  boltEnds.fromY = from.top + tall * 0.6 * random()
  boltEnds.toX = MathUtils.lerp(to.start, to.end, random())
  boltEnds.toY = to.middle + tall * 0.6 * (random() - 0.5)
}

function reshapeArc(sign: NeonSign) {
  const { arc } = sign
  const span = sign.painter.spans[arc.letter]
  if (!span) {
    return
  }
  const { random } = arc
  const partner = sign.painter.spans[arc.partner]
  if (partner) {
    acrossLetters(span, partner, random)
  } else {
    aroundLetter(span, random)
  }
  const reach = (span.end - span.start) * 0.7
  const tall = span.bottom - span.top
  shapeArc(arc.bolt, boltEnds, random, arcSettings.jag)
  const pick = 2 + Math.floor(random() * (arc.bolt.count - 4))
  forkEnds.fromX = arc.bolt.points[pick * 2]
  forkEnds.fromY = arc.bolt.points[pick * 2 + 1]
  forkEnds.toX = forkEnds.fromX + (random() - 0.5) * reach * 2
  forkEnds.toY =
    forkEnds.fromY + (random() < 0.5 ? -1 : 1) * tall * forkSettings.reach * 0.5
  shapeArc(arc.fork, forkEnds, random, forkSettings.jag)
  paintArcs(sign.painter, arc.paths, arc.strength)
  if (sign.shader.arcTexture) {
    sign.shader.arcTexture.needsUpdate = true
  }
}

function burstSparks(sign: NeonSign, span: LetterSpan, strength: number) {
  const { random } = sign.arc
  const x = MathUtils.lerp(span.start, span.end, 0.2 + 0.6 * random())
  const y = MathUtils.lerp(span.top, span.bottom, random())
  sparkOrigin.x = signX + (x / signCanvasSize.width - 0.5) * entranceSign.width
  sparkOrigin.y = signY + (0.5 - y / signCanvasSize.height) * signHeight
  sparkOrigin.z = signZ + sparkSettings.lift
  const count = Math.round(
    between(random, sparkSettings.burst) * (0.2 + 0.8 * strength)
  )
  emitSparks(sign.sparks.pool, sparkOrigin, Math.max(3, count))
}

/** An arc on a letter: a bolt on the sign, sparks, a flash and a crackle. */
function strike(sign: NeonSign, letter: number, strength: number) {
  const span = sign.painter.spans[letter]
  if (!span) {
    return
  }
  const { arc } = sign
  arc.letter = letter
  arc.partner =
    arc.random() < arcSettings.bridge ? neighbour(letter, arc.random) : -1
  arc.strength = strength
  arc.remaining =
    between(arc.random, arcSettings.duration) * (0.6 + 0.6 * strength)
  arc.jitter = arcSettings.jitter
  reshapeArc(sign)
  const { weak, strong } = arcSettings.level
  setNeonUniform(
    sign.shader,
    "arcLevel",
    MathUtils.lerp(weak, strong, strength)
  )
  sign.flash = Math.max(sign.flash, strength)
  burstSparks(sign, span, strength)
  signalCrackle(strength)
}

function advanceArc(sign: NeonSign, delta: number) {
  const { arc } = sign
  if (arc.remaining <= 0) {
    return
  }
  arc.remaining -= delta
  arc.jitter -= delta
  if (arc.remaining <= 0) {
    setNeonUniform(sign.shader, "arcLevel", 0)
  } else if (arc.jitter <= 0) {
    arc.jitter = arcSettings.jitter
    reshapeArc(sign)
  }
}

function quiet(sign: NeonSign) {
  clearSparks(sign.sparks.pool)
  markSparks(sign)
  sign.arc.remaining = 0
  sign.flash = 0
  setNeonUniform(sign.shader, "arcLevel", 0)
}

function holdSteady(sign: NeonSign) {
  if (sign.mode !== "steady") {
    sign.mode = "steady"
    settleNeonFlicker(sign.flicker)
    quiet(sign)
  }
}

/** Midnight has struck: no flicker, no dead letter, no spark. */
function holdHealed(sign: NeonSign) {
  if (sign.mode !== "healed") {
    sign.mode = "healed"
    healNeonFlicker(sign.flicker)
    quiet(sign)
  }
}

function runLive(sign: NeonSign, delta: number) {
  sign.mode = "live"
  stepNeonFlicker(sign.flicker, delta)
  if (sign.flicker.arc >= 0) {
    strike(sign, sign.flicker.arc, sign.flicker.arcStrength)
  } else {
    advanceArc(sign, delta)
  }
  sign.flash *= Math.exp(-neonLight.flashDecay * delta)
  if (stepSparks(sign.sparks.pool, delta)) {
    markSparks(sign)
  }
}

/** 1 outside, fading to 0 as the camera walks in, so no pink leaks indoors. */
function neonPresence(phase: MuseumPhase, cameraZ: number) {
  if (phase === "gallery") {
    return 0
  }
  return MathUtils.smoothstep(cameraZ, insideFade.from, insideFade.to)
}

/** Advances the failing sign; all work pauses while the player is inside. */
export function stepNeonSign(sign: NeonSign, frame: NeonFrame) {
  if (frame.phase !== "gallery") {
    if (frame.isHealed) {
      holdHealed(sign)
    } else if (frame.reducedMotion) {
      holdSteady(sign)
    } else {
      runLive(sign, frame.delta)
    }
    refreshIfRelaid(sign)
    setNeonUniform(sign.shader, "master", sign.flicker.master)
  }
  const glow =
    neonLight.intensity * sign.flicker.brightness + neonLight.flash * sign.flash
  sign.lightIntensity = glow * neonPresence(frame.phase, frame.cameraZ)
}
