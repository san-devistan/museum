import type { Collider } from "@/museum/_lib/museum-layout"
import { clamp } from "@/museum/player/_lib/clamp"

export type PlanarPoint = {
  x: number
  z: number
}

export type CollisionWorld = {
  colliders: readonly Collider[]
  bounds: Collider
  radius: number
}

const resolvePasses = 3
const insideEpsilon = 1e-9

function pushOutFromInside(
  center: PlanarPoint,
  box: Collider,
  radius: number
): PlanarPoint {
  const exits = [
    { x: box.minX - radius, z: center.z, depth: center.x - box.minX },
    { x: box.maxX + radius, z: center.z, depth: box.maxX - center.x },
    { x: center.x, z: box.minZ - radius, depth: center.z - box.minZ },
    { x: center.x, z: box.maxZ + radius, depth: box.maxZ - center.z },
  ]
  const nearest = exits.reduce((best, exit) =>
    exit.depth < best.depth ? exit : best
  )

  return { x: nearest.x, z: nearest.z }
}

export function pushCircleOutOfBox(
  center: PlanarPoint,
  box: Collider,
  radius: number
): PlanarPoint {
  const offsetX = center.x - clamp(center.x, box.minX, box.maxX)
  const offsetZ = center.z - clamp(center.z, box.minZ, box.maxZ)
  const distanceSquared = offsetX * offsetX + offsetZ * offsetZ

  if (distanceSquared >= radius * radius) {
    return center
  }
  if (distanceSquared <= insideEpsilon) {
    return pushOutFromInside(center, box, radius)
  }

  const distance = Math.sqrt(distanceSquared)
  const push = (radius - distance) / distance

  return { x: center.x + offsetX * push, z: center.z + offsetZ * push }
}

export function clampToBounds(
  center: PlanarPoint,
  bounds: Collider,
  radius: number
): PlanarPoint {
  return {
    x: clamp(center.x, bounds.minX + radius, bounds.maxX - radius),
    z: clamp(center.z, bounds.minZ + radius, bounds.maxZ - radius),
  }
}

export function isInside(center: PlanarPoint, box: Collider) {
  return (
    center.x >= box.minX &&
    center.x <= box.maxX &&
    center.z >= box.minZ &&
    center.z <= box.maxZ
  )
}

function resolveOverlaps(center: PlanarPoint, world: CollisionWorld) {
  let resolved = center

  for (let pass = 0; pass < resolvePasses; pass += 1) {
    const before = resolved
    for (const box of world.colliders) {
      resolved = pushCircleOutOfBox(resolved, box, world.radius)
    }
    resolved = clampToBounds(resolved, world.bounds, world.radius)
    if (resolved.x === before.x && resolved.z === before.z) {
      break
    }
  }

  return resolved
}

export function moveCircle(
  start: PlanarPoint,
  displacement: PlanarPoint,
  world: CollisionWorld
): PlanarPoint {
  const afterX = resolveOverlaps(
    { x: start.x + displacement.x, z: start.z },
    world
  )

  return resolveOverlaps({ x: afterX.x, z: afterX.z + displacement.z }, world)
}
