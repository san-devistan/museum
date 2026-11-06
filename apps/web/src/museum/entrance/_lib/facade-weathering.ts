import { createRandom, type Random } from "@/museum/_lib/relief/height-field"

/** A rain or rust run in facade metres, from its source downwards. */
export type Streak = {
  x: number
  y: number
  width: number
  length: number
  tone: "grime" | "rust"
}

type ToPixel = ((x: number, y: number) => readonly [number, number]) & {
  pxPerMeter: number
}

type WeatheringSpec = {
  streaks: readonly Streak[]
  toPixel: ToPixel
  colors: { grime: string; rust: string; damp: string }
  seed: number
}

type Drip = {
  x: number
  y: number
  width: number
  length: number
  alpha: number
}

function dripPath(
  context: CanvasRenderingContext2D,
  drip: Drip,
  random: Random
) {
  const steps = 10
  const left: [number, number][] = []
  const right: [number, number][] = []
  let wander = 0
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    wander += (random() - 0.5) * drip.width * 0.5
    const half = (drip.width / 2) * (1 - 0.7 * t)
    const y = drip.y + drip.length * t
    left.push([drip.x + wander - half, y])
    right.push([drip.x + wander + half, y])
  }
  context.beginPath()
  for (const [x, y] of left) {
    context.lineTo(x, y)
  }
  for (let index = right.length - 1; index >= 0; index -= 1) {
    const [x, y] = right[index] ?? [0, 0]
    context.lineTo(x, y)
  }
  context.closePath()
}

function paintDrip(
  context: CanvasRenderingContext2D,
  drip: Drip & { color: string },
  random: Random
) {
  const gradient = context.createLinearGradient(
    0,
    drip.y,
    0,
    drip.y + drip.length
  )
  gradient.addColorStop(0, drip.color)
  gradient.addColorStop(1, `${drip.color}00`)
  context.globalAlpha = drip.alpha
  context.fillStyle = gradient
  dripPath(context, drip, random)
  context.fill()
}

function paintStreak(
  context: CanvasRenderingContext2D,
  streak: Streak,
  spec: WeatheringSpec,
  random: Random
) {
  const [x, y] = spec.toPixel(streak.x, streak.y)
  const scale = spec.toPixel.pxPerMeter
  const color = streak.tone === "rust" ? spec.colors.rust : spec.colors.grime
  const width = streak.width * scale
  const length = streak.length * scale
  paintDrip(context, { x, y, width, length, alpha: 0.45, color }, random)
  const drips = 3 + Math.floor(random() * 4)
  for (let index = 0; index < drips; index += 1) {
    paintDrip(
      context,
      {
        x: x + (random() - 0.5) * width,
        y,
        width: 2 + random() * width * 0.25,
        length: length * (0.45 + random() * 0.75),
        alpha: 0.5 + random() * 0.4,
        color,
      },
      random
    )
  }
}

function paintBands(context: CanvasRenderingContext2D, damp: string) {
  const { width, height } = context.canvas
  const top = context.createLinearGradient(0, 0, 0, height * 0.3)
  top.addColorStop(0, damp)
  top.addColorStop(1, `${damp}00`)
  context.globalAlpha = 0.75
  context.fillStyle = top
  context.fillRect(0, 0, width, height * 0.3)
  const bottom = context.createLinearGradient(0, height, 0, height * 0.8)
  bottom.addColorStop(0, damp)
  bottom.addColorStop(1, `${damp}00`)
  context.globalAlpha = 0.8
  context.fillStyle = bottom
  context.fillRect(0, height * 0.8, width, height * 0.2)
}

/** Rain runs, rust bleeding from ironwork and rising damp, multiplied in. */
export function paintWeathering(
  context: CanvasRenderingContext2D,
  spec: WeatheringSpec
) {
  const random = createRandom(spec.seed)
  context.save()
  context.globalCompositeOperation = "multiply"
  paintBands(context, spec.colors.damp)
  for (const streak of spec.streaks) {
    paintStreak(context, streak, spec, random)
  }
  context.restore()
}
