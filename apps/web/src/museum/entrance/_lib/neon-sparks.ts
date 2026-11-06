import { createRandom, type Random } from "@/museum/_lib/relief/height-field"

type Rgb = { r: number; g: number; b: number }

/** Linear colors a spark cools through: hot white, warm amber, then ember. */
export type SparkRamp = { hot: Rgb; warm: Rgb; ember: Rgb }

export type SparkOrigin = { x: number; y: number; z: number }

export type SparkPool = {
  size: number
  positions: Float32Array
  colors: Float32Array
  velocities: Float32Array
  ages: Float32Array
  lifetimes: Float32Array
  random: Random
  ramp: SparkRamp
  cursor: number
  awake: boolean
}

const sparkPhysics = {
  gravity: 7.8,
  drag: 1.6,
  speed: { min: 0.8, max: 2.7 },
  life: { min: 0.35, max: 1.05 },
  hotUntil: 0.22,
  fade: 1.6,
  twinkle: 0.3,
}

export function createSparkPool(
  size: number,
  seed: number,
  ramp: SparkRamp
): SparkPool {
  return {
    size,
    positions: new Float32Array(size * 3),
    colors: new Float32Array(size * 3),
    velocities: new Float32Array(size * 3),
    ages: new Float32Array(size),
    lifetimes: new Float32Array(size),
    random: createRandom(seed),
    ramp,
    cursor: 0,
    awake: false,
  }
}

function launch(pool: SparkPool, slot: number, origin: SparkOrigin) {
  const { random } = pool
  const { speed, life } = sparkPhysics
  const directionX = (random() * 2 - 1) * 1.1
  const directionY = random() * 1.5 - 0.25
  const directionZ = 0.35 + random() * 0.9
  const scale =
    (speed.min + (speed.max - speed.min) * random()) /
    Math.hypot(directionX, directionY, directionZ)
  const offset = slot * 3
  pool.positions[offset] = origin.x
  pool.positions[offset + 1] = origin.y
  pool.positions[offset + 2] = origin.z
  pool.velocities[offset] = directionX * scale
  pool.velocities[offset + 1] = directionY * scale
  pool.velocities[offset + 2] = directionZ * scale
  pool.ages[slot] = 0
  pool.lifetimes[slot] = life.min + (life.max - life.min) * random()
}

/** Reuses the oldest slots of the fixed pool. */
export function emitSparks(
  pool: SparkPool,
  origin: SparkOrigin,
  count: number
) {
  for (let emitted = 0; emitted < count; emitted += 1) {
    launch(pool, pool.cursor, origin)
    pool.cursor = (pool.cursor + 1) % pool.size
  }
  pool.awake = true
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function writeColor(pool: SparkPool, slot: number, progress: number) {
  const { hot, warm, ember } = pool.ramp
  const isHot = progress < sparkPhysics.hotUntil
  const from = isHot ? hot : warm
  const to = isHot ? warm : ember
  const amount = isHot
    ? progress / sparkPhysics.hotUntil
    : (progress - sparkPhysics.hotUntil) / (1 - sparkPhysics.hotUntil)
  const fade =
    (1 - progress) ** sparkPhysics.fade *
    (1 - sparkPhysics.twinkle * pool.random())
  const offset = slot * 3
  pool.colors[offset] = mix(from.r, to.r, amount) * fade
  pool.colors[offset + 1] = mix(from.g, to.g, amount) * fade
  pool.colors[offset + 2] = mix(from.b, to.b, amount) * fade
}

function moveSpark(pool: SparkPool, slot: number, delta: number) {
  const offset = slot * 3
  const damping = Math.max(0, 1 - sparkPhysics.drag * delta)
  const { positions, velocities } = pool
  velocities[offset + 1] -= sparkPhysics.gravity * delta
  for (let axis = offset; axis < offset + 3; axis += 1) {
    velocities[axis] *= damping
    positions[axis] += velocities[axis] * delta
  }
}

function extinguish(pool: SparkPool, slot: number) {
  pool.colors.fill(0, slot * 3, slot * 3 + 3)
}

/** Integrates live sparks; returns whether the buffers were written. */
export function stepSparks(pool: SparkPool, delta: number) {
  if (!pool.awake) {
    return false
  }
  let alive = 0
  for (let slot = 0; slot < pool.size; slot += 1) {
    const lifetime = pool.lifetimes[slot]
    if (pool.ages[slot] >= lifetime) {
      continue
    }
    pool.ages[slot] += delta
    if (pool.ages[slot] >= lifetime) {
      extinguish(pool, slot)
      continue
    }
    alive += 1
    moveSpark(pool, slot, delta)
    writeColor(pool, slot, pool.ages[slot] / lifetime)
  }
  pool.awake = alive > 0
  return true
}

export function clearSparks(pool: SparkPool) {
  pool.ages.fill(0)
  pool.lifetimes.fill(0)
  pool.colors.fill(0)
  pool.awake = false
}
