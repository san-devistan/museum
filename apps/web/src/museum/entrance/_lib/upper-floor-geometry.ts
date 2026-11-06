import {
  windowOpening,
  windowStone,
} from "@/museum/entrance/_lib/facade-geometry"
import { extrude, rod, slab } from "@/museum/entrance/_lib/geometry-parts"
import {
  polygonPath,
  polygonShape,
  type Point2,
} from "@/museum/entrance/_lib/manor-arches"
import { facadeZ } from "@/museum/entrance/_lib/manor-layout"
import {
  chimney,
  chimneys,
  cornice,
  dormer,
  dormers,
  frontGable,
  stringCourse,
  upperFloor,
  upperWindow,
  upperWindows,
  type ChimneySpec,
} from "@/museum/entrance/_lib/manor-upper-layout"
import { paneGeometry } from "@/museum/entrance/_lib/pane-geometry"
import { ShapeGeometry } from "three"

const z0 = facadeZ

function circle(center: Point2, radius: number, steps = 40): Point2[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2
    return [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
    ] as const
  })
}

/** The bedroom storey's stone front, pierced by its row of lancets. */
function upperSkin() {
  const { minX, maxX, bottom, top, z } = upperFloor
  const shape = polygonShape([
    [minX, bottom],
    [maxX, bottom],
    [maxX, top],
    [minX, top],
  ])
  for (const window of upperWindows) {
    shape.holes.push(polygonPath(windowOpening(window.centerX, upperWindow)))
  }
  return new ShapeGeometry(shape, 1).translate(0, 0, z)
}

const oculusCenter: Point2 = [0, frontGable.oculus.y]

function gableWall() {
  const { halfWidth, apexY, oculus } = frontGable
  const shape = polygonShape([
    [-halfWidth, upperFloor.top - 0.01],
    [halfWidth, upperFloor.top - 0.01],
    [0, apexY],
  ])
  shape.holes.push(polygonPath(circle(oculusCenter, oculus.radius)))
  return new ShapeGeometry(shape, 1).translate(0, 0, frontGable.z)
}

function dormerOutline(centerX: number): Point2[] {
  const { halfWidth, bottom, wallTop, apexY } = dormer
  return [
    [centerX - halfWidth, bottom],
    [centerX + halfWidth, bottom],
    [centerX + halfWidth, wallTop],
    [centerX, apexY],
    [centerX - halfWidth, wallTop],
  ]
}

function dormerFront(centerX: number) {
  const shape = polygonShape(dormerOutline(centerX))
  shape.holes.push(polygonPath(windowOpening(centerX, dormer.window)))
  return new ShapeGeometry(shape, 1).translate(0, 0, dormer.frontZ)
}

function chimneyStack(spec: ChimneySpec) {
  return slab(
    [spec.x - spec.halfWidth, chimney.bottom, spec.z - spec.halfDepth],
    [spec.x + spec.halfWidth, spec.top, spec.z + spec.halfDepth]
  )
}

function chimneyCap(spec: ChimneySpec) {
  const out = chimney.capOut
  return [
    slab(
      [
        spec.x - spec.halfWidth - out,
        spec.top - 0.06,
        spec.z - spec.halfDepth - out,
      ],
      [
        spec.x + spec.halfWidth + out,
        spec.top + chimney.capHeight,
        spec.z + spec.halfDepth + out,
      ]
    ),
    slab(
      [
        spec.x - spec.halfWidth - out / 2,
        spec.top - 0.42,
        spec.z - spec.halfDepth - out / 2,
      ],
      [
        spec.x + spec.halfWidth + out / 2,
        spec.top - 0.3,
        spec.z + spec.halfDepth + out / 2,
      ]
    ),
  ]
}

function chimneyPots(spec: ChimneySpec) {
  const { pot } = chimney
  const base = spec.top + chimney.capHeight
  return Array.from({ length: spec.pots }, (_, index) => {
    const x = spec.x + (index - (spec.pots - 1) / 2) * pot.spacing
    return rod(
      [x, base, spec.z],
      [x, base + pot.height, spec.z],
      [pot.radius, pot.radius * 0.8]
    )
  })
}

function bandAcross(bottom: number, top: number, depth: number) {
  return slab(
    [upperFloor.minX - 0.02, bottom, z0],
    [upperFloor.maxX + 0.02, top, z0 + depth]
  )
}

function corbels() {
  const { corbel } = cornice
  const count = Math.floor((upperFloor.maxX - upperFloor.minX) / corbel.spacing)
  const start = (upperFloor.minX + upperFloor.maxX - count * corbel.spacing) / 2
  return Array.from({ length: count + 1 }, (_, index) => {
    const x = start + index * corbel.spacing
    return slab(
      [x - corbel.width / 2, cornice.bottom - corbel.height, z0],
      [x + corbel.width / 2, cornice.bottom, z0 + corbel.depth]
    )
  })
}

function horizontalBands() {
  return [
    bandAcross(stringCourse.bottom, stringCourse.top, stringCourse.depth),
    bandAcross(stringCourse.top, stringCourse.dripTop, stringCourse.dripDepth),
    bandAcross(cornice.bottom, cornice.top - 0.12, cornice.depth),
    bandAcross(cornice.top - 0.12, cornice.top, cornice.depth + 0.06),
    bandAcross(
      cornice.bottom - 0.08,
      cornice.bottom,
      cornice.corbel.depth + 0.02
    ),
    ...corbels(),
  ]
}

/** The rose window's stone: a moulded ring and a cross of tracery bars. */
function oculusStone() {
  const { radius, ring, hood } = frontGable.oculus
  const band = (inner: number, outer: number) => {
    const shape = polygonShape(circle(oculusCenter, outer))
    shape.holes.push(polygonPath(circle(oculusCenter, inner)))
    return shape
  }
  const [x, y] = oculusCenter
  const bar = 0.03
  return [
    extrude(band(radius, radius + ring), { z: z0, depth: 0.1, bevel: 0.006 }),
    extrude(band(radius + ring + 0.02, radius + ring + 0.02 + hood), {
      z: z0,
      depth: 0.07,
    }),
    slab([x - bar, y - radius, z0], [x + bar, y + radius, z0 + 0.05]),
    slab([x - radius, y - bar, z0], [x + radius, y + bar, z0 + 0.05]),
  ]
}

function dormerStone(centerX: number) {
  return windowStone(centerX, dormer.window).map((part) =>
    part.translate(0, 0, dormer.frontZ - facadeZ)
  )
}

const paneZ = upperFloor.z - 0.001

function upperPanes() {
  return [
    ...upperWindows.map(({ centerX, glow }) =>
      paneGeometry(windowOpening(centerX, upperWindow), glow).translate(
        0,
        0,
        paneZ
      )
    ),
    paneGeometry(circle(oculusCenter, frontGable.oculus.radius), {
      mode: "dark",
    }).translate(0, 0, frontGable.z - 0.001),
    ...dormers.map(({ centerX }) =>
      paneGeometry(windowOpening(centerX, dormer.window), {
        mode: "dark",
      }).translate(0, 0, dormer.frontZ - 0.001)
    ),
  ]
}

/** The bedroom storey, its gable, dormer fronts and chimneys, by material. */
export function upperFloorParts() {
  return {
    stone: [
      upperSkin(),
      gableWall(),
      ...dormers.map(({ centerX }) => dormerFront(centerX)),
      ...chimneys.map(chimneyStack),
    ],
    limestone: [
      ...horizontalBands(),
      ...upperWindows.flatMap(({ centerX }) =>
        windowStone(centerX, upperWindow)
      ),
      ...oculusStone(),
      ...dormers.flatMap(({ centerX }) => dormerStone(centerX)),
      ...chimneys.flatMap(chimneyCap),
    ],
    lead: chimneys.flatMap(chimneyPots),
    panes: upperPanes(),
  }
}
