/**
 * Trauma-style camera shake. Events add trauma, trauma drains at a steady
 * rate, and the felt shake is trauma² so small knocks stay small and big hits
 * fall off fast. Offsets come from smooth gradient noise, so the camera lurches
 * instead of buzzing. A slam also adds a sprung kick (the jolt itself) and a
 * quick field-of-view punch.
 */

/** Offsets to add on top of a camera pose, in the camera's own frame. */
export type CameraShake = {
  /** Metres to the camera's right. */
  x: number
  /** Metres up. */
  y: number
  /** Metres forward. */
  z: number
  pitch: number
  yaw: number
  roll: number
  /** Degrees added to the field of view. */
  fov: number
}

export const cameraShakeTuning = {
  /** Trauma drained per second: a full jolt fades out in about 0.6 s. */
  decay: 1.6,
  /** Peak noise offsets at full trauma, metres and radians. */
  position: 0.04,
  pitch: 0.022,
  yaw: 0.014,
  roll: 0.032,
  /** Noise rate in Hz: a hard rattle that slows as it settles. */
  rattle: 16,
  settle: 5,
} as const

/** Door slam: full trauma, a sprung drop through the knees, a tunnel punch. */
export const slamJolt = {
  trauma: 1,
  /** Kick peak: metres down, radians nose-down, radians of roll. */
  drop: 0.035,
  nod: 0.015,
  tilt: 0.012,
  /** Kick spring, Hz and damping ratio. */
  frequency: 5.5,
  damping: 0.3,
  /** Degrees the view narrows, and seconds to hit and let go. */
  fovPunch: 5,
  punchAttack: 0.05,
  punchRelease: 0.5,
} as const

const kickOmega = slamJolt.frequency * Math.PI * 2
const kickDecay = slamJolt.damping * kickOmega
const kickRing = kickOmega * Math.sqrt(1 - slamJolt.damping ** 2)
const kickPeakTime = Math.atan2(kickRing, kickDecay) / kickRing
const kickPeak =
  Math.exp(-kickDecay * kickPeakTime) * Math.sin(kickRing * kickPeakTime)
const kickEnd = 6 / kickDecay

const shake = {
  trauma: 0,
  /** Noise clock, run faster while the shake is strong. */
  clock: 0,
  kickTime: Number.POSITIVE_INFINITY,
  kickScale: 0,
  punchTime: Number.POSITIVE_INFINITY,
  punchScale: 0,
}

const sample: CameraShake = {
  x: 0,
  y: 0,
  z: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
  fov: 0,
}

function lattice(index: number, seed: number) {
  let hash = Math.imul(index, 0x27d4eb2d) ^ Math.imul(seed, 0x165667b1)
  hash = Math.imul(hash ^ (hash >>> 15), 0x85ebca6b)
  hash ^= hash >>> 13
  return ((hash >>> 0) / 0xffffffff) * 2 - 1
}

/** 1D gradient noise in about [-1, 1], smooth and never repeating. */
function smoothNoise(time: number, seed: number) {
  const index = Math.floor(time)
  const t = time - index
  const fade = t * t * t * (t * (t * 6 - 15) + 10)
  const from = lattice(index, seed) * t
  const to = lattice(index + 1, seed) * (t - 1)
  return (from + (to - from) * fade) * 2
}

/** Damped spring hit at t = 0, scaled so its first swing peaks at 1. */
function kickAt(elapsed: number) {
  if (elapsed >= kickEnd) {
    return 0
  }
  return (
    (Math.exp(-kickDecay * elapsed) * Math.sin(kickRing * elapsed)) / kickPeak
  )
}

function punchAt(elapsed: number) {
  if (elapsed < slamJolt.punchAttack) {
    return Math.sin(((elapsed / slamJolt.punchAttack) * Math.PI) / 2)
  }
  const release = (elapsed - slamJolt.punchAttack) / slamJolt.punchRelease
  return release >= 1 ? 0 : (1 - release) ** 3
}

// Each channel reads the noise at its own seed and offset, so they never
// cross zero together.
function writeNoise(strength: number) {
  const { clock } = shake
  const { position, pitch, yaw, roll } = cameraShakeTuning
  sample.x = smoothNoise(clock + 0.11, 3) * position * strength
  sample.y = smoothNoise(clock + 0.37, 7) * position * strength
  sample.z = smoothNoise(clock + 0.71, 11) * position * strength * 0.5
  sample.pitch = smoothNoise(clock + 0.19, 13) * pitch * strength
  sample.yaw = smoothNoise(clock + 0.53, 17) * yaw * strength
  sample.roll = smoothNoise(clock + 0.83, 19) * roll * strength
}

function clearNoise() {
  sample.x = 0
  sample.y = 0
  sample.z = 0
  sample.pitch = 0
  sample.yaw = 0
  sample.roll = 0
}

export function addCameraTrauma(amount: number) {
  shake.trauma = Math.min(1, Math.max(0, shake.trauma + amount))
}

/** The door-slam jolt: trauma, a sprung kick and a FOV punch. */
export function triggerCameraShake(strength = 1) {
  addCameraTrauma(slamJolt.trauma * strength)
  shake.kickTime = 0
  shake.kickScale = strength
  shake.punchTime = 0
  shake.punchScale = strength
}

/** Advances the shake one frame; read the result with `readCameraShake`. */
export function stepCameraShake(delta: number) {
  shake.trauma = Math.max(0, shake.trauma - cameraShakeTuning.decay * delta)
  shake.kickTime += delta
  shake.punchTime += delta
  if (shake.trauma > 0) {
    const { rattle, settle } = cameraShakeTuning
    shake.clock += delta * (settle + (rattle - settle) * shake.trauma)
    writeNoise(shake.trauma * shake.trauma)
  } else {
    clearNoise()
  }
  const kick = kickAt(shake.kickTime) * shake.kickScale
  sample.y -= kick * slamJolt.drop
  sample.pitch -= kick * slamJolt.nod
  sample.roll += kick * slamJolt.tilt
  sample.fov = -punchAt(shake.punchTime) * shake.punchScale * slamJolt.fovPunch
}

/** This frame's offsets. The object is reused; read it, don't keep it. */
export function readCameraShake(): Readonly<CameraShake> {
  return sample
}

export function resetCameraShake() {
  shake.trauma = 0
  shake.kickTime = Number.POSITIVE_INFINITY
  shake.punchTime = Number.POSITIVE_INFINITY
  clearNoise()
  sample.fov = 0
}
