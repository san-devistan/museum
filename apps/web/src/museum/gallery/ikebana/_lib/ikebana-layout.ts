import {
  curveThrough,
  type Vec3,
} from "@/museum/gallery/ikebana/_lib/ikebana-geometry"
import {
  createRandom,
  lerp,
  type Random,
} from "@/museum/gallery/ikebana/_lib/ikebana-random"
import {
  ikebanaRecipes,
  type IkebanaVariant,
  type Polar,
  type Recipe,
  type WillowRecipe,
} from "@/museum/gallery/ikebana/_lib/ikebana-recipes"
import {
  vesselRadiusAt,
  vesselSpecs,
  type VesselKind,
  type VesselSpec,
} from "@/museum/gallery/ikebana/_lib/ikebana-vessel"
import { Vector3, type CatmullRomCurve3 } from "three"

export type { IkebanaVariant } from "@/museum/gallery/ikebana/_lib/ikebana-recipes"

export const ikebanaFootprint = { radius: 0.32, height: 1.2 } as const

const plinthHalf = 0.3

export type HeadSpec = {
  id: string
  tip: Vector3
  tangent: Vector3
  outward: Vector3
  size: number
  roll: number
}

export type StemSpec = { id: string; curve: CatmullRomCurve3; radius: number }

export type StrandSpec = { id: string; curve: CatmullRomCurve3; hang: boolean }

export type Arrangement = {
  seed: number
  yaw: number
  vessel: VesselKind
  stems: StemSpec[]
  alliums: HeadSpec[]
  blooms: HeadSpec[]
  spathes: HeadSpec[]
  crystals: HeadSpec[]
  callas: HeadSpec[]
  willow: StemSpec[]
  moss: { center: Vector3; outward: Vector3 } | null
  strands: StrandSpec[]
}

type Frame = { recipe: Recipe; random: Random; vessel: VesselSpec }

function placePolar({ recipe, random }: Frame, slot: Polar) {
  const sign = recipe.mirror ? -1 : 1
  const angle = sign * (slot.angle + random.range(-0.18, 0.18)) + recipe.yaw
  const reach = slot.reach * random.range(0.85, 1.15)
  const height = slot.height * recipe.lift * random.range(0.95, 1.04)
  return new Vector3(Math.sin(angle) * reach, height, Math.cos(angle) * reach)
}

function horizontal(point: Vector3) {
  const flat = new Vector3(point.x, 0, point.z)
  if (flat.lengthSq() < 1e-6) {
    return new Vector3(0, 0, 1)
  }
  return flat.normalize()
}

function stemCurve(frame: Frame, tip: Vector3) {
  const { vessel, random } = frame
  const out = horizontal(tip)
  const mouth = Math.min(vessel.spread, Math.hypot(tip.x, tip.z) * 0.6)
  const bow = random.range(-0.02, 0.02)
  const lipY = vessel.lip + 0.02
  const middle = new Vector3(
    lerp(out.x * mouth, tip.x, 0.55) - out.z * bow,
    lerp(lipY, Math.max(lipY + 0.02, tip.y), 0.5),
    lerp(out.z * mouth, tip.z, 0.55) + out.x * bow
  )
  return curveThrough([
    [out.x * 0.02, vessel.stemDepth, out.z * 0.02],
    [out.x * mouth, lipY, out.z * mouth],
    [middle.x, middle.y, middle.z],
    [tip.x, Math.max(lipY + 0.04, tip.y), tip.z],
  ])
}

type HeadBatch = {
  kind: string
  slots: readonly Polar[]
  stemRadius: number
}

function growHeads(frame: Frame, batch: HeadBatch, stems: StemSpec[]) {
  return batch.slots.map((slot, index) => {
    const id = `${batch.kind}-${index}`
    const placedTip = placePolar(frame, slot)
    const curve = stemCurve(frame, placedTip)
    const tip = curve.getPointAt(1)
    stems.push({ id, curve, radius: batch.stemRadius })
    return {
      id,
      tip,
      tangent: curve.getTangentAt(1).normalize(),
      outward: horizontal(tip),
      size: slot.size * frame.random.range(0.92, 1.08),
      roll: frame.random.range(-0.3, 0.3),
    }
  })
}

type WillowPlan = {
  start: Vector3
  end: Vector3
  turns: number
  amplitude: number
}

function willowCurve(
  frame: Frame,
  { start, end, turns, amplitude }: WillowPlan
) {
  const points: Vec3[] = []
  const steps = Math.round(turns * 8)
  const out = horizontal(end.clone().sub(start))
  const side = new Vector3(-out.z, 0, out.x)
  const phase = frame.random.range(0, Math.PI * 2)
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    const base = start.clone().lerp(end, t)
    base.addScaledVector(out, Math.sin(t * Math.PI) * 0.04)
    const angle = phase + t * turns * Math.PI * 2
    const size =
      amplitude *
      Math.sin(Math.min(1, t * 5) * (Math.PI / 2)) *
      frame.random.range(0.8, 1.15)
    base.addScaledVector(side, Math.cos(angle) * size)
    base.addScaledVector(out, Math.sin(angle) * size * 0.7)
    points.push([base.x, base.y, base.z])
  }
  return curveThrough(points)
}

function growWillow(frame: Frame, plan: WillowRecipe): StemSpec[] {
  const sign = frame.recipe.mirror ? -1 : 1
  const angle = sign * plan.angle + frame.recipe.yaw
  const out = new Vector3(Math.sin(angle), 0, Math.cos(angle))
  const start = new Vector3(out.x * 0.02, frame.vessel.stemDepth, out.z * 0.02)
  const end = out.clone().multiplyScalar(plan.reach).setY(plan.height)
  const main = willowCurve(frame, {
    start,
    end,
    turns: plan.turns,
    amplitude: 0.022,
  })
  const twigs = [0.5, 0.72].map((at, index) => {
    const origin = main.getPointAt(at)
    const twist = angle + (index === 0 ? 0.9 : -0.7) * sign
    const reach = new Vector3(Math.sin(twist), 0, Math.cos(twist))
    const tipPoint = origin
      .clone()
      .addScaledVector(reach, 0.09)
      .setY(origin.y + 0.15)
    return {
      id: `willow-twig-${index}`,
      curve: willowCurve(frame, {
        start: origin,
        end: tipPoint,
        turns: 2,
        amplitude: 0.012,
      }),
      radius: 0.0026,
    }
  })
  return [{ id: "willow-main", curve: main, radius: 0.0058 }, ...twigs]
}

function plinthEdgeDistance(angle: number) {
  return (
    plinthHalf / Math.max(Math.abs(Math.sin(angle)), Math.abs(Math.cos(angle)))
  )
}

type StrandPlan = {
  angle: number
  hang: boolean
  random: Random
  vessel: VesselSpec
}

function drapedPath(plan: StrandPlan, at: (r: number, h: number) => Vec3) {
  const { vessel } = plan
  const lip = vessel.lip
  const rim = vesselRadiusAt(vessel, lip)
  const widest = Math.max(...vessel.outer.map(([radius]) => radius), rim)
  const hug = (height: number) =>
    at(vesselRadiusAt(vessel, height) + 0.02, height)
  return [
    at(rim * 0.6, lip - 0.03),
    at(rim + 0.004, lip + 0.03),
    hug(lip * 0.8),
    hug(lip * 0.5),
    hug(lip * 0.2),
    at(widest + 0.035, 0.011),
  ] satisfies Vec3[]
}

function strandCurve(plan: StrandPlan) {
  const { angle, hang, random } = plan
  const out = new Vector3(Math.sin(angle), 0, Math.cos(angle))
  const at = (reach: number, height: number): Vec3 => [
    out.x * reach,
    height,
    out.z * reach,
  ]
  const edge = plinthEdgeDistance(angle)
  const draped = drapedPath(plan, at)
  if (!hang) {
    const rest = Math.min(edge - 0.03, random.range(0.25, 0.29))
    const drift = random.range(-0.05, 0.05)
    return curveThrough([
      ...draped,
      [out.x * rest - out.z * drift, 0.009, out.z * rest + out.x * drift],
    ])
  }
  const sway = random.range(-0.015, 0.015)
  const drop = random.range(0.2, 0.32)
  return curveThrough([
    ...draped,
    at(edge - 0.035, 0.009),
    at(edge + 0.006, -0.012),
    at(edge + 0.012, -drop * 0.45),
    [
      out.x * (edge + 0.014) - out.z * sway,
      -drop,
      out.z * (edge + 0.014) + out.x * sway,
    ],
  ])
}

function growStrands(frame: Frame) {
  return frame.recipe.strands.map((strand, index) => ({
    id: `strand-${index}`,
    hang: strand.hang,
    curve: strandCurve({
      angle: frame.recipe.strandEdge + strand.offset,
      hang: strand.hang,
      random: frame.random,
      vessel: frame.vessel,
    }),
  }))
}

function placeMoss(frame: Frame, base: number) {
  const sign = frame.recipe.mirror ? -1 : 1
  const angle = sign * base + frame.recipe.yaw + frame.random.range(-0.2, 0.2)
  const outward = new Vector3(Math.sin(angle), 0, Math.cos(angle))
  const reach = vesselRadiusAt(frame.vessel, frame.vessel.lip) * 0.82
  const center = outward.clone().multiplyScalar(reach).setY(frame.vessel.lip)
  return { center, outward }
}

function grow(frame: Frame, stems: StemSpec[]) {
  const { slots } = frame.recipe
  const batch = (kind: string, list: readonly Polar[], stemRadius: number) =>
    growHeads(frame, { kind, slots: list, stemRadius }, stems)
  return {
    spathes: batch("spathe", slots.spathes, 0.0042),
    crystals: batch("crystal", slots.crystals, 0.0038),
    alliums: batch("allium", slots.alliums, 0.0034),
    blooms: batch("bloom", slots.blooms, 0.003),
    callas: batch("calla", slots.callas, 0.0055),
  }
}

export function arrangeIkebana(variant: IkebanaVariant): Arrangement {
  const recipe = ikebanaRecipes[variant]
  const vessel = vesselSpecs[recipe.vessel]
  const frame = { recipe, vessel, random: createRandom(recipe.seed) }
  const stems: StemSpec[] = []
  const heads = grow(frame, stems)
  return {
    seed: recipe.seed,
    yaw: recipe.yaw,
    vessel: recipe.vessel,
    stems,
    ...heads,
    willow: recipe.willow ? growWillow(frame, recipe.willow) : [],
    moss: recipe.moss === null ? null : placeMoss(frame, recipe.moss),
    strands: growStrands(frame),
  }
}
