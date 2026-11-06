import type { Collider } from "@/museum/_lib/museum-layout"
import { createRandom } from "@/museum/_lib/relief/height-field"
import type { RoomBounds } from "@/museum/gallery/_lib/room-bounds"
import { Euler, Quaternion, Vector3, type Matrix4 } from "three"

// Black feathers drifting down along a room's walls and settling on its
// floor, from a swan in the city: each one sways and tumbles as it falls,
// then lies still where it landed.

export type FeatherFall = {
  from: Vector3
  to: Vector3
  delay: number
  duration: number
  sway: number
  swayRate: number
  phase: number
  tumble: number
  spin: number
  landTurn: number
  landTilt: number
  size: number
}

type FallSpec = {
  bounds: RoomBounds
  count: number
  seed: number
  // Where none may land (furniture, torchères).
  colliders: readonly Collider[]
  // On the carpet: just over its pile.
  floorY: number
}

const wallMargin = { from: 0.25, to: 0.9 }
const landingReach = { from: 0.25, to: 2 }
const spread = 9
const fallSpeed = { from: 0.32, to: 0.5 }

function isClear(colliders: readonly Collider[], x: number, z: number) {
  const pad = 0.18
  return colliders.every(
    (box) =>
      x < box.minX - pad ||
      x > box.maxX + pad ||
      z < box.minZ - pad ||
      z > box.maxZ + pad
  )
}

function along(random: () => number, from: number, to: number) {
  return from + (to - from) * random()
}

export function featherFalls(spec: FallSpec): FeatherFall[] {
  const random = createRandom(spec.seed)
  const { minX, maxX, minZ, maxZ, height } = spec.bounds
  const falls: FeatherFall[] = []
  for (
    let attempt = 0;
    falls.length < spec.count && attempt < spec.count * 8;
    attempt += 1
  ) {
    // Pick a wall, weighted by its length, and a point along it.
    const width = maxX - minX
    const depth = maxZ - minZ
    const pick = random() * (width + depth) * 2
    const inset = along(random, wallMargin.from, wallMargin.to)
    const reach = along(random, landingReach.from, landingReach.to)
    let start: [number, number]
    let land: [number, number]
    if (pick < width) {
      const x = minX + pick
      start = [x, maxZ - inset]
      land = [x + along(random, -0.4, 0.4), maxZ - reach]
    } else if (pick < width * 2) {
      const x = minX + pick - width
      start = [x, minZ + inset]
      land = [x + along(random, -0.4, 0.4), minZ + reach]
    } else if (pick < width * 2 + depth) {
      const z = minZ + pick - width * 2
      start = [minX + inset, z]
      land = [minX + reach, z + along(random, -0.4, 0.4)]
    } else {
      const z = minZ + pick - width * 2 - depth
      start = [maxX - inset, z]
      land = [maxX - reach, z + along(random, -0.4, 0.4)]
    }
    const [landX, landZ] = land
    const isInside =
      landX > minX + 0.15 &&
      landX < maxX - 0.15 &&
      landZ > minZ + 0.15 &&
      landZ < maxZ - 0.15
    if (!isInside || !isClear(spec.colliders, landX, landZ)) {
      continue
    }
    const fromY = height - along(random, 0.2, 1.1)
    falls.push({
      from: new Vector3(start[0], fromY, start[1]),
      to: new Vector3(landX, spec.floorY + random() * 0.004, landZ),
      delay: random() * spread,
      duration:
        (fromY - spec.floorY) / along(random, fallSpeed.from, fallSpeed.to),
      sway: along(random, 0.12, 0.32),
      swayRate: along(random, 1.1, 1.8),
      phase: random() * Math.PI * 2,
      tumble: along(random, 0.35, 0.75),
      spin: along(random, -0.9, 0.9),
      landTurn: random() * Math.PI * 2,
      landTilt: along(random, -0.08, 0.08),
      size: along(random, 1.3, 2),
    })
  }
  return falls
}

export function fallLength(falls: readonly FeatherFall[]) {
  return falls.reduce(
    (longest, fall) => Math.max(longest, fall.delay + fall.duration),
    0
  )
}

const position = new Vector3()
const rotation = new Quaternion()
const euler = new Euler()
const scale = new Vector3()

// Where one feather is `elapsed` seconds after the chapter woke; before its
// own start it is hidden (scale 0) at the top of its fall.
export function featherMatrix(
  fall: FeatherFall,
  elapsed: number,
  matrix: Matrix4
) {
  if (elapsed < fall.delay) {
    return matrix.makeScale(0, 0, 0)
  }
  // Settled feathers (elapsed may be Infinity) keep their landing pose.
  const time = Math.min(elapsed - fall.delay, fall.duration)
  const progress = time / fall.duration
  const drift = progress * progress * (3 - 2 * progress)
  const still = 1 - progress
  const swing = Math.sin(fall.phase + time * fall.swayRate)
  position.lerpVectors(fall.from, fall.to, drift)
  position.y = fall.from.y + (fall.to.y - fall.from.y) * progress
  position.x += swing * fall.sway * still
  position.z +=
    Math.cos(fall.phase + time * fall.swayRate * 0.7) * fall.sway * 0.6 * still
  euler.set(
    fall.landTilt + swing * fall.tumble * still,
    fall.landTurn + fall.spin * time * still,
    fall.landTilt +
      Math.cos(fall.phase + time * fall.swayRate) * fall.tumble * still,
    "YXZ"
  )
  rotation.setFromEuler(euler)
  scale.setScalar(fall.size)
  return matrix.compose(position, rotation, scale)
}
