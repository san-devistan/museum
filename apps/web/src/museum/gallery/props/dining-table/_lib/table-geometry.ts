import {
  laceFieldMeters,
  laceHem,
} from "@/museum/gallery/props/_lib/lace-textures"
import {
  ellipsePoints,
  mergeParts,
  tube,
} from "@/museum/gallery/props/_lib/prop-geometry"
import { finial, turnedLeg } from "@/museum/gallery/props/_lib/turned-wood"
import {
  guestPlace,
  herPlace,
  table,
  woodTop,
} from "@/museum/gallery/props/dining-table/_lib/dining-layout"
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

const legHeight = woodTop - table.slab - table.apron

function tableWood() {
  const { length, width, legInset } = table
  const legs = [-1, 1].flatMap((sideX) =>
    [-1, 1].map((sideZ) =>
      turnedLeg(legHeight, 0.04, 16).translate(
        sideX * (length / 2 - legInset.x),
        0,
        sideZ * (width / 2 - legInset.z)
      )
    )
  )
  return [
    new RoundedBoxGeometry(length, table.slab, width, 2, 0.012).translate(
      0,
      woodTop - table.slab / 2,
      0
    ),
    new BoxGeometry(length - 0.16, table.apron, width - 0.14).translate(
      0,
      legHeight + table.apron / 2,
      0
    ),
    ...legs,
  ]
}

const seat = { height: 0.46, width: 0.46, depth: 0.44 }

// A medallion-back dining chair facing +z, its seat centred on the origin.
function chairWood() {
  const frontLegs = [-1, 1].map((side) =>
    turnedLeg(seat.height - 0.09, 0.022).translate(side * 0.19, 0, 0.17)
  )
  const backPosts = [-1, 1].flatMap((side) => [
    tube(
      [
        new Vector3(side * 0.19, 0, -0.17),
        new Vector3(side * 0.19, 0.45, -0.19),
        new Vector3(side * 0.185, 1.0, -0.25),
      ],
      0.017,
      { radial: 8 }
    ),
    finial(1.0, 0.018).translate(side * 0.185, 0, -0.25),
  ])
  const medallion = tube(ellipsePoints(0.165, 0.215, 24), 0.014, {
    radial: 6,
    perPoint: 3,
    isClosed: true,
  })
    .rotateX(-0.1)
    .translate(0, 0.74, -0.225)
  return [
    new BoxGeometry(0.44, 0.07, 0.4).translate(
      0,
      seat.height - 0.09 + 0.035,
      0
    ),
    ...frontLegs,
    ...backPosts,
    medallion,
  ]
}

function chairVelvet() {
  return [
    new RoundedBoxGeometry(0.47, 0.06, 0.44, 2, 0.02).translate(
      0,
      seat.height - 0.02,
      0.005
    ),
    new SphereGeometry(1, 20, 12)
      .scale(0.15, 0.2, 0.018)
      .rotateX(-0.1)
      .translate(0, 0.74, -0.225),
  ]
}

function chairMatrix(place: { x: number; z: number; turn: number }) {
  return new Matrix4()
    .makeRotationY(place.turn)
    .setPosition(place.x, 0, place.z)
}

const chairs = [chairMatrix(guestPlace.chair), chairMatrix(herPlace.chair)]

// The table and both chairs (hers pulled back and turned) in dark wood.
export function buildTableWood() {
  return mergeParts([
    ...tableWood(),
    ...chairs.flatMap((matrix) =>
      chairWood().map((part) => part.applyMatrix4(matrix))
    ),
  ])
}

export function buildChairVelvet() {
  return mergeParts(
    chairs.flatMap((matrix) =>
      chairVelvet().map((part) => part.applyMatrix4(matrix))
    ),
    ["position", "normal"]
  )
}

const clothY = table.top - 0.002
const clothEdge = 0.008
const cornerRadius = 0.02

type Rim = { point: Vector3; out: Vector3; along: number; corner: number }

// Points round the table's edge with their outward normal, rounded at the
// corners, and how near each one is to a corner.
function clothRim(steps: number): Rim[] {
  const halfX = table.length / 2 + clothEdge - cornerRadius
  const halfZ = table.width / 2 + clothEdge - cornerRadius
  const sides = [
    { from: [-halfX, halfZ], to: [halfX, halfZ], out: [0, 1] },
    { from: [halfX, halfZ], to: [halfX, -halfZ], out: [1, 0] },
    { from: [halfX, -halfZ], to: [-halfX, -halfZ], out: [0, -1] },
    { from: [-halfX, -halfZ], to: [-halfX, halfZ], out: [-1, 0] },
  ] as const
  const perimeter = 4 * (halfX + halfZ)
  const rims: Rim[] = []
  for (let step = 0; step <= steps; step += 1) {
    let along = (step / steps) * perimeter
    const runs = sides.map(({ from, to }) =>
      Math.hypot(to[0] - from[0], to[1] - from[1])
    )
    let index = 0
    while (index < 3 && along > (runs[index] ?? 0)) {
      along -= runs[index] ?? 0
      index += 1
    }
    const side = sides[index] ?? sides[0]
    const run = runs[index] ?? 1
    const k = Math.min(1, along / run)
    const nextOut = (sides[(index + 1) % 4] ?? side).out
    const prevOut = (sides[(index + 3) % 4] ?? side).out
    const blendNext = Math.max(0, (k - 0.97) / 0.03) * 0.5
    const blendPrev = Math.max(0, (0.03 - k) / 0.03) * 0.5
    const out = new Vector3(
      side.out[0] +
        (nextOut[0] - side.out[0]) * blendNext +
        (prevOut[0] - side.out[0]) * blendPrev,
      0,
      side.out[1] +
        (nextOut[1] - side.out[1]) * blendNext +
        (prevOut[1] - side.out[1]) * blendPrev
    ).normalize()
    const point = new Vector3(
      side.from[0] + (side.to[0] - side.from[0]) * k,
      clothY,
      side.from[1] + (side.to[1] - side.from[1]) * k
    ).addScaledVector(out, cornerRadius)
    const toCorner = Math.min(along, run - along)
    rims.push({
      point,
      out,
      along: (step / steps) * perimeter,
      corner: Math.exp(-((toCorner / 0.14) ** 2)),
    })
  }
  return rims
}

// The lace falling over the table's edge: longer, gathered points at the
// corners and soft waves along the sides; scallops at the hem.
function clothSkirt() {
  const rows = 10
  const rims = clothRim(240)
  const positions: number[] = []
  const uvs: number[] = []
  const uvs1: number[] = []
  for (const rim of rims) {
    const drop = table.clothDrop * (1 + 0.45 * rim.corner)
    for (let row = 0; row <= rows; row += 1) {
      const t = row / rows
      const d = t * drop
      const wave =
        t ** 1.2 *
        (0.014 * rim.corner * Math.sin(rim.along * 42) +
          0.005 * Math.sin(rim.along * 13 + 1))
      const outward = 0.009 * Math.min(1, d / 0.012) + 0.022 * t ** 1.4 + wave
      positions.push(
        rim.point.x + rim.out.x * outward,
        clothY - d,
        rim.point.z + rim.out.z * outward
      )
      uvs.push(rim.along / laceFieldMeters, d / laceFieldMeters)
      uvs1.push(rim.along / laceHem.width, (drop - d) / laceHem.height)
    }
  }
  const indices: number[] = []
  for (let column = 0; column < rims.length - 1; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const a = column * (rows + 1) + row
      const b = a + 1
      const c = a + rows + 1
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute("uv1", new Float32BufferAttribute(uvs1, 2))
  geometry.computeVertexNormals()
  return geometry
}

function clothTop() {
  const width = table.length + clothEdge * 2
  const depth = table.width + clothEdge * 2
  const top = new PlaneGeometry(width, depth).rotateX(-Math.PI / 2)
  const position = top.getAttribute("position")
  const uvs: number[] = []
  const uvs1: number[] = []
  for (let index = 0; index < position.count; index += 1) {
    uvs.push(
      position.getX(index) / laceFieldMeters,
      position.getZ(index) / laceFieldMeters
    )
    uvs1.push(0, 4)
  }
  top.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  top.setAttribute("uv1", new Float32BufferAttribute(uvs1, 2))
  return top.translate(0, clothY, 0)
}

// The white lace tablecloth: its top and its fall, one mesh.
export function buildTablecloth() {
  return mergeParts(
    [clothTop(), clothSkirt()],
    ["position", "normal", "uv", "uv1"]
  )
}
