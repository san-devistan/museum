import { surfaceMaterial } from "@/museum/_lib/surface-materials"
import { benchFrame, type BenchSpec } from "@/museum/gallery/_lib/room-solids"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import {
  Color,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
  type InstancedMesh,
} from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

// Turned leg, from the floor up to the apron: bun foot, taper, ring, block.
const legProfile: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.024, 0],
  [0.03, 0.012],
  [0.028, 0.028],
  [0.018, 0.04],
  [0.016, 0.06],
  [0.019, 0.1],
  [0.024, 0.15],
  [0.026, 0.19],
  [0.022, 0.215],
  [0.03, 0.226],
  [0.03, 0.238],
  [0.022, 0.248],
  [0.026, 0.268],
  [0.034, 0.28],
  [0.034, benchFrame.legHeight],
  [0, benchFrame.legHeight],
]

function createBenchAssets() {
  return {
    leg: new LatheGeometry(
      legProfile.map(([radius, y]) => new Vector2(radius, y)),
      16
    ),
    button: new SphereGeometry(0.014, 10, 6).scale(1, 0.55, 1),
    buttonMaterial: new MeshStandardMaterial({
      color: new Color(sceneTokens.palette.blush).multiplyScalar(0.62),
      roughness: 0.45,
    }),
  }
}

let assets: ReturnType<typeof createBenchAssets> | null = null

function benchAssets() {
  assets ??= createBenchAssets()
  return assets
}

const corners = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

const tuftRows = 2
const tuftColumns = 7

// Diamond-set buttons pulling the velvet down on top of each cushion.
function tuftMatrices(benches: readonly BenchSpec[]) {
  const top =
    benchFrame.legHeight + benchFrame.apronHeight + benchFrame.cushionHeight
  const matrix = new Matrix4()
  const matrices: number[] = []
  for (const bench of benches) {
    const usableX = bench.width - benchFrame.cushionInset * 2 - 0.3
    const usableZ = bench.depth - benchFrame.cushionInset * 2 - 0.2
    for (let row = 0; row < tuftRows; row += 1) {
      for (let column = 0; column < tuftColumns - row; column += 1) {
        const x =
          bench.x -
          usableX / 2 +
          ((column + row * 0.5) / (tuftColumns - 1)) * usableX
        const z = bench.z - usableZ / 2 + (row / (tuftRows - 1)) * usableZ
        matrix.makeTranslation(x, top - 0.006, z)
        matrices.push(...matrix.elements)
      }
    }
  }
  return new Float32Array(matrices)
}

function cushionGeometry(bench: BenchSpec) {
  return new RoundedBoxGeometry(
    bench.width - benchFrame.cushionInset * 2,
    benchFrame.cushionHeight,
    bench.depth - benchFrame.cushionInset * 2,
    3,
    0.035
  )
}

type BenchDetailsProps = {
  benches: readonly BenchSpec[]
}

// What the bench solids can't be: turned dark-wood legs and a rounded,
// buttoned velvet cushion.
export function BenchDetails({ benches }: BenchDetailsProps) {
  const { leg, button, buttonMaterial } = benchAssets()
  const wood = surfaceMaterial("wood")
  const velvet = surfaceMaterial("cushion")
  const tufts = useMemo(() => tuftMatrices(benches), [benches])
  const cushions = useMemo(() => benches.map(cushionGeometry), [benches])
  const tuftRef = useRef<InstancedMesh>(null)
  const cushionY =
    benchFrame.legHeight + benchFrame.apronHeight + benchFrame.cushionHeight / 2

  useEffect(
    () => () => {
      for (const cushion of cushions) {
        cushion.dispose()
      }
    },
    [cushions]
  )

  useLayoutEffect(() => {
    const mesh = tuftRef.current
    if (!mesh) {
      return undefined
    }
    mesh.instanceMatrix.array.set(tufts)
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    return undefined
  }, [tufts])

  return (
    <group>
      {benches.map((bench, index) => (
        <mesh
          key={bench.id}
          geometry={cushions[index]}
          material={velvet}
          position={[bench.x, cushionY - 0.004, bench.z]}
        />
      ))}
      {benches.flatMap((bench) =>
        corners.map(([sideX, sideZ]) => (
          <mesh
            key={`${bench.id}-${sideX}-${sideZ}`}
            geometry={leg}
            material={wood}
            position={[
              bench.x + sideX * (bench.width / 2 - benchFrame.legInset),
              0,
              bench.z + sideZ * (bench.depth / 2 - benchFrame.legInset),
            ]}
          />
        ))
      )}
      <instancedMesh
        ref={tuftRef}
        args={[button, buttonMaterial, tufts.length / 16]}
      />
    </group>
  )
}
