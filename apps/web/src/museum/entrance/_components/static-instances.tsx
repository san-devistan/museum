import { useLayoutEffect, useRef } from "react"
import {
  InstancedBufferAttribute,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
} from "three"

export type Instances = {
  count: number
  matrices: Float32Array
  colors?: Float32Array
}

type StaticInstancesProps = {
  geometry: BufferGeometry
  material: Material
  instances: Instances
}

/** Repeated props that never move: one draw call, matrices written once. */
export function StaticInstances({
  geometry,
  material,
  instances,
}: StaticInstancesProps) {
  const meshRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) {
      return undefined
    }
    mesh.instanceMatrix.array.set(instances.matrices)
    mesh.instanceMatrix.needsUpdate = true
    if (instances.colors) {
      mesh.instanceColor = new InstancedBufferAttribute(instances.colors, 3)
    }
    mesh.computeBoundingSphere()
    return undefined
  }, [instances])

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, instances.count]} />
  )
}
