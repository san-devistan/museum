import {
  lathe,
  mergeParts,
  tube,
  type Profile,
} from "@/museum/gallery/props/_lib/prop-geometry"
import {
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from "three"

// Height of the cage's floor on its stand.
export const cageFloor = 1.012

const bars = 22
const barRadius = 0.0032
const cageRadius = 0.2
const door = { bottom: 0.07, top: 0.3, open: 0.85 }
const doorStep = (Math.PI * 2) / bars

// Bar outline up the side and over the dome, as (radius, height).
const barPath: readonly (readonly [number, number])[] = [
  [cageRadius, 0.04],
  [cageRadius, 0.42],
  [0.193, 0.49],
  [0.165, 0.56],
  [0.11, 0.615],
  [0.05, 0.64],
  [0.002, 0.648],
]

function around(angle: number, [radius, y]: readonly [number, number]) {
  return new Vector3(
    Math.sin(angle) * radius,
    cageFloor + y,
    Math.cos(angle) * radius
  )
}

function bar(index: number) {
  const angle = index * doorStep
  const points = barPath.map((point) => around(angle, point))
  if (index !== 0) {
    return [tube(points, barRadius, { radial: 4, perPoint: 5 })]
  }
  // The bar across the doorway, cut where the door was.
  const below = [
    around(angle, [cageRadius, 0.04]),
    around(angle, [cageRadius, door.bottom]),
  ]
  const above = [around(angle, [cageRadius, door.top]), ...points.slice(1)]
  return [
    tube(below, barRadius, { radial: 4, perPoint: 2 }),
    tube(above, barRadius, { radial: 4, perPoint: 5 }),
  ]
}

function hoop(radius: number, y: number) {
  return new TorusGeometry(radius, 0.0038, 5, 56)
    .rotateX(Math.PI / 2)
    .translate(0, cageFloor + y, 0)
}

// The little door, swung out on its hinge between the front bars.
function cageDoor() {
  const width = 2 * cageRadius * Math.sin(doorStep)
  const height = door.top - door.bottom
  const frame = [
    new Vector3(0, 0, 0),
    new Vector3(width, 0, 0),
    new Vector3(width, height, 0),
    new Vector3(0, height, 0),
  ]
  const edges = frame.map((from, index) => {
    const to = frame[(index + 1) % frame.length] ?? from
    return tube([from, to], barRadius, { radial: 4, perPoint: 1 })
  })
  const rails = [1, 2].map((step) => {
    const x = (width * step) / 3
    return tube(
      [new Vector3(x, 0, 0), new Vector3(x, height, 0)],
      barRadius * 0.85,
      { radial: 4, perPoint: 1 }
    )
  })
  const latch = new TorusGeometry(0.012, 0.0025, 4, 12).translate(
    width + 0.01,
    height * 0.5,
    0
  )
  const hinge = around(-doorStep, [cageRadius, door.bottom])
  return [...edges, ...rails, latch].map((part) =>
    part.rotateY(-door.open).translate(hinge.x, hinge.y, hinge.z)
  )
}

function tripodLeg(angle: number) {
  const points = [
    new Vector3(0.02, 0.24, 0),
    new Vector3(0.09, 0.2, 0),
    new Vector3(0.17, 0.09, 0),
    new Vector3(0.22, 0.022, 0),
    new Vector3(0.265, 0.016, 0),
    new Vector3(0.282, 0.04, 0),
    new Vector3(0.262, 0.056, 0),
  ]
  return tube(points, 0.01, { radial: 6 }).rotateY(angle)
}

const poleProfile: Profile = [
  [0, 0.2],
  [0.03, 0.2],
  [0.035, 0.24],
  [0.016, 0.28],
  [0.012, 0.6],
  [0.022, 0.62],
  [0.012, 0.64],
  [0.011, 0.95],
  [0.03, 0.985],
  [0.1, 1.0],
  [0.105, cageFloor],
  [0, cageFloor],
]

function swingWires() {
  return [-1, 1].map((side) =>
    tube(
      [
        new Vector3(side * 0.045, cageFloor + 0.636, 0),
        new Vector3(side * 0.05, cageFloor + 0.36, 0),
      ],
      0.0014,
      { radial: 3, perPoint: 1 }
    )
  )
}

// The black iron tripod stand.
export function buildCageStand() {
  return mergeParts([
    lathe(poleProfile, 16),
    ...[0, 1, 2].map((index) => tripodLeg((index / 3) * Math.PI * 2 + 0.5)),
  ])
}

const trayProfile: Profile = [
  [0, 0],
  [0.2, 0],
  [0.216, 0.008],
  [0.216, 0.046],
  [0.206, 0.05],
  [0.2, 0.02],
  [0, 0.02],
]

// The painted cage: tray, bars and hoops, the open door, the empty swing
// and the hanging ring on top.
export function buildCage() {
  const parts: BufferGeometry[] = [
    lathe(trayProfile, 40).translate(0, cageFloor, 0),
    ...Array.from({ length: bars }, (_, index) => bar(index)).flat(),
    hoop(cageRadius, 0.04),
    hoop(cageRadius, door.bottom),
    hoop(cageRadius, door.top),
    hoop(cageRadius, 0.42),
    hoop(0.165, 0.56),
    ...cageDoor(),
    ...swingWires(),
    new CylinderGeometry(0.005, 0.005, 0.11, 8)
      .rotateZ(Math.PI / 2)
      .translate(0, cageFloor + 0.36, 0),
    new SphereGeometry(0.014, 12, 8).translate(0, cageFloor + 0.66, 0),
    new TorusGeometry(0.034, 0.004, 6, 24).translate(0, cageFloor + 0.705, 0),
  ]
  return mergeParts(parts)
}

// Where the black feather lies on the tray.
export const featherSpot = {
  position: [0.035, cageFloor + 0.022, 0.03] as const,
  turn: 0.8,
  scale: 0.5,
}
