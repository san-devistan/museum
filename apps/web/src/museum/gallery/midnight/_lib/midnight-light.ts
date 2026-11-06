import { candleMaterials } from "@/museum/gallery/candles/_lib/candle-materials"
import {
  flameMaterial,
  haloMaterial,
} from "@/museum/gallery/chandelier/_lib/chandelier-assets"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { Color } from "three"

// Midnight's hold on the manor's light. The room lights and the fill read it
// every frame; the flames of every candle and chandelier, and the warm glow
// they throw on the walls, follow it through their shared materials. It goes dark at the blackout and comes back a little
// warmer and richer, in Madame's whole palette.

type LightState = {
  // Multiplies every room light: 0 in the blackout.
  level: number
  // Ending B: the chandeliers dim as the house keeps the visitor.
  chandelier: number
  // 0 before midnight, 1 after: lights lean toward candle gold and pink.
  warmth: number
  // The renderer's exposure, so emissive and lit surfaces go dark together.
  exposure: number
}

export type LightKind = "candle" | "chandelier"

export const afterMidnightLight = { level: 1.12, warmth: 1 } as const

const beforeMidnightLight = { level: 1, warmth: 0 } as const

export const midnightLight: LightState = {
  level: 1,
  chandelier: 1,
  warmth: 0,
  exposure: 1,
}

const target: LightState = { ...midnightLight }

// Seconds each value takes to (nearly) reach its target.
const easing: LightState = { level: 1, chandelier: 1, warmth: 1, exposure: 1 }

const { manor, props } = sceneTokens
const warmLight = new Color(manor.candleLight)
const warmSky = new Color(manor.candleLight)
const warmGround = new Color(props.candyPink)
const warmShare = { light: 0.2, sky: 0.3, ground: 0.28 } as const
const fillBoost = 0.25

export function aimMidnightLight(next: Partial<LightState>, seconds: number) {
  if (next.level !== undefined) {
    target.level = next.level
    easing.level = seconds
  }
  if (next.chandelier !== undefined) {
    target.chandelier = next.chandelier
    easing.chandelier = seconds
  }
  if (next.warmth !== undefined) {
    target.warmth = next.warmth
    easing.warmth = seconds
  }
  if (next.exposure !== undefined) {
    target.exposure = next.exposure
    easing.exposure = seconds
  }
}

// Snaps to the resting light before or after midnight (a reload, a reset).
export function settleMidnightLight(isMidnight: boolean) {
  const rest = isMidnight ? afterMidnightLight : beforeMidnightLight
  target.level = rest.level
  target.warmth = rest.warmth
  target.chandelier = 1
  target.exposure = 1
  midnightLight.level = rest.level
  midnightLight.warmth = rest.warmth
  midnightLight.chandelier = 1
  midnightLight.exposure = 1
}

// Where the light rests once nothing is running.
// Called every frame, so it writes the targets in place.
export function restMidnightLight(isMidnight: boolean, seconds: number) {
  const rest = isMidnight ? afterMidnightLight : beforeMidnightLight
  target.level = rest.level
  target.warmth = rest.warmth
  target.chandelier = 1
  target.exposure = 1
  easing.level = seconds
  easing.warmth = seconds
  easing.chandelier = seconds
  easing.exposure = seconds
}

function approach(current: number, goal: number, seconds: number, dt: number) {
  if (seconds <= 0) {
    return goal
  }
  // About 98% of the way in `seconds`.
  const next = current + (goal - current) * (1 - Math.exp((-4 * dt) / seconds))
  return Math.abs(goal - next) < 1e-4 ? goal : next
}

type FlameBase = { flame: Color; halo: number; wallGlow: Color }

let flameBase: FlameBase | null = null
let appliedGlow = 1

// Every flame shares a few materials, so dimming them puts out every candle.
function applyFlames() {
  const glow = Math.min(1, midnightLight.level) * midnightLight.chandelier
  if (Math.abs(glow - appliedGlow) < 1e-4) {
    return
  }
  const wallGlow = candleMaterials().glow
  flameBase ??= {
    flame: flameMaterial.color.clone(),
    halo: haloMaterial.opacity,
    wallGlow: wallGlow.color.clone(),
  }
  appliedGlow = glow
  flameMaterial.color.copy(flameBase.flame).multiplyScalar(glow)
  haloMaterial.opacity = flameBase.halo * glow
  wallGlow.color.copy(flameBase.wallGlow).multiplyScalar(glow)
}

export function stepMidnightLight(delta: number) {
  const dt = Math.min(delta, 0.1)
  midnightLight.level = approach(
    midnightLight.level,
    target.level,
    easing.level,
    dt
  )
  midnightLight.chandelier = approach(
    midnightLight.chandelier,
    target.chandelier,
    easing.chandelier,
    dt
  )
  midnightLight.warmth = approach(
    midnightLight.warmth,
    target.warmth,
    easing.warmth,
    dt
  )
  midnightLight.exposure = approach(
    midnightLight.exposure,
    target.exposure,
    easing.exposure,
    dt
  )
  applyFlames()
}

// For the room lights (gallery/candles/room-lights).
export function roomLightLevel(kind: LightKind) {
  return (
    midnightLight.level * (kind === "chandelier" ? midnightLight.chandelier : 1)
  )
}

const baseColors = new Map<string, Color>()

function baseColor(hex: string) {
  let color = baseColors.get(hex)
  if (!color) {
    color = new Color(hex)
    baseColors.set(hex, color)
  }
  return color
}

// A room light's colour, a little warmer after midnight.
export function warmRoomLight(color: Color, hex: string) {
  color
    .copy(baseColor(hex))
    .lerp(warmLight, midnightLight.warmth * warmShare.light)
}

// For the manor's fill (gallery/candles/manor-fill).
export function fillLevel() {
  return midnightLight.level * (1 + fillBoost * midnightLight.warmth)
}

// Tints the fill's target colours in place: gold from above, pink below.
export function warmFill(sky: Color, ground: Color) {
  sky.lerp(warmSky, midnightLight.warmth * warmShare.sky)
  ground.lerp(warmGround, midnightLight.warmth * warmShare.ground)
}
