import type { InstanceSet } from "@/museum/gallery/ikebana/_lib/ikebana-assets"
import type { BufferGeometry, Material } from "three"

type IkebanaInstancesProps = {
  geometry: BufferGeometry
  material: Material
  set: InstanceSet
}

export function IkebanaInstances({
  geometry,
  material,
  set,
}: IkebanaInstancesProps) {
  return (
    <instancedMesh args={[set.geometry ?? geometry, material, set.count]}>
      <instancedBufferAttribute
        attach="instanceMatrix"
        args={[set.matrices, 16]}
      />
      {set.colors ? (
        <instancedBufferAttribute
          attach="instanceColor"
          args={[set.colors, 3]}
        />
      ) : null}
    </instancedMesh>
  )
}
