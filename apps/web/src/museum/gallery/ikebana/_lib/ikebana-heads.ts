import {
  curveThrough,
  placed,
  taperedTube,
} from "@/museum/gallery/ikebana/_lib/ikebana-geometry"
import type { HeadSpec } from "@/museum/gallery/ikebana/_lib/ikebana-layout"
import type { Random } from "@/museum/gallery/ikebana/_lib/ikebana-random"
import {
  createBloomPetals,
  createCallaGeometry,
  createSpatheGeometry,
} from "@/museum/gallery/ikebana/_lib/ikebana-shapes"
import {
  tagHead,
  type LivingHead,
  type LivingHeadKind,
} from "@/museum/gallery/ikebana/_lib/living-geometry"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from "three"

const up = new Vector3(0, 1, 0)

type HeadFrame = {
  rotation: Quaternion
  yAxis: Vector3
  zAxis: Vector3
}

function headFrame(head: HeadSpec, tilt: number): HeadFrame {
  const facing = head.outward.clone().applyAxisAngle(up, head.roll)
  const yAxis = up
    .clone()
    .multiplyScalar(Math.cos(tilt))
    .addScaledVector(facing, Math.sin(tilt))
    .normalize()
  const zAxis = facing
    .clone()
    .multiplyScalar(Math.cos(tilt))
    .addScaledVector(up, -Math.sin(tilt))
    .normalize()
  const xAxis = new Vector3().crossVectors(yAxis, zAxis).normalize()
  const basis = new Matrix4().makeBasis(xAxis, yAxis, zAxis)
  return {
    rotation: new Quaternion().setFromRotationMatrix(basis),
    yAxis,
    zAxis,
  }
}

function spadix(head: HeadSpec, frame: HeadFrame) {
  const length = head.size * 0.3
  const start = head.tip.clone().addScaledVector(frame.zAxis, 0.002)
  const direction = frame.yAxis
    .clone()
    .multiplyScalar(0.85)
    .addScaledVector(frame.zAxis, 0.5)
    .normalize()
  const middle = start.clone().addScaledVector(direction, length * 0.5)
  const end = start
    .clone()
    .addScaledVector(direction, length)
    .addScaledVector(up, length * 0.12)
  const radius = head.size * 0.04
  return taperedTube({
    curve: curveThrough([start.toArray(), middle.toArray(), end.toArray()]),
    segments: 10,
    radialSegments: 7,
    radius: (t) => radius * (1 - 0.55 * t ** 2),
  })
}

export type SpatheBuild = {
  blades: BufferGeometry[]
  spadices: BufferGeometry[]
  living: LivingHead[]
}

// Heads of one kind, and the index the first one takes among all the heads.
type HeadBatch = {
  heads: readonly HeadSpec[]
  random: Random
  first: number
}

type LivingFrame = { axis: Vector3; face: Vector3; reach: number }

function livingHead(
  head: HeadSpec,
  kind: LivingHeadKind,
  { axis, face, reach }: LivingFrame
): LivingHead {
  return {
    id: head.id,
    kind,
    pivot: head.tip.clone(),
    axis: axis.clone(),
    face: face.clone(),
    center: head.tip.clone().addScaledVector(axis, head.size * reach),
    size: head.size,
  }
}

export function buildSpathes(
  { heads, random, first }: HeadBatch,
  kind: "spathe" | "crystal"
) {
  const build: SpatheBuild = { blades: [], spadices: [], living: [] }
  for (const [index, head] of heads.entries()) {
    const frame = headFrame(head, random.range(0.5, 0.75))
    const blade = createSpatheGeometry({
      length: head.size,
      cup: random.range(-0.08, -0.04),
      curl: random.range(0.16, 0.26),
      veins: head.size * 0.006,
    })
    build.blades.push(
      tagHead(
        placed(blade, {
          position: head.tip.toArray(),
          rotation: frame.rotation,
        }),
        first + index
      )
    )
    blade.dispose()
    build.spadices.push(tagHead(spadix(head, frame), first + index))
    build.living.push(
      livingHead(head, kind, {
        axis: frame.yAxis,
        face: frame.zAxis,
        reach: 0.45,
      })
    )
  }
  return build
}

export function buildCallas({ heads, random, first }: HeadBatch) {
  const living: LivingHead[] = []
  const trumpets = heads.map((head, index) => {
    const frame = headFrame(head, random.range(0.85, 1.05))
    const trumpet = createCallaGeometry(head.size)
    const result = placed(trumpet, {
      position: head.tip.toArray(),
      rotation: frame.rotation,
    })
    trumpet.dispose()
    living.push(
      livingHead(head, "calla", {
        axis: frame.yAxis,
        face: frame.yAxis,
        reach: 0.6,
      })
    )
    return tagHead(result, first + index)
  })
  return { trumpets, living }
}

type BloomBuild = {
  petals: BufferGeometry[]
  calyces: BufferGeometry[]
  living: LivingHead[]
}

export function buildBlooms({ heads, random, first }: HeadBatch) {
  const palette = {
    bloom: new Color(sceneTokens.botanical.bloom),
    blush: new Color(sceneTokens.botanical.blush),
  }
  const build: BloomBuild = { petals: [], calyces: [], living: [] }
  for (const [index, head] of heads.entries()) {
    const axis = head.tangent
      .clone()
      .lerp(up, 0.35)
      .addScaledVector(head.outward, 0.35)
      .normalize()
    const rotation = new Quaternion().setFromUnitVectors(up, axis)
    const base = head.tip.clone().addScaledVector(axis, 0.006)
    for (const petal of createBloomPetals({
      size: head.size,
      random,
      palette,
    })) {
      build.petals.push(
        tagHead(
          placed(petal, { position: base.toArray(), rotation }),
          first + index
        )
      )
      petal.dispose()
    }
    const calyxStart = head.tip.clone().addScaledVector(axis, -0.024)
    const calyx = taperedTube({
      curve: curveThrough([
        calyxStart.toArray(),
        head.tip.toArray(),
        base.toArray(),
      ]),
      segments: 4,
      radialSegments: 8,
      radius: (t) => head.size * (0.13 + 0.12 * t),
    })
    build.calyces.push(tagHead(calyx, first + index))
    build.living.push(
      livingHead(head, "bloom", { axis, face: axis, reach: 0.4 })
    )
  }
  return build
}

type FloretBuild = {
  matrices: Float32Array
  colors: Float32Array
  heads: number[]
  cores: BufferGeometry[]
  living: LivingHead[]
}

type FloretOptions = HeadBatch & {
  white: Color
  green: Color
}

function floretCount(size: number) {
  return Math.round(150000 * size * size)
}

export function buildFlorets({
  heads,
  random,
  first,
  white,
  green,
}: FloretOptions): FloretBuild {
  const total = heads.reduce((sum, head) => sum + floretCount(head.size), 0)
  const matrices = new Float32Array(total * 16)
  const colors = new Float32Array(total * 3)
  const floretHeads: number[] = []
  const cores: BufferGeometry[] = []
  const living: LivingHead[] = []
  const matrix = new Matrix4()
  const rotation = new Quaternion()
  const direction = new Vector3()
  const position = new Vector3()
  const scale = new Vector3()
  const tint = new Color()
  let cursor = 0
  for (const [headIndex, head] of heads.entries()) {
    const center = head.tip
      .clone()
      .addScaledVector(head.tangent, head.size * 0.85)
    cores.push(
      tagHead(
        new SphereGeometry(head.size * 0.8, 14, 10).translate(
          center.x,
          center.y,
          center.z
        ),
        first + headIndex
      )
    )
    living.push(
      livingHead(head, "allium", {
        axis: head.tangent,
        face: head.tangent,
        reach: 0.85,
      })
    )
    const count = floretCount(head.size)
    for (let index = 0; index < count; index += 1) {
      const y = 1 - ((index + 0.5) / count) * 2
      const ring = Math.sqrt(1 - y * y)
      const theta = index * 2.399963 + random.range(-0.08, 0.08)
      direction.set(Math.cos(theta) * ring, y, Math.sin(theta) * ring)
      rotation.setFromUnitVectors(up, direction)
      position
        .copy(center)
        .addScaledVector(direction, head.size * random.range(0.86, 0.94))
      const length = head.size * random.range(0.09, 0.12)
      scale.set(length * 0.8, length, length * 0.8)
      matrix.compose(position, rotation, scale)
      matrix.toArray(matrices, cursor * 16)
      tint.copy(white).lerp(green, random.range(0, 0.4))
      tint.toArray(colors, cursor * 3)
      floretHeads.push(first + headIndex)
      cursor += 1
    }
  }
  return { matrices, colors, heads: floretHeads, cores, living }
}
