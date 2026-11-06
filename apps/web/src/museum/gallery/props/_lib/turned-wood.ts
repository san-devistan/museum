import { lathe, type Profile } from "@/museum/gallery/props/_lib/prop-geometry"

// A furniture leg as fractions of its height and girth: bun foot, taper,
// a ring, then the square-ish block that meets the apron.
const legShape: Profile = [
  [0, 0],
  [0.7, 0],
  [0.9, 0.035],
  [0.82, 0.08],
  [0.55, 0.12],
  [0.48, 0.18],
  [0.56, 0.3],
  [0.7, 0.45],
  [0.76, 0.56],
  [0.65, 0.63],
  [0.88, 0.66],
  [0.88, 0.7],
  [0.65, 0.73],
  [0.76, 0.79],
  [1, 0.83],
  [1, 1],
  [0, 1],
]

export function turnedLeg(height: number, girth: number, segments = 14) {
  return lathe(
    legShape.map(([radius, y]) => [radius * girth, y * height] as const),
    segments
  )
}

// A round moulded foot for a standing pole.
export function turnedBase(radius: number, height: number) {
  return lathe(
    [
      [0, 0],
      [radius * 0.92, 0],
      [radius, height * 0.2],
      [radius * 0.96, height * 0.45],
      [radius * 0.7, height * 0.62],
      [radius * 0.36, height * 0.82],
      [radius * 0.22, height],
      [0, height],
    ],
    28
  )
}

function ring(at: number, girth: number): Profile {
  return [
    [girth * 1.1, at - girth * 1.6],
    [girth * 1.75, at - girth * 0.7],
    [girth * 1.75, at + girth * 0.7],
    [girth * 1.1, at + girth * 1.6],
  ]
}

// A slim column from `from` to `to` with turned rings at the given heights.
export function turnedPole(spec: {
  from: number
  to: number
  girth: number
  rings: readonly number[]
}) {
  const { from, to, girth, rings } = spec
  const profile: Profile = [
    [0, from],
    [girth * 1.5, from],
    [girth * 1.2, from + girth * 2],
    ...rings.flatMap((at) => ring(at, girth)),
    [girth * 1.2, to - girth * 1.5],
    [girth * 1.6, to - girth * 0.6],
    [girth * 1.3, to],
    [0, to],
  ]
  return lathe(profile, 14)
}

// A turned knob finial sitting on `at`.
export function finial(at: number, radius: number) {
  return lathe(
    [
      [0, at],
      [radius * 0.55, at],
      [radius * 0.4, at + radius * 0.5],
      [radius * 0.9, at + radius * 1.1],
      [radius, at + radius * 1.6],
      [radius * 0.75, at + radius * 2.2],
      [radius * 0.3, at + radius * 2.55],
      [0, at + radius * 2.7],
    ],
    16
  )
}
