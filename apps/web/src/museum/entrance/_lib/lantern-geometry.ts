import { mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import { lanternBody, lanterns } from "@/museum/entrance/_lib/manor-layout"
import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Matrix4,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three"

const { half, height, wallGap, armY } = lanternBody
const top = height / 2

/** Scroll bracing the arm, curling back towards the wall plate. */
function braceScroll() {
  const center = { z: -0.16, y: armY - 0.11 }
  const turns = 1.35
  const steps = 40
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps
    const angle = Math.PI * 0.45 - t * turns * Math.PI * 2
    const radius = 0.105 * (1 - 0.72 * t)
    return new Vector3(
      0,
      center.y + Math.sin(angle) * radius,
      center.z + Math.cos(angle) * radius
    )
  })
  return new TubeGeometry(new CatmullRomCurve3(points), 64, 0.0055, 5, false)
}

function cage() {
  return [
    ...[-1, 1].flatMap((x) =>
      [-1, 1].map((z) =>
        new BoxGeometry(0.014, height, 0.014).translate(x * half, 0, z * half)
      )
    ),
    new BoxGeometry(half * 2.4, 0.02, half * 2.4).translate(0, top, 0),
    new BoxGeometry(half * 2.4, 0.024, half * 2.4).translate(0, -top, 0),
    ...[-1, 1].flatMap((x) =>
      [-1, 1].map((z) =>
        new ConeGeometry(0.008, 0.045, 4).translate(
          x * half * 1.15,
          top + 0.03,
          z * half * 1.15
        )
      )
    ),
  ]
}

function roofAndDrop() {
  return [
    new ConeGeometry(half * 1.8, 0.17, 4)
      .rotateY(Math.PI / 4)
      .translate(0, top + 0.095, 0),
    new SphereGeometry(0.02, 10, 8).translate(0, top + 0.19, 0),
    new CylinderGeometry(0.005, 0.005, armY - top - 0.19, 6).translate(
      0,
      (armY + top + 0.19) / 2,
      0
    ),
    new ConeGeometry(half * 1.3, 0.075, 4)
      .rotateX(Math.PI)
      .rotateY(Math.PI / 4)
      .translate(0, -top - 0.048, 0),
    new SphereGeometry(0.016, 8, 6).translate(0, -top - 0.1, 0),
  ]
}

function bracket() {
  return [
    new BoxGeometry(0.018, 0.018, wallGap + 0.02).translate(
      0,
      armY,
      -wallGap / 2
    ),
    new SphereGeometry(0.014, 8, 6).translate(0, armY, 0.02),
    new BoxGeometry(0.075, 0.22, 0.014).translate(0, armY - 0.04, -wallGap),
    new SphereGeometry(0.012, 8, 6).translate(0, armY - 0.16, -wallGap + 0.006),
    braceScroll(),
  ]
}

/** A small white satin bow tied around the hanger rod. */
function bow() {
  const y = top + 0.25
  return [
    ...[-1, 1].map((side) =>
      new TorusGeometry(0.026, 0.0065, 8, 24)
        .scale(1.35, 0.7, 0.35)
        .rotateZ(side * 0.3)
        .translate(side * 0.032, y + 0.005, 0.014)
    ),
    ...[-1, 1].map((side) =>
      new BoxGeometry(0.011, 0.08, 0.002)
        .translate(0, -0.04, 0)
        .rotateZ(side * 0.35)
        .translate(0, y - 0.002, 0.022)
    ),
    new SphereGeometry(0.009, 10, 8).scale(1, 1.1, 0.7).translate(0, y, 0.018),
  ]
}

export const lanternGeometry = {
  bow: mergeParts(bow()),
  iron: mergeParts([...cage(), ...roofAndDrop(), ...bracket()]),
  glass: new BoxGeometry(half * 1.9, height - 0.02, half * 1.9),
  candle: new CylinderGeometry(0.02, 0.022, 0.09, 14).translate(
    0,
    -top + 0.057,
    0
  ),
  flame: new SphereGeometry(1, 10, 8),
}

export const lanternMatrices = Float32Array.from(
  lanterns.flatMap(({ center }) => [
    ...new Matrix4().makeTranslation(...center).elements,
  ])
)
