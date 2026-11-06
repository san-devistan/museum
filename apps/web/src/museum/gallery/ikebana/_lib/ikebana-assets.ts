import {
  mergeAll,
  painted,
  taperedTube,
} from "@/museum/gallery/ikebana/_lib/ikebana-geometry"
import {
  buildBlooms,
  buildCallas,
  buildFlorets,
  buildSpathes,
} from "@/museum/gallery/ikebana/_lib/ikebana-heads"
import {
  arrangeIkebana,
  type Arrangement,
  type IkebanaVariant,
} from "@/museum/gallery/ikebana/_lib/ikebana-layout"
import {
  createRandom,
  hashNoise,
} from "@/museum/gallery/ikebana/_lib/ikebana-random"
import { vesselGeometry } from "@/museum/gallery/ikebana/_lib/ikebana-vessel"
import {
  instanceHeads,
  livingAttribute,
  padBounds,
  tagStem,
  type LivingHead,
} from "@/museum/gallery/ikebana/_lib/living-geometry"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from "three"

export const floretGeometry = new IcosahedronGeometry(1, 0)
export const beadGeometry = new SphereGeometry(1, 8, 6)

export type InstanceSet = {
  count: number
  matrices: Float32Array
  colors?: Float32Array
  // Its own copy of the shared geometry, carrying per-instance attributes.
  geometry?: BufferGeometry
}

type MaybeGeometry = BufferGeometry | null

export type IkebanaAssets = {
  vessel: BufferGeometry
  stems: BufferGeometry
  willow: MaybeGeometry
  spathes: MaybeGeometry
  crystals: MaybeGeometry
  spadices: MaybeGeometry
  petals: MaybeGeometry
  alliumCores: MaybeGeometry
  moss: MaybeGeometry
  florets: InstanceSet
  beads: InstanceSet
  // Every flower head, in the order the `living` attribute indexes them.
  heads: LivingHead[]
}

const stemSides = 6

function tubesFor(specs: Arrangement["stems"], segments: number) {
  return specs.map((spec) =>
    taperedTube({
      curve: spec.curve,
      segments,
      radialSegments: stemSides,
      radius: (t) => spec.radius * (1 - 0.35 * t),
    })
  )
}

const stemSegments = 24

// Stems bend along when their head leans.
function livingStems(
  stems: Arrangement["stems"],
  heads: readonly LivingHead[]
) {
  const headIndex = new Map(heads.map((head, index) => [head.id, index]))
  return tubesFor(stems, stemSegments).map((tube, index) =>
    tagStem(tube, {
      head: headIndex.get(stems[index]?.id ?? "") ?? -1,
      segments: stemSegments,
      radialSegments: stemSides,
    })
  )
}

function floretGeometryFor(heads: readonly number[]) {
  const geometry = floretGeometry.clone()
  geometry.setAttribute(livingAttribute, instanceHeads(heads))
  return padBounds(geometry)
}

function livingMerge(geometries: BufferGeometry[]) {
  const merged = mergeSome(geometries)
  return merged ? padBounds(merged) : null
}

function buildMoss({ moss, seed }: Arrangement) {
  if (!moss) {
    return null
  }
  const random = createRandom(seed + 7)
  const tufts: BufferGeometry[] = []
  const side = new Vector3(-moss.outward.z, 0, moss.outward.x)
  const blush = new Color(sceneTokens.botanical.moss)
  const shade = new Color(sceneTokens.palette.black)
  for (let index = 0; index < 70; index += 1) {
    const radius = random.range(0.005, 0.012)
    const tuft = new IcosahedronGeometry(radius, 0)
    const position = tuft.getAttribute("position")
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const point = new Vector3().fromBufferAttribute(position, vertex)
      const push = 0.5 + hashNoise(point, seed + index) * 1.3
      position.setXYZ(
        vertex,
        point.x * push,
        point.y * push * 0.7,
        point.z * push
      )
    }
    tuft.computeVertexNormals()
    painted(tuft, blush.clone().lerp(shade, random.range(0.3, 0.62)))
    const spread = random.next()
    const mound = 1 - spread
    const center = moss.center
      .clone()
      .addScaledVector(side, random.range(-0.07, 0.07) * (0.4 + spread))
      .addScaledVector(moss.outward, random.range(-0.01, 0.035))
    center.y += mound * random.range(0.005, 0.035) - 0.004
    tufts.push(tuft.translate(center.x, center.y, center.z))
  }
  return mergeAll(tufts)
}

function mergeSome(geometries: BufferGeometry[]): MaybeGeometry {
  return geometries.length > 0 ? mergeAll(geometries) : null
}

function buildBeads({ strands, seed }: Arrangement): InstanceSet {
  const random = createRandom(seed + 13)
  const matrix = new Matrix4()
  const rotation = new Quaternion()
  const scale = new Vector3()
  const points: Matrix4[] = []
  for (const strand of strands) {
    const length = strand.curve.getLength()
    const count = Math.floor(length / 0.0085)
    for (let index = 0; index <= count; index += 1) {
      const t = index / count
      const taper = strand.hang ? 1 - 0.55 * t ** 2 : 1 - 0.3 * t
      const size = 0.0042 * taper * random.range(0.85, 1.15)
      const position = strand.curve.getPointAt(t)
      position.x += random.range(-0.002, 0.002)
      position.z += random.range(-0.002, 0.002)
      matrix.compose(position, rotation, scale.setScalar(size))
      points.push(matrix.clone())
    }
  }
  const matrices = new Float32Array(points.length * 16)
  for (const [index, point] of points.entries()) {
    point.toArray(matrices, index * 16)
  }
  return { count: points.length, matrices }
}

function buildAssets(variant: IkebanaVariant): IkebanaAssets {
  const arrangement = arrangeIkebana(variant)
  const random = createRandom(arrangement.seed + 3)
  const counts = {
    spathes: arrangement.spathes.length,
    crystals: arrangement.crystals.length,
    blooms: arrangement.blooms.length,
    callas: arrangement.callas.length,
  }
  const spathe = buildSpathes(
    { heads: arrangement.spathes, random, first: 0 },
    "spathe"
  )
  const crystal = buildSpathes(
    { heads: arrangement.crystals, random, first: counts.spathes },
    "crystal"
  )
  const blooms = buildBlooms({
    heads: arrangement.blooms,
    random,
    first: counts.spathes + counts.crystals,
  })
  const callas = buildCallas({
    heads: arrangement.callas,
    random,
    first: counts.spathes + counts.crystals + counts.blooms,
  })
  const florets = buildFlorets({
    heads: arrangement.alliums,
    random,
    first: counts.spathes + counts.crystals + counts.blooms + counts.callas,
    white: new Color(sceneTokens.botanical.bloom),
    green: new Color(sceneTokens.botanical.stem),
  })
  const heads = [
    ...spathe.living,
    ...crystal.living,
    ...blooms.living,
    ...callas.living,
    ...florets.living,
  ]
  const bloomStem = new Color(sceneTokens.botanical.stem)
  return {
    vessel: vesselGeometry(arrangement.vessel),
    stems: padBounds(mergeAll(livingStems(arrangement.stems, heads))),
    willow: mergeSome(tubesFor(arrangement.willow, 64)),
    spathes: livingMerge([...spathe.blades, ...callas.trumpets]),
    crystals: livingMerge(crystal.blades),
    spadices: livingMerge([...spathe.spadices, ...crystal.spadices]),
    petals: livingMerge([
      ...blooms.petals,
      ...blooms.calyces.map((calyx) => painted(calyx, bloomStem)),
    ]),
    alliumCores: livingMerge(florets.cores),
    moss: buildMoss(arrangement),
    florets: {
      count: florets.colors.length / 3,
      matrices: florets.matrices,
      colors: florets.colors,
      geometry: floretGeometryFor(florets.heads),
    },
    beads: buildBeads(arrangement),
    heads,
  }
}

const cache = new Map<IkebanaVariant, IkebanaAssets>()

export function ikebanaAssets(variant: IkebanaVariant) {
  const cached = cache.get(variant)
  if (cached) {
    return cached
  }
  const assets = buildAssets(variant)
  cache.set(variant, assets)
  return assets
}
