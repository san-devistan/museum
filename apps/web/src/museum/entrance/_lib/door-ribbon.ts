import { doorFaceZ } from "@/museum/entrance/_lib/entrance-layout"
import { ribbon, ribbonKnot } from "@/museum/entrance/_lib/ribbon-layout"
import { satinTone } from "@/museum/entrance/_lib/satin-material"
import {
  sweepSatin,
  type SatinPiece,
  type StationFn,
} from "@/museum/entrance/_lib/satin-sweep"
import { CatmullRomCurve3, MathUtils, Vector3, type Mesh } from "three"

// The satin ribbon tying the front door: a corset lacing through the pearl
// eyelets, crossing over and under, sagging a little between them, and a
// bow of two puffy loops, a wrapped knot and two V-cut tails. The lacing
// and the tails are one drawable in the door's frame (they slide off
// together); the loops and the knot are another, around the knot (they
// twist and spread as they untie). Each carries its untied pose as a morph
// target, followed with the untie's own progress.

type Point2 = readonly [x: number, y: number]

const { lerp, smoothstep } = MathUtils
const width = ribbon.width
const left = -ribbon.lacingX
const right = ribbon.lacingX
const [row0 = 0, row1 = 0, row2 = 0, row3 = 0] = ribbon.rows
const [knotX, knotY, knotZ] = ribbonKnot.center

/** Through an eyelet the ribbon lies just under the pearl ring's crown. */
const eyeletZ = doorFaceZ + 0.0035

const satinSpec = {
  thickness: ribbon.thickness * 0.7,
  tone: satinTone,
  uvWidth: width,
}

/** 0 where the ribbon gathers through an eyelet, 1 along its open middle. */
function opening(s: number, reach = 0.2) {
  return smoothstep(s, 0, reach) * (1 - smoothstep(s, 1 - reach, 1))
}

type LacingSpan = {
  from: Point2
  to: Point2
  /** How far its middle stands off the door. */
  lift: number
  sag: number
  twist: number
  /** Passes under the other strand where they cross. */
  isUnder: boolean
}

function spanStation(span: LacingSpan, loose: number): StationFn {
  return (s, out) => {
    const open = opening(s)
    const arch = Math.sin(Math.PI * s)
    const sag = span.sag * (1 + 3 * loose) + 0.03 * loose
    const crossing = span.isUnder ? Math.exp(-(((s - 0.5) / 0.09) ** 2)) : 0
    out.position.set(
      lerp(span.from[0], span.to[0], s),
      lerp(span.from[1], span.to[1], s) - sag * arch,
      eyeletZ + (span.lift + 0.02 * loose) * arch
    )
    out.width = width * lerp(0.45, 1, Math.max(open, 0.6 * loose))
    out.twist = span.twist * (1 + loose) * arch
    out.cup = 0.0014 * open
    out.pleat = 0.003 * (1 - open) * (1 - loose)
    out.shade = 0.05 + 0.38 * (1 - open) + 0.45 * crossing
    out.backShade = 0.55
  }
}

/** The bar across the bottom, then the two strands criss-crossing up. */
const lacingSpans: readonly LacingSpan[] = [
  {
    from: [right, row0],
    to: [left, row0],
    lift: 0.007,
    sag: 0.004,
    twist: 0.06,
    isUnder: false,
  },
  // Strand A, from the bottom left: over, under, over.
  {
    from: [left, row0],
    to: [right, row1],
    lift: 0.019,
    sag: 0.008,
    twist: 0.12,
    isUnder: false,
  },
  {
    from: [right, row1],
    to: [left, row2],
    lift: 0.011,
    sag: 0.009,
    twist: -0.1,
    isUnder: true,
  },
  {
    from: [left, row2],
    to: [right, row3],
    lift: 0.019,
    sag: 0.007,
    twist: 0.08,
    isUnder: false,
  },
  // Strand B, from the bottom right: under, over, under.
  {
    from: [right, row0],
    to: [left, row1],
    lift: 0.011,
    sag: 0.008,
    twist: -0.09,
    isUnder: true,
  },
  {
    from: [left, row1],
    to: [right, row2],
    lift: 0.019,
    sag: 0.009,
    twist: 0.1,
    isUnder: false,
  },
  {
    from: [right, row2],
    to: [left, row3],
    lift: 0.011,
    sag: 0.007,
    twist: -0.12,
    isUnder: true,
  },
]

const knotBottom = new Vector3(knotX, knotY - 0.014, knotZ - 0.008)

/** A strand rising from a top eyelet into the knot. */
function riseStation(side: 1 | -1, loose: number): StationFn {
  const from = new Vector3(side * right, row3, eyeletZ)
  const bend = new Vector3(side * right * 0.78, row3 + 0.09, eyeletZ + 0.024)
  const to = knotBottom.clone().add(new Vector3(side * 0.012, 0, 0))
  const slack = new Vector3(side * 0.02, -0.07, 0.02).multiplyScalar(loose)
  return (s, out) => {
    const inverse = 1 - s
    out.position
      .copy(from)
      .multiplyScalar(inverse * inverse)
      .addScaledVector(bend, 2 * inverse * s)
      .addScaledVector(to, s * s)
      .addScaledVector(slack, Math.sin(Math.PI * s))
    const open = opening(s, 0.25)
    out.width = width * lerp(0.42, 1, Math.max(open, 0.6 * loose))
    out.twist = side * 0.12 * Math.sin(Math.PI * s)
    out.cup = 0.0014 * open
    out.pleat = 0.003 * (1 - open)
    out.shade = 0.06 + 0.3 * (1 - open) + 0.25 * smoothstep(s, 0.6, 1)
    out.backShade = 0.55
  }
}

type LoopShape = {
  /** How steeply the wing rises from the knot, in radians. */
  rise: number
  /** Tilt of the loop towards the visitor, so its hollow shows. */
  tilt: number
  length: number
  depth: number
  droop: number
}

// The two loops differ a little, as a hand-tied bow does.
const loopShapes = {
  right: { rise: 0.3, tilt: 0.62, length: 0.215, depth: 0.038, droop: 0.02 },
  left: { rise: 0.35, tilt: 0.58, length: 0.205, depth: 0.04, droop: 0.024 },
} satisfies Record<string, LoopShape>

const loopRoot = 0.012

/**
 * One loop of the bow around the knot: out along the front, round the far
 * fold and back along the rear, pinched at the knot like a teardrop, its
 * edges curling in so it puffs, its inside in deep blush.
 */
function loopStation(side: 1 | -1, loose: number): StationFn {
  const shape = side > 0 ? loopShapes.right : loopShapes.left
  const outward = new Vector3(
    side * Math.cos(shape.rise),
    Math.sin(shape.rise),
    0
  )
  const depthAxis = new Vector3(0, Math.sin(shape.tilt), Math.cos(shape.tilt))
  const span = new Vector3().crossVectors(outward, depthAxis).normalize()
  const length = shape.length * (1 - 0.7 * loose)
  const depth = shape.depth * (1 - 0.4 * loose)
  return (s, out) => {
    const theta = Math.PI * 2 * s
    const reach = (1 - Math.cos(theta)) / 2
    const bulge = Math.sin(theta) * Math.sqrt(reach)
    const layer = bulge > 0 ? 1.1 : 0.85
    out.position
      .copy(outward)
      .multiplyScalar(loopRoot + length * reach)
      .addScaledVector(depthAxis, depth * layer * bulge)
    out.position.y -= shape.droop * (1 - loose) * reach * reach
    out.across.copy(span)
    const full = smoothstep(reach, 0.05, 0.75)
    out.width = width * (0.4 + 0.95 * full) * (1 - 0.2 * loose)
    out.cup = -0.007 * smoothstep(reach, 0.2, 0.85)
    out.pleat = 0.0035 * (1 - smoothstep(reach, 0.05, 0.45))
    out.twist = 0.1 * side * Math.sin(theta)
    const gathered = 1 - smoothstep(reach, 0.05, 0.5)
    out.shade = 0.04 + 0.45 * gathered + (bulge < 0 ? 0.22 : 0)
    out.backShade = 0.55 + 0.3 * (1 - reach)
  }
}

/** The band wrapped round the gathered middle, creased, its back in shadow. */
function knotStation(loose: number): StationFn {
  const radiusY = 0.024 * (1 + 0.5 * loose)
  const radiusZ = 0.019 * (1 + 0.5 * loose)
  return (s, out) => {
    const phi = Math.PI * 2 * s - Math.PI / 2
    const front = 0.5 + 0.5 * Math.sin(phi)
    out.position.set(
      0.004 * Math.sin(2 * phi),
      radiusY * Math.cos(phi),
      radiusZ * Math.sin(phi) * (0.85 + 0.25 * front)
    )
    out.across.set(-1, -0.12, 0)
    out.width = 0.042 * (1 - 0.25 * loose)
    out.cup = -0.005
    out.pleat = 0.0026 * (1 - 0.6 * loose)
    out.shade = 0.08 + 0.45 * (1 - front)
    out.backShade = 0.75
  }
}

type Point3 = readonly [x: number, y: number, z: number]

const tailPoints = {
  right: [
    [0.006, -0.01, 0.004],
    [0.04, -0.085, 0.014],
    [0.085, -0.19, 0.01],
    [0.112, -0.3, 0.017],
    [0.15, -0.45, 0.011],
  ],
  left: [
    [-0.006, -0.01, 0.004],
    [-0.045, -0.08, 0.012],
    [-0.095, -0.17, 0.016],
    [-0.13, -0.27, 0.01],
    [-0.165, -0.39, 0.014],
  ],
} satisfies Record<string, readonly Point3[]>

/** A tail hanging from the knot, twisting once to show its back, V-cut. */
function tailStation(side: 1 | -1, loose: number): StationFn {
  const curve = new CatmullRomCurve3(
    (side > 0 ? tailPoints.right : tailPoints.left).map(
      ([x, y, z]) =>
        new Vector3(
          knotX + x * (1 - 0.25 * loose),
          knotY + y * (1 + 0.35 * loose),
          knotZ + z + 0.01 * loose
        )
    ),
    false,
    "centripetal"
  )
  return (s, out) => {
    curve.getPointAt(s, out.position)
    out.width = width * (0.45 + 0.6 * smoothstep(s, 0, 0.25))
    out.twist =
      side *
      0.95 *
      smoothstep(s, 0.15, 0.55) *
      (1 - 0.6 * smoothstep(s, 0.6, 0.95))
    out.cup = 0.0022 * smoothstep(s, 0.2, 0.8)
    out.pleat = 0.003 * (1 - smoothstep(s, 0, 0.25))
    out.shade = 0.05 + 0.4 * (1 - smoothstep(s, 0, 0.22))
    out.backShade = 0.3
  }
}

const tailNotch = 0.03

function lacingPieces(): SatinPiece[] {
  return [
    ...([1, -1] as const).map((side) => ({
      station: tailStation(side, 0),
      untied: tailStation(side, 1),
      segments: 40,
      notch: tailNotch,
    })),
    ...lacingSpans.map((span) => ({
      station: spanStation(span, 0),
      untied: spanStation(span, 1),
      segments: 20,
    })),
    ...([1, -1] as const).map((side) => ({
      station: riseStation(side, 0),
      untied: riseStation(side, 1),
      segments: 22,
    })),
  ]
}

function bowPieces(): SatinPiece[] {
  return [
    ...([1, -1] as const).map((side) => ({
      station: loopStation(side, 0),
      untied: loopStation(side, 1),
      segments: 56,
    })),
    { station: knotStation(0), untied: knotStation(1), segments: 36 },
  ]
}

/**
 * The front door's ribbon: the lacing and tails in the door's frame, the
 * loops and knot around `ribbonKnot.center`. Both carry vertex colours and
 * an untie morph.
 */
export function buildDoorRibbon() {
  return {
    lacing: sweepSatin(lacingPieces(), satinSpec),
    bow: sweepSatin(bowPieces(), satinSpec),
  }
}

export const doorRibbon = buildDoorRibbon()

/** How far the bow and the lacing have come undone at an untie progress. */
const untieShare = {
  bow: { from: 0, to: 0.6 },
  lacing: { from: 0.1, to: 0.85 },
}

function morph(mesh: Mesh | null, influence: number) {
  if (!mesh) {
    return
  }
  if (!mesh.morphTargetInfluences) {
    mesh.updateMorphTargets()
  }
  const influences = mesh.morphTargetInfluences
  if (influences && influences.length > 0) {
    influences[0] = influence
  }
}

/** Loosens the bow first, then the lacing, as the untie progresses. */
export function poseDoorRibbon(
  lacing: Mesh | null,
  bow: Mesh | null,
  progress: number
) {
  morph(bow, smoothstep(progress, untieShare.bow.from, untieShare.bow.to))
  morph(
    lacing,
    smoothstep(progress, untieShare.lacing.from, untieShare.lacing.to)
  )
}
