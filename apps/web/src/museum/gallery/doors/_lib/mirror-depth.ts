import { BufferAttribute, type BufferGeometry } from "three"

// A copy of a geometry reflected through the plane z = centerZ, so a door's
// front ornament can be carved on its back too. Reflection turns faces
// inside out; swapping two corners of each triangle turns them back.
export function mirrorDepth(geometry: BufferGeometry, centerZ: number) {
  const mirrored = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  mirrored.scale(1, 1, -1).translate(0, 0, centerZ * 2)
  for (const attribute of Object.values(mirrored.attributes)) {
    if (!(attribute instanceof BufferAttribute)) {
      continue
    }
    const { array, itemSize } = attribute
    for (let first = 0; first + 2 < attribute.count; first += 3) {
      const b = (first + 1) * itemSize
      const c = (first + 2) * itemSize
      for (let component = 0; component < itemSize; component += 1) {
        const value = array[b + component] ?? 0
        array[b + component] = array[c + component] ?? 0
        array[c + component] = value
      }
    }
    attribute.needsUpdate = true
  }
  return mirrored
}
