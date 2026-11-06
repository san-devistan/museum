import {
  armAngles,
  chandelierLayout,
  radialPoint,
  tipPoint,
} from "@/museum/gallery/chandelier/_lib/chandelier-layout"
import { Matrix4, Quaternion, Vector3 } from "three"

export type CrystalInstance = {
  position: Vector3
  quaternion: Quaternion
  scale: Vector3
}

type CrystalSet = {
  beads: CrystalInstance[]
  drops: CrystalInstance[]
  balls: CrystalInstance[]
}

type PendantSpec = {
  anchor: Vector3
  beads: number
  length: number
}

type FestoonSpec = {
  from: Vector3
  to: Vector3
  sag: number
}

const beadSpacing = 0.024
const beadScale = new Vector3(0.0085, 0.0125, 0.0085)
const up = new Vector3(0, 1, 0)
const identity = new Quaternion()

function instance(
  position: Vector3,
  scale: Vector3,
  quaternion: Quaternion = identity
): CrystalInstance {
  return { position, quaternion: quaternion.clone(), scale }
}

function uniform(size: number) {
  return new Vector3(size, size, size)
}

function addPendant(set: CrystalSet, { anchor, beads, length }: PendantSpec) {
  for (let index = 0; index < beads; index += 1) {
    const offset = (index + 0.5) * beadSpacing
    set.beads.push(
      instance(anchor.clone().setY(anchor.y - offset), beadScale.clone())
    )
  }
  const hook = anchor.clone().setY(anchor.y - beads * beadSpacing)
  set.drops.push(instance(hook, uniform(length)))
}

function festoonPoint({ from, to, sag }: FestoonSpec, progress: number) {
  const point = from.clone().lerp(to, progress)
  point.y -= 4 * sag * progress * (1 - progress)
  return point
}

function addFestoon(set: CrystalSet, spec: FestoonSpec) {
  const samples = 48
  const points = Array.from({ length: samples + 1 }, (_, step) =>
    festoonPoint(spec, step / samples)
  )
  const lengths = points.map((point, index) =>
    index === 0 ? 0 : point.distanceTo(points[index - 1] ?? point)
  )
  const total = lengths.reduce((sum, value) => sum + value, 0)
  const count = Math.max(2, Math.round(total / beadSpacing))
  for (let index = 0; index < count; index += 1) {
    const progress = (index + 0.5) / count
    const position = festoonPoint(spec, progress)
    const ahead = festoonPoint(spec, Math.min(1, progress + 0.01))
    const behind = festoonPoint(spec, Math.max(0, progress - 0.01))
    const tangent = ahead.sub(behind).normalize()
    const quaternion = new Quaternion().setFromUnitVectors(up, tangent)
    set.beads.push(instance(position, beadScale.clone(), quaternion))
  }
}

function addArmCrystals(set: CrystalSet, angle: number, nextAngle: number) {
  const { dishY, dishRadius, crownY, tipRadius } = chandelierLayout
  const start = tipPoint(angle, dishY - 0.004)
  const end = tipPoint(nextAngle, dishY - 0.004)
  const inset = (dishRadius - 0.006) / start.distanceTo(end)
  const festoon = {
    from: start.clone().lerp(end, inset),
    to: end.clone().lerp(start, inset),
    sag: 0.13,
  }
  addFestoon(set, festoon)
  addPendant(set, {
    anchor: festoonPoint(festoon, 0.5).setY(dishY - 0.004 - 0.13 - 0.008),
    beads: 2,
    length: 0.068,
  })
  addFestoon(set, {
    from: radialPoint(0.097, crownY - 0.004, angle),
    to: radialPoint(0.45, -0.882, angle),
    sag: 0.04,
  })
  addPendant(set, {
    anchor: radialPoint(0.45, -0.897, angle),
    beads: 2,
    length: 0.078,
  })
  addPendant(set, {
    anchor: radialPoint(tipRadius + dishRadius - 0.004, dishY, angle),
    beads: 1,
    length: 0.05,
  })
  set.drops.push(
    instance(
      radialPoint(0.097, crownY - 0.006, angle + Math.PI / armAngles.length),
      uniform(0.052)
    )
  )
  set.balls.push(
    instance(radialPoint(0.03, crownY + 0.02, angle), uniform(0.011))
  )
}

function addBottomCluster(set: CrystalSet) {
  armAngles.forEach((angle) => {
    addPendant(set, {
      anchor: radialPoint(0.096, -0.862, angle),
      beads: 3,
      length: 0.068,
    })
  })
  set.balls.push(instance(new Vector3(0, -1.094, 0), uniform(0.016)))
  addPendant(set, {
    anchor: new Vector3(0, -1.106, 0),
    beads: 3,
    length: 0.072,
  })
}

function buildCrystalSet() {
  const set: CrystalSet = { beads: [], drops: [], balls: [] }
  armAngles.forEach((angle, index) => {
    const nextAngle = armAngles[(index + 1) % armAngles.length] ?? angle
    addArmCrystals(set, angle, nextAngle)
  })
  addBottomCluster(set)
  return set
}

export function toMatrixArray(instances: readonly CrystalInstance[]) {
  const matrix = new Matrix4()
  const array = new Float32Array(instances.length * 16)
  instances.forEach((item, index) => {
    matrix.compose(item.position, item.quaternion, item.scale)
    matrix.toArray(array, index * 16)
  })
  return array
}

const crystalSet = buildCrystalSet()

export const crystalInstances = {
  beads: {
    count: crystalSet.beads.length,
    matrices: toMatrixArray(crystalSet.beads),
  },
  drops: {
    count: crystalSet.drops.length,
    matrices: toMatrixArray(crystalSet.drops),
  },
  balls: {
    count: crystalSet.balls.length,
    matrices: toMatrixArray(crystalSet.balls),
  },
} as const

export const flamePositions = armAngles.map((angle) =>
  tipPoint(angle, chandelierLayout.flame.baseY)
)

export const haloPositions = new Float32Array(
  flamePositions.flatMap((point) => [
    point.x,
    point.y + chandelierLayout.flame.height * 0.4,
    point.z,
  ])
)
