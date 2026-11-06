import { BufferGeometry, Float32BufferAttribute } from "three"

// The dressmaker's form: its torso starts at the hips on the pole.
export const dressForm = {
  hipY: 0.86,
  waistY: 0.86 + 0.3,
  neckY: 0.86 + 0.685,
  neckTop: 0.86 + 0.75,
  neckRadius: 0.045,
} as const

type Section = {
  y: number
  x: number
  z: number
  bust: number
}

// Cross-sections up the torso (above the hips): half-width, half-depth and
// how far the bust pushes forward.
const sections: readonly Section[] = [
  { y: 0, x: 0.165, z: 0.12, bust: 0 },
  { y: 0.06, x: 0.178, z: 0.13, bust: 0 },
  { y: 0.13, x: 0.18, z: 0.13, bust: 0 },
  { y: 0.22, x: 0.16, z: 0.115, bust: 0 },
  { y: 0.3, x: 0.132, z: 0.1, bust: 0 },
  { y: 0.38, x: 0.14, z: 0.106, bust: 0.004 },
  { y: 0.46, x: 0.158, z: 0.118, bust: 0.022 },
  { y: 0.52, x: 0.162, z: 0.116, bust: 0.02 },
  { y: 0.58, x: 0.172, z: 0.1, bust: 0.006 },
  { y: 0.62, x: 0.178, z: 0.088, bust: 0 },
  { y: 0.65, x: 0.152, z: 0.074, bust: 0 },
  { y: 0.672, x: 0.095, z: 0.06, bust: 0 },
  { y: 0.685, x: 0.052, z: 0.048, bust: 0 },
]

function smooth(value: number) {
  return value * value * (3 - 2 * value)
}

// The torso's section at a height above the hips, eased between rows.
export function sectionAt(height: number): Section | null {
  const first = sections[0]
  const last = sections.at(-1)
  if (!first || !last || height < first.y || height > last.y) {
    return null
  }
  for (let index = 1; index < sections.length; index += 1) {
    const upper = sections[index]
    const lower = sections[index - 1]
    if (upper && lower && height <= upper.y) {
      const k = smooth((height - lower.y) / (upper.y - lower.y))
      return {
        y: height,
        x: lower.x + (upper.x - lower.x) * k,
        z: lower.z + (upper.z - lower.z) * k,
        bust: lower.bust + (upper.bust - lower.bust) * k,
      }
    }
  }
  return null
}

export function sectionPoint(section: Section, angle: number) {
  const forward = Math.max(0, Math.cos(angle))
  return {
    x: Math.sin(angle) * section.x,
    z: Math.cos(angle) * section.z + section.bust * forward * forward,
  }
}

// Distance from the pole to the torso's surface at a world height.
export function torsoReach(y: number, angle: number) {
  const section = sectionAt(y - dressForm.hipY)
  if (!section) {
    return 0
  }
  const point = sectionPoint(section, angle)
  return Math.hypot(point.x, point.z)
}

export type ShellPoint = { x: number; y: number; z: number }

type ShellSpec = {
  rows: number
  columns: number
  point: (t: number, angle: number) => ShellPoint
  uv?: (t: number, angle: number, point: ShellPoint) => readonly number[]
}

// A closed tube of fabric, row by row from its top, round the pole.
export function shellGeometry({ rows, columns, point, uv }: ShellSpec) {
  const positions: number[] = []
  const uvs: number[] = []
  const uvs1: number[] = []
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows
    for (let column = 0; column <= columns; column += 1) {
      const angle = (column / columns) * Math.PI * 2
      const at = point(t, angle)
      positions.push(at.x, at.y, at.z)
      const [u = 0, v = 0, u1 = 0, v1 = 0] = uv?.(t, angle, at) ?? []
      uvs.push(u, v)
      uvs1.push(u1, v1)
    }
  }
  const indices: number[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column
      const b = a + 1
      const c = a + columns + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
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
