import { surfaceMaterial } from "@/museum/_lib/surface-materials"
import type { WallMount } from "@/museum/gallery/_lib/wall-gaps"
import {
  decayCells,
  decayTexture,
  type DecayCell,
} from "@/museum/gallery/decay/_lib/decay-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useEffect, useMemo } from "react"
import {
  BackSide,
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  type Material,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

// A patch of damage on a wall; the mount's y is the patch's centre.
export type DecaySpec = {
  mount: WallMount
  cell: DecayCell
  width: number
  height: number
}

// A strip of wallpaper come loose, hanging from `mount` and curling out.
export type PeelSpec = {
  mount: WallMount
  width: number
  length: number
}

function mountMatrix(mount: WallMount) {
  return new Matrix4()
    .makeRotationY(mount.rotationY)
    .setPosition(...mount.position)
}

function decalGeometry(spec: DecaySpec) {
  const plane = new PlaneGeometry(spec.width, spec.height)
  const uv = plane.getAttribute("uv")
  const { u, width } = decayCells[spec.cell]
  for (let index = 0; index < uv.count; index += 1) {
    uv.setX(index, u + uv.getX(index) * width)
  }
  return plane.translate(0, 0, 0.004).applyMatrix4(mountMatrix(spec.mount))
}

const curlSteps = 24
const curlColumns = 6

// Hangs flat for its first third, then rolls away from the wall.
function peelGeometry(spec: PeelSpec) {
  const positions: number[] = []
  const uvs: number[] = []
  for (let step = 0; step <= curlSteps; step += 1) {
    const t = step / curlSteps
    const bend = Math.max(0, t - 0.35) / 0.65
    const angle = bend * bend * 2.4
    const radius = spec.length * 0.32
    const flat = Math.min(t, 0.35) * spec.length
    const y = -flat - Math.sin(angle) * radius
    const z = 0.006 + (1 - Math.cos(angle)) * radius
    for (let column = 0; column <= curlColumns; column += 1) {
      const s = column / curlColumns
      const twist = (s - 0.5) * bend * 0.08
      positions.push((s - 0.5) * spec.width, y + twist, z + twist * 0.5)
      uvs.push(s * spec.width, spec.mount.position[1] + y)
    }
  }
  const indices: number[] = []
  for (let step = 0; step < curlSteps; step += 1) {
    for (let column = 0; column < curlColumns; column += 1) {
      const a = step * (curlColumns + 1) + column
      const b = a + 1
      const c = a + curlColumns + 1
      indices.push(a, c, b, b, c, c + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  return geometry.applyMatrix4(mountMatrix(spec.mount))
}

function merge(parts: BufferGeometry[]) {
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  return merged
}

function createDecayMaterials() {
  const texture = decayTexture()
  return {
    decal: new MeshStandardMaterial({
      map: texture,
      emissive: sceneTokens.manor.stain,
      emissiveMap: texture,
      emissiveIntensity: 0.025,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      roughness: 1,
    }),
    paperBack: new MeshStandardMaterial({
      color: sceneTokens.manor.plaster,
      roughness: 1,
      side: BackSide,
    }),
  }
}

let materials: ReturnType<typeof createDecayMaterials> | null = null

function decayMaterials() {
  materials ??= createDecayMaterials()
  return materials
}

type WallDecayProps = {
  patches: readonly DecaySpec[]
  peels: readonly PeelSpec[]
  // The room's wallpaper, so a curl shows the same damask.
  paper?: Material
}

// Water stains, bare plaster and wallpaper peeling off in long curls.
export function WallDecay({
  patches,
  peels,
  paper = surfaceMaterial("wallpaper"),
}: WallDecayProps) {
  const geometry = useMemo(
    () => ({
      patches: merge(patches.map(decalGeometry)),
      peels: merge(peels.map(peelGeometry)),
    }),
    [patches, peels]
  )
  const { decal, paperBack } = decayMaterials()

  useEffect(
    () => () => {
      geometry.patches.dispose()
      geometry.peels.dispose()
    },
    [geometry]
  )

  return (
    <group>
      <mesh geometry={geometry.patches} material={decal} renderOrder={1} />
      <mesh geometry={geometry.peels} material={paper} />
      <mesh geometry={geometry.peels} material={paperBack} />
    </group>
  )
}
