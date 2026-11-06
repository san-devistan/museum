import { mergeParts, tinted } from "@/museum/gallery/props/_lib/prop-geometry"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  BufferGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  SphereGeometry,
  Vector2,
} from "three"

const { props, palette } = sceneTokens

export const cake = { radius: 0.11, height: 0.09 } as const

// The missing slice's opening, centred toward the front-left.
const gap = 0.9
const gapCentre = -Math.PI / 4

// Sponge and cream, bottom to top, as fractions of the cake's height.
const layers: readonly (readonly [from: number, to: number, color: string])[] =
  [
    [0, 0.28, props.sponge],
    [0.28, 0.38, props.candyPink],
    [0.38, 0.64, props.sponge],
    [0.64, 0.74, props.popYellow],
    [0.74, 0.94, props.sponge],
    [0.94, 1, props.candyPink],
  ]

const keep = ["position", "normal", "color"] as const

// One flat quad from the axis out to the rim, between two heights.
function band(angle: number, from: number, to: number, color: string) {
  const x = Math.sin(angle) * cake.radius
  const z = Math.cos(angle) * cake.radius
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [0, from, 0, x, from, z, x, to, z, 0, from, 0, x, to, z, 0, to, 0],
      3
    )
  )
  geometry.computeVertexNormals()
  return tinted(geometry, color)
}

// The two cut faces of the cake, showing its layers.
function cutFaces(angles: readonly number[]) {
  return angles.flatMap((angle) =>
    layers.map(([from, to, color]) =>
      band(angle, from * cake.height, to * cake.height, color)
    )
  )
}

const frosting = [
  [0, 0],
  [cake.radius, 0],
  [cake.radius + 0.002, 0.005],
  [cake.radius + 0.002, cake.height - 0.004],
  [cake.radius - 0.004, cake.height],
  [0, cake.height + 0.002],
] as const

function piping(radius: number, y: number, from: number, sweep: number) {
  const beads = Math.round((sweep * radius) / 0.011)
  return Array.from({ length: beads }, (_, index) => {
    const angle = from + ((index + 0.5) / beads) * sweep
    return tinted(
      new SphereGeometry(0.0065, 6, 4).translate(
        Math.sin(angle) * radius,
        y,
        Math.cos(angle) * radius
      ),
      props.popYellow
    )
  })
}

// A sugar flower: cupped petals round a pop-yellow heart.
function sugarFlower(
  at: { x: number; y: number; z: number },
  size: number,
  color: string
) {
  const petals = Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2
    return tinted(
      new SphereGeometry(1, 8, 5)
        .scale(size, size * 0.32, size * 0.55)
        .rotateZ(0.35)
        .translate(size * 0.85, size * 0.2, 0)
        .rotateY(angle)
        .translate(at.x, at.y, at.z),
      color
    )
  })
  const heart = tinted(
    new SphereGeometry(size * 0.38, 8, 6).translate(
      at.x,
      at.y + size * 0.25,
      at.z
    ),
    props.popYellow
  )
  return [...petals, heart]
}

const blooms = [
  { angle: 0, reach: 0, size: 0.03, color: props.candyPink },
  { angle: 0.6, reach: 0.068, size: 0.02, color: palette.blush },
  { angle: 1.7, reach: 0.072, size: 0.022, color: props.candyPink },
  { angle: 2.8, reach: 0.07, size: 0.019, color: props.cream },
  { angle: 3.9, reach: 0.07, size: 0.021, color: props.candyPink },
  { angle: 4.9, reach: 0.066, size: 0.018, color: palette.blush },
] as const

// The gâteau-fleur: candy-pink frosting, yellow piping, sugar flowers on
// top, and one slice gone. Vertex-coloured, so the cake is one draw.
export function buildFlowerCake() {
  const from = gapCentre + gap / 2
  const sweep = Math.PI * 2 - gap
  const body = tinted(
    new LatheGeometry(
      frosting.map(([radius, y]) => new Vector2(radius, y)),
      40,
      from,
      sweep
    ),
    props.candyPink
  )
  const flowers = blooms.flatMap(({ angle, reach, size, color }) =>
    sugarFlower(
      {
        x: Math.sin(gapCentre + Math.PI + angle * 0.4) * reach,
        y: cake.height,
        z: Math.cos(gapCentre + Math.PI + angle * 0.4) * reach,
      },
      size,
      color
    )
  )
  return mergeParts(
    [
      body,
      ...cutFaces([from, from + sweep]),
      ...piping(cake.radius + 0.004, 0.006, from, sweep),
      ...piping(cake.radius - 0.004, cake.height + 0.002, from, sweep),
      ...flowers,
    ],
    keep
  )
}

// The slice she took, left on her plate.
export function buildCakeSlice() {
  const wedge = gap * 0.85
  const curved = new LatheGeometry(
    [
      new Vector2(cake.radius, 0),
      new Vector2(cake.radius + 0.002, cake.height - 0.004),
      new Vector2(cake.radius - 0.004, cake.height),
      new Vector2(0, cake.height + 0.002),
    ],
    8,
    0,
    wedge
  )
  return mergeParts(
    [
      tinted(curved, props.candyPink),
      ...cutFaces([0, wedge]),
      ...sugarFlower(
        {
          x: Math.sin(wedge / 2) * 0.07,
          y: cake.height,
          z: Math.cos(wedge / 2) * 0.07,
        },
        0.016,
        props.candyPink
      ),
    ],
    keep
  )
}
