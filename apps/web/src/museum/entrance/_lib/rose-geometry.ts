import { createRandom } from "@/museum/_lib/relief/height-field"
import { mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import { roses } from "@/museum/entrance/_lib/manor-layout"
import { vineCurves } from "@/museum/entrance/_lib/vine-geometry"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  Euler,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three"

const roseCup = [
  [0.02, -0.45],
  [0.42, -0.4],
  [0.78, -0.12],
  [0.92, 0.22],
  [0.82, 0.45],
  [0.7, 0.4],
] as const

function petalCup(scale: number, twist: number) {
  const lathe = new LatheGeometry(
    roseCup.map(([x, y]) => new Vector2(x * scale, y * scale)),
    15
  )
  const position = lathe.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const ruffle = 1 + 0.16 * Math.cos(Math.atan2(z, x) * 5 + twist)
    position.setXYZ(index, x * ruffle, position.getY(index), z * ruffle)
  }
  lathe.computeVertexNormals()
  return lathe
}

/** A dried rose head: two ruffled petal cups around a tight bud. */
function buildRose(): BufferGeometry {
  return mergeParts([
    petalCup(1, 0),
    petalCup(0.68, 1.3).translate(0, 0.12, 0),
    new SphereGeometry(0.34, 10, 8).translate(0, 0.2, 0),
  ]).rotateX(Math.PI / 2)
}

/** A withered leaf one unit long, pointing along +x and curling at the tip. */
function buildLeaf(): BufferGeometry {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.quadraticCurveTo(0.35, 0.28, 1, 0)
  shape.quadraticCurveTo(0.35, -0.24, 0, 0)
  const leaf = new ShapeGeometry(shape, 6)
  const position = leaf.getAttribute("position")
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    position.setZ(index, 0.35 * x * x + 0.6 * Math.abs(y))
  }
  leaf.computeVertexNormals()
  return leaf
}

function roseMatrices() {
  const matrix = new Matrix4()
  return Float32Array.from(
    roses.flatMap((rose) => [
      ...matrix.compose(
        new Vector3(...rose.position),
        new Quaternion().setFromEuler(new Euler(0.25, -0.2, rose.tilt)),
        new Vector3(rose.scale, rose.scale, rose.scale)
      ).elements,
    ])
  )
}

function roseColors() {
  const dried = new Color(sceneTokens.facade.rose)
  const ghost = new Color(sceneTokens.facade.roseGhost)
  return Float32Array.from(
    roses.flatMap((rose) => (rose.isPale ? ghost : dried).toArray())
  )
}

const leafSpacing = 0.09

/** Leaves scattered along each stem, alternating sides, a few gone to wine. */
function leafInstances() {
  const random = createRandom(97)
  const matrix = new Matrix4()
  const withered = [
    new Color(sceneTokens.facade.leaf),
    new Color(sceneTokens.facade.rose),
  ]
  const matrices: number[] = []
  const colors: number[] = []
  for (const { curve, radius } of vineCurves) {
    const count = Math.floor(curve.getLength() / leafSpacing)
    for (let index = 1; index < count; index += 1) {
      const t = (index + random() * 0.6) / count
      const tangent = curve.getTangentAt(Math.min(1, t))
      const side = index % 2 === 0 ? 1 : -1
      const angle = Math.atan2(tangent.y, tangent.x) + side * (0.9 + random())
      const size = 0.045 + random() * 0.035
      const position = curve
        .getPointAt(Math.min(1, t))
        .add(new Vector3(0, 0, radius * 0.5))
      matrix.compose(
        position,
        new Quaternion().setFromEuler(
          new Euler(random() * 0.6 - 0.3, -0.35, angle, "ZYX")
        ),
        new Vector3(size, size, size)
      )
      matrices.push(...matrix.elements)
      colors.push(
        ...(withered[random() > 0.75 ? 1 : 0] ?? new Color()).toArray()
      )
    }
  }
  return {
    count: matrices.length / 16,
    matrices: Float32Array.from(matrices),
    colors: Float32Array.from(colors),
  }
}

export const roseGeometry = buildRose()

export const roseInstances = {
  count: roses.length,
  matrices: roseMatrices(),
  colors: roseColors(),
}

export const leafGeometry = buildLeaf()

export const leaves = leafInstances()
