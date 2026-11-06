import { createRandom } from "@/museum/gallery/ikebana/_lib/ikebana-random"
import {
  DoubleSide,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Color,
  type InstancedMesh,
} from "three"

// Petals the eater tears off its double: they flutter down and stay on the
// tablecloth. A small pool, reused oldest first.

export const tornPetalCount = 32

function createPetalGeometry() {
  const geometry = new PlaneGeometry(0.022, 0.032, 2, 3)
  const position = geometry.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    const across = position.getX(index) / 0.011
    const along = position.getY(index) / 0.016
    position.setZ(index, across * across * 0.004 + along * along * 0.002)
  }
  geometry.computeVertexNormals()
  return geometry
}

export const tornPetalGeometry = createPetalGeometry()

export const tornPetalMaterial = new MeshStandardMaterial({
  roughness: 0.7,
  side: DoubleSide,
})

type TornPetal = {
  position: Vector3
  spin: Vector3
  turn: Quaternion
  angle: number
  phase: number
  fall: number
  age: number
  isFalling: boolean
}

export type TornPetals = {
  petals: TornPetal[]
  next: number
  // Petals land outside the vessel.
  clearance: number
  random: ReturnType<typeof createRandom>
}

// Petals stay on the clear cloth around the vessel.
const fallLimit = 0.3
const flat = new Quaternion().setFromAxisAngle(
  new Vector3(1, 0, 0),
  -Math.PI / 2
)
const hidden = new Matrix4().makeScale(0, 0, 0)
const scratch = {
  matrix: new Matrix4(),
  turn: new Quaternion(),
  scale: new Vector3(1, 1, 1),
  yaw: new Vector3(0, 1, 0),
}

export function createTornPetals(clearance: number): TornPetals {
  const random = createRandom(53)
  return {
    petals: Array.from({ length: tornPetalCount }, () => ({
      position: new Vector3(),
      spin: new Vector3(
        random.range(-1, 1),
        1,
        random.range(-1, 1)
      ).normalize(),
      turn: new Quaternion(),
      angle: random.range(0, Math.PI * 2),
      phase: random.range(0, Math.PI * 2),
      fall: random.range(0.11, 0.17),
      age: 0,
      isFalling: false,
    })),
    next: 0,
    clearance,
    random,
  }
}

export function hideTornPetals(mesh: InstancedMesh, color: Color) {
  for (let index = 0; index < tornPetalCount; index += 1) {
    mesh.setMatrixAt(index, hidden)
    mesh.setColorAt(index, color)
  }
  mesh.instanceMatrix.needsUpdate = true
}

type Tear = { from: Vector3; color: Color }

export function tearPetal(sim: TornPetals, mesh: InstancedMesh, tear: Tear) {
  const index = sim.next
  const petal = sim.petals[index]
  if (!petal) {
    return
  }
  sim.next = (index + 1) % tornPetalCount
  petal.position.copy(tear.from)
  petal.position.x += sim.random.range(-0.02, 0.02)
  petal.position.z += sim.random.range(-0.02, 0.02)
  petal.age = 0
  petal.isFalling = true
  mesh.setColorAt(index, tear.color)
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true
  }
}

function land(sim: TornPetals, petal: TornPetal, index: number) {
  const { position } = petal
  const reach = Math.hypot(position.x, position.z)
  const clear = sim.clearance + 0.015
  if (reach < clear) {
    const push = clear / Math.max(reach, 0.001)
    position.x *= push
    position.z *= push
  }
  position.y = 0.002 + (index % 4) * 0.0004
  petal.turn.setFromAxisAngle(scratch.yaw, petal.phase).multiply(flat)
  petal.isFalling = false
}

// Moves the falling petals; returns whether any moved.
export function stepTornPetals(
  sim: TornPetals,
  mesh: InstancedMesh,
  delta: number
) {
  let moved = false
  for (let index = 0; index < sim.petals.length; index += 1) {
    const petal = sim.petals[index]
    if (!petal?.isFalling) {
      continue
    }
    petal.age += delta
    const { position } = petal
    position.y -= petal.fall * delta
    position.x += Math.sin(petal.age * 2.7 + petal.phase) * 0.1 * delta
    position.z += Math.cos(petal.age * 2.1 + petal.phase) * 0.08 * delta
    const reach = Math.hypot(position.x, position.z)
    if (reach > fallLimit) {
      position.x *= fallLimit / reach
      position.z *= fallLimit / reach
    }
    petal.angle += delta * 3.4
    petal.turn.setFromAxisAngle(petal.spin, petal.angle)
    if (position.y <= 0.002) {
      land(sim, petal, index)
    }
    scratch.matrix.compose(position, petal.turn, scratch.scale)
    mesh.setMatrixAt(index, scratch.matrix)
    moved = true
  }
  if (moved) {
    mesh.instanceMatrix.needsUpdate = true
  }
  return moved
}
