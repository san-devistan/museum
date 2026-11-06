import { createRandom } from "@/museum/_lib/relief/height-field"
import type { Point3 } from "@/museum/gallery/_lib/room-bounds"
import { remnantAssets } from "@/museum/gallery/remnants/_lib/remnant-assets"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useLayoutEffect, useMemo, useRef } from "react"
import {
  Color,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from "three"

// Petals strewn from one point toward another, thinning out as they go.
export type PetalTrail = {
  from: Point3
  to: Point3
  count: number
  spread: number
  seed: number
}

export type FeatherSpec = {
  position: Point3
  turn: number
}

type RemnantsProps = {
  trails: readonly PetalTrail[]
  feathers: readonly FeatherSpec[]
}

const petalColors = [
  sceneTokens.palette.blush,
  sceneTokens.palette.blush,
  sceneTokens.palette.white,
  sceneTokens.manor.petal,
] as const

function scatter(trails: readonly PetalTrail[]) {
  const matrix = new Matrix4()
  const rotation = new Quaternion()
  const euler = new Euler()
  const scale = new Vector3()
  const matrices: number[] = []
  const colors: Color[] = []
  for (const trail of trails) {
    const random = createRandom(trail.seed)
    const from = new Vector3(...trail.from)
    const to = new Vector3(...trail.to)
    for (let index = 0; index < trail.count; index += 1) {
      const along = random() ** 1.6
      const point = from.clone().lerp(to, along)
      const spread = trail.spread * (1 - along * 0.6)
      point.x += (random() - 0.5) * spread
      point.z += (random() - 0.5) * spread
      euler.set(
        (random() - 0.5) * 0.5,
        random() * Math.PI * 2,
        (random() - 0.5) * 0.5
      )
      rotation.setFromEuler(euler)
      const size = 0.75 + random() * 0.5
      matrix.compose(point, rotation, scale.set(size, size, size))
      matrices.push(...matrix.elements)
      const pick = petalColors[Math.floor(random() * petalColors.length)]
      colors.push(new Color(pick ?? sceneTokens.manor.petal))
    }
  }
  return { matrices: new Float32Array(matrices), colors }
}

// Small signs someone was here: rose petals and a fallen black feather.
export function Remnants({ trails, feathers }: RemnantsProps) {
  const assets = remnantAssets()
  const petals = useMemo(() => scatter(trails), [trails])
  const petalRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = petalRef.current
    if (!mesh) {
      return undefined
    }
    mesh.instanceMatrix.array.set(petals.matrices)
    mesh.instanceMatrix.needsUpdate = true
    petals.colors.forEach((color, index) => mesh.setColorAt(index, color))
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
    mesh.computeBoundingSphere()
    return undefined
  }, [petals])

  return (
    <group>
      <instancedMesh
        ref={petalRef}
        args={[assets.petal, assets.petalMaterial, petals.colors.length]}
      />
      {feathers.map((feather) => (
        <mesh
          key={feather.position.join(":")}
          geometry={assets.feather}
          material={assets.featherMaterial}
          position={feather.position}
          rotation-y={feather.turn}
        />
      ))}
    </group>
  )
}
