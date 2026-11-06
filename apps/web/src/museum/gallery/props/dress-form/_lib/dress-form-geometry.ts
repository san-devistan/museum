import {
  laceFieldMeters,
  laceHem,
} from "@/museum/gallery/props/_lib/lace-textures"
import {
  bowGeometry,
  mergeParts,
} from "@/museum/gallery/props/_lib/prop-geometry"
import {
  finial,
  turnedBase,
  turnedPole,
} from "@/museum/gallery/props/_lib/turned-wood"
import {
  dressForm,
  sectionAt,
  sectionPoint,
  shellGeometry,
  torsoReach,
  type ShellPoint,
} from "@/museum/gallery/props/dress-form/_lib/dress-form-shape"
import { CircleGeometry, CylinderGeometry, type BufferGeometry } from "three"

const { hipY, waistY, neckY, neckTop, neckRadius } = dressForm
const torsoHeight = neckY - hipY

export function buildFormStand() {
  return mergeParts([
    turnedBase(0.2, 0.06),
    turnedPole({ from: 0.06, to: hipY, girth: 0.015, rings: [0.34] }),
    finial(neckTop, 0.024),
  ])
}

export function buildTorso() {
  const shell = shellGeometry({
    rows: 40,
    columns: 40,
    point: (t, angle) => {
      const section = sectionAt(t * torsoHeight)
      const point = section ? sectionPoint(section, angle) : { x: 0, z: 0 }
      return { x: point.x, y: hipY + t * torsoHeight, z: point.z }
    },
  })
  return mergeParts(
    [
      shell,
      new CircleGeometry(1, 40)
        .rotateX(Math.PI / 2)
        .scale(0.165, 1, 0.12)
        .translate(0, hipY, 0),
      new CylinderGeometry(
        neckRadius,
        neckRadius * 1.08,
        neckTop - neckY,
        20
      ).translate(0, (neckY + neckTop) / 2, 0),
    ],
    ["position", "normal"]
  )
}

type Ellipse = { x: number; z: number }

function eased(from: Ellipse, to: Ellipse, amount: number): Ellipse {
  const k = Math.min(1, Math.max(0, amount))
  return { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k }
}

type Fall = {
  y: number
  reach: Ellipse
  folds: number
  foldDepth: number
  phase: number
}

// Places fabric round the form, never inside it, with outward-only folds.
function drapePoint(angle: number, fall: Fall): ShellPoint {
  const fold =
    (0.5 + 0.5 * Math.sin(angle * fall.folds + fall.phase)) * fall.foldDepth
  let x = Math.sin(angle) * fall.reach.x
  let z = Math.cos(angle) * fall.reach.z
  const reach = Math.hypot(x, z)
  const least = torsoReach(fall.y, angle) + 0.014
  const scale = (Math.max(reach, least) + fold) / Math.max(reach, 1e-4)
  x *= scale
  z *= scale
  return { x, y: fall.y, z }
}

const waist: Ellipse = { x: 0.142, z: 0.112 }
const hip: Ellipse = { x: 0.198, z: 0.154 }
const hipDrop = 0.17

type Skirt = {
  hem: (angle: number) => number
  flare: Ellipse
  folds: number
  depth: number
  grow?: number
}

function skirt({ hem, flare, folds, depth, grow = 0 }: Skirt) {
  return shellGeometry({
    rows: 36,
    columns: 64,
    point: (t, angle) => {
      const y = waistY - t * (waistY - hem(angle))
      const drop = waistY - y
      const toHip = eased(waist, hip, drop / hipDrop)
      const reach = eased(toHip, flare, (drop - hipDrop) / (waistY - 0.1))
      return drapePoint(angle, {
        y,
        reach: { x: reach.x + grow, z: reach.z + grow },
        folds,
        foldDepth: 0.003 + depth * t,
        phase: Math.sin(angle * 3) * 0.6,
      })
    },
  })
}

// Full gown: a long gathered skirt and a shorter overskirt.
function gownDrape() {
  return mergeParts(
    [
      skirt({
        hem: (angle) => 0.05 + 0.015 * Math.sin(angle * 3 + 1),
        flare: { x: 0.25, z: 0.235 },
        folds: 16,
        depth: 0.018,
      }),
      skirt({
        hem: (angle) => 0.44 + 0.03 * Math.sin(angle * 2),
        flare: { x: 0.25, z: 0.235 },
        folds: 11,
        depth: 0.022,
        grow: 0.012,
      }),
    ],
    ["position", "normal"]
  )
}

// High at the front, trailing behind, with a band wrapped across the bust.
function highLowDrape() {
  const band = shellGeometry({
    rows: 8,
    columns: 64,
    point: (t, angle) => {
      const y = hipY + 0.5 + 0.06 * Math.sin(angle) + (t - 0.5) * 0.11
      const ruche = 0.004 * (0.5 + 0.5 * Math.sin(angle * 22 + t * 3))
      const reach = torsoReach(y, angle) + 0.008 + ruche
      return { x: Math.sin(angle) * reach, y, z: Math.cos(angle) * reach }
    },
  })
  return mergeParts(
    [
      skirt({
        hem: (angle) => 0.62 - 0.58 * ((1 - Math.cos(angle)) / 2),
        flare: { x: 0.24, z: 0.22 },
        folds: 10,
        depth: 0.024,
      }),
      band,
    ],
    ["position", "normal"]
  )
}

const shoulders: Ellipse = { x: 0.2, z: 0.125 }
const shoulderShare = 0.14
const shoulderY = hipY + 0.615

// A veil over the shoulders, falling all round, longer at the back.
function veilDrape() {
  return shellGeometry({
    rows: 40,
    columns: 64,
    point: (t, angle) => {
      const neck = { x: neckRadius + 0.014, z: neckRadius + 0.012 }
      if (t < shoulderShare) {
        const k = t / shoulderShare
        const y = neckY + 0.012 - (neckY + 0.012 - shoulderY) * k * k
        const reach = eased(neck, shoulders, Math.sin((k * Math.PI) / 2))
        return drapePoint(angle, {
          y,
          reach,
          folds: 12,
          foldDepth: 0,
          phase: 0,
        })
      }
      const u = (t - shoulderShare) / (1 - shoulderShare)
      const hem = 0.5 - 0.22 * ((1 - Math.cos(angle)) / 2)
      const y = shoulderY - u * (shoulderY - hem)
      const reach = eased(shoulders, { x: 0.25, z: 0.23 }, 1 - (1 - u) ** 2)
      return drapePoint(angle, {
        y,
        reach,
        folds: 12,
        foldDepth: 0.022 * u,
        phase: Math.sin(angle * 2) * 0.8,
      })
    },
  })
}

export const drapeKinds = ["gown", "high-low", "veil"] as const

export type DrapeKind = (typeof drapeKinds)[number]

const drapeBuilders: Record<DrapeKind, () => BufferGeometry> = {
  gown: gownDrape,
  "high-low": highLowDrape,
  veil: veilDrape,
}

export function buildDrape(kind: DrapeKind) {
  return drapeBuilders[kind]()
}

// A ruffled lace collar round the neck, scallops up.
export function buildCollar() {
  const height = 0.06
  return shellGeometry({
    rows: 6,
    columns: 72,
    point: (t, angle) => {
      const ruffle = Math.sin(angle * 16) * 0.011 * t
      const flare = 0.045 * t * t
      return {
        x: Math.sin(angle) * (neckRadius + 0.012 + flare + ruffle),
        y: neckY - 0.004 + t * height,
        z: Math.cos(angle) * (neckRadius + 0.01 + flare + ruffle),
      }
    },
    uv: (t, angle) => [
      (angle * 0.08) / laceFieldMeters,
      (t * height) / laceFieldMeters,
      (angle * 0.09) / laceHem.width,
      ((1 - t) * height) / laceHem.height,
    ],
  })
}

const bowAngle = 0.55

// A satin sash at the waist, tied in a bow at the front side.
export function buildSash() {
  const width = 0.04
  const band = shellGeometry({
    rows: 1,
    columns: 64,
    point: (t, angle) => {
      const y = waistY + (t - 0.5) * width
      const x = Math.sin(angle) * (waist.x + 0.008)
      const z = Math.cos(angle) * (waist.z + 0.008)
      return { x, y, z }
    },
  })
  const reach = Math.hypot(
    Math.sin(bowAngle) * (waist.x + 0.012),
    Math.cos(bowAngle) * (waist.z + 0.012)
  )
  const bow = bowGeometry({ width: 0.032, loop: 0.065, tail: 0.32 })
    .rotateY(bowAngle)
    .translate(Math.sin(bowAngle) * reach, waistY, Math.cos(bowAngle) * reach)
  return mergeParts([band, bow])
}
