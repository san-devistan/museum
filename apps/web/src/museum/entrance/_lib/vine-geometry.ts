import { createRandom, type Random } from "@/museum/_lib/relief/height-field"
import { mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import { vines, type VineSpec } from "@/museum/entrance/_lib/manor-layout"
import {
  CatmullRomCurve3,
  ConeGeometry,
  Quaternion,
  TubeGeometry,
  Vector3,
} from "three"

const thornSpacing = 0.045
const stemTaper = 0.65
const up = new Vector3(0, 1, 0)
const outward = new Vector3(0, 0, 1)

function thorns(curve: CatmullRomCurve3, spec: VineSpec, random: Random) {
  const count = Math.floor(curve.getLength() / thornSpacing)
  return Array.from({ length: count }, (_, index) => {
    const t = (index + 0.5) / count
    const tangent = curve.getTangentAt(t)
    const side = index % 2 === 0 ? 1 : -1
    const direction = new Vector3()
      .crossVectors(tangent, outward)
      .multiplyScalar(side)
      .addScaledVector(tangent, 0.6)
      .addScaledVector(outward, random() * 0.5)
      .normalize()
    const length = 0.012 + random() * 0.01
    const radius = spec.radius * (1 - stemTaper * t)
    const base = curve
      .getPointAt(t)
      .addScaledVector(direction, radius + length / 2 - 0.002)
    return new ConeGeometry(radius * 0.5, length, 4)
      .applyQuaternion(new Quaternion().setFromUnitVectors(up, direction))
      .translate(base.x, base.y, base.z)
  })
}

/** Short curling offshoots growing off the main stem. */
function tendrils(curve: CatmullRomCurve3, spec: VineSpec, random: Random) {
  return Array.from({ length: 4 }, () => {
    const t = 0.15 + random() * 0.8
    const start = curve.getPointAt(t)
    const side = random() > 0.5 ? 1 : -1
    let angle = Math.atan2(curve.getTangentAt(t).y, curve.getTangentAt(t).x)
    const points = [start.clone()]
    for (let step = 0; step < 7; step += 1) {
      angle += side * (0.35 + step * 0.18)
      const last = points.at(-1) ?? start
      points.push(
        new Vector3(
          last.x + Math.cos(angle) * 0.04 * (1 - step * 0.1),
          last.y + Math.sin(angle) * 0.04 * (1 - step * 0.1),
          start.z
        )
      )
    }
    return new TubeGeometry(
      new CatmullRomCurve3(points),
      24,
      spec.radius * 0.4,
      4,
      false
    )
  })
}

/** A stem that thins from its root to its growing tip. */
function taperedStem(curve: CatmullRomCurve3, spec: VineSpec) {
  const segments = spec.points.length * 14
  const radial = 6
  const tube = new TubeGeometry(curve, segments, spec.radius, radial, false)
  const position = tube.getAttribute("position")
  const center = new Vector3()
  for (let ring = 0; ring <= segments; ring += 1) {
    const t = ring / segments
    curve.getPointAt(t, center)
    const taper = 1 - stemTaper * t
    for (let side = 0; side <= radial; side += 1) {
      const index = ring * (radial + 1) + side
      position.setXYZ(
        index,
        center.x + (position.getX(index) - center.x) * taper,
        center.y + (position.getY(index) - center.y) * taper,
        center.z + (position.getZ(index) - center.z) * taper
      )
    }
  }
  return tube
}

export const vineCurves = vines.map((spec) => ({
  curve: new CatmullRomCurve3(
    spec.points.map(([x, y, z]) => new Vector3(x, y, z)),
    false,
    "centripetal"
  ),
  radius: spec.radius,
  spec,
}))

function buildVines() {
  const random = createRandom(83)
  return mergeParts(
    vineCurves.flatMap(({ curve, spec }) => [
      taperedStem(curve, spec),
      ...thorns(curve, spec, random),
      ...tendrils(curve, spec, random),
    ])
  )
}

export const vineGeometry = buildVines()
