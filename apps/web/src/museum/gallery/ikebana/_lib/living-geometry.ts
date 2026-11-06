import {
  Float32BufferAttribute,
  InstancedBufferAttribute,
  type BufferGeometry,
  type Vector3,
} from "three"

export type LivingHeadKind = "allium" | "bloom" | "spathe" | "crystal" | "calla"

// One flower head a living ikebana can close, turn and lean.
export type LivingHead = {
  id: string
  kind: LivingHeadKind
  // Stem tip: the head turns and shrinks around it.
  pivot: Vector3
  // The bud folds its petals in toward this axis.
  axis: Vector3
  // Where the open flower looks.
  face: Vector3
  // Middle of the open head.
  center: Vector3
  size: number
}

// Heads a living ikebana can drive; the shader's uniform arrays hold this many.
export const livingHeadLimit = 12

// How far a head may move away from its rest pose, for culling.
export const livingReach = 0.35

// Per-vertex `living` attribute: x is the head index (-1: none). y is -1 on
// the head itself, else how much a stem follows its head's lean (0 in the
// vessel, 1 at the tip).
export const livingAttribute = "living"

const onHead = -1

function filled(
  count: number,
  head: number,
  weight: (index: number) => number
) {
  const values = new Float32Array(count * 2)
  for (let index = 0; index < count; index += 1) {
    values[index * 2] = head
    values[index * 2 + 1] = weight(index)
  }
  return values
}

export function tagHead(geometry: BufferGeometry, head: number) {
  const count = geometry.getAttribute("position").count
  geometry.setAttribute(
    livingAttribute,
    new Float32BufferAttribute(
      filled(count, head, () => onHead),
      2
    )
  )
  return geometry
}

type StemTag = { head: number; segments: number; radialSegments: number }

// Tubes are built ring by ring from the vessel up, so the ring gives how far
// along the stem a vertex sits.
export function tagStem(
  geometry: BufferGeometry,
  { head, segments, radialSegments }: StemTag
) {
  const count = geometry.getAttribute("position").count
  const stride = radialSegments + 1
  const weight = (index: number) => {
    const along = Math.floor(index / stride) / segments
    return along * along
  }
  geometry.setAttribute(
    livingAttribute,
    new Float32BufferAttribute(filled(count, head, weight), 2)
  )
  return geometry
}

export function instanceHeads(heads: readonly number[]) {
  const values = new Float32Array(heads.length * 2)
  for (const [index, head] of heads.entries()) {
    values[index * 2] = head
    values[index * 2 + 1] = onHead
  }
  return new InstancedBufferAttribute(values, 2)
}

export function padBounds(geometry: BufferGeometry) {
  geometry.computeBoundingSphere()
  if (geometry.boundingSphere) {
    geometry.boundingSphere.radius += livingReach
  }
  return geometry
}
