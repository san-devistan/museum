import type { BufferGeometry, Material } from "three"

type IkebanaPartProps = {
  geometry: BufferGeometry | null
  material: Material
}

export function IkebanaPart({ geometry, material }: IkebanaPartProps) {
  return geometry ? <mesh geometry={geometry} material={material} /> : null
}
