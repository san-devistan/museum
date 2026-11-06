import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import type { Material, WebGLProgramParametersWithUniforms } from "three"

// A hanging fabric's slow drift: nothing moves above `top`, and the hem
// (`length` below it) drifts the most. Amounts are metres: side to side,
// front to back, and a ripple running round the folds.
export type SwaySpec = {
  key: string
  top: number
  length: number
  amount: readonly [x: number, z: number, ripple: number]
  speed?: number
}

function float(value: number) {
  return value.toFixed(4)
}

function swayChunk({ top, length, amount, speed = 1 }: SwaySpec) {
  const [x, z, ripple] = amount
  return [
    "#include <begin_vertex>",
    `float hang = clamp((${float(top)} - position.y) / ${float(length)}, 0.0, 1.0);`,
    "hang *= hang;",
    `float swayTime = manorTime * ${float(speed)};`,
    "float swayPhase = position.y * 1.7;",
    "#ifdef USE_INSTANCING",
    "swayPhase += instanceMatrix[3].x * 1.3 + instanceMatrix[3].z * 0.7;",
    "#endif",
    `transformed.x += sin(swayTime * 0.55 + swayPhase) * ${float(x)} * hang;`,
    `transformed.z += sin(swayTime * 0.41 + swayPhase * 0.8 + 1.3) * ${float(z)} * hang;`,
    "vec2 swayOut = normalize(position.xz + vec2(1e-4));",
    `transformed.xz += swayOut * sin(swayTime * 1.3 + atan(position.x, position.z) * 4.0 + swayPhase) * ${float(ripple)} * hang;`,
  ].join("\n")
}

const facingChunk = [
  "#include <normal_fragment_maps>",
  "float sheer = abs(dot(normal, normalize(vViewPosition)));",
  "diffuseColor.a *= mix(1.0, 0.36, sheer);",
].join("\n")

type FabricSpec = { sway?: SwaySpec; isSheer?: boolean }

// Hangs fabric on the manor clock (so it stops under reduced motion) and,
// for tulle, thickens it where it turns away from the eye.
export function asFabric<T extends Material>(material: T, spec: FabricSpec) {
  const { sway, isSheer = false } = spec
  material.onBeforeCompile = (
    parameters: WebGLProgramParametersWithUniforms
  ) => {
    if (sway) {
      parameters.uniforms.manorTime = manorTime
      parameters.vertexShader = parameters.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float manorTime;"
        )
        .replace("#include <begin_vertex>", swayChunk(sway))
    }
    if (isSheer) {
      parameters.fragmentShader = parameters.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        facingChunk
      )
    }
  }
  material.customProgramCacheKey = () =>
    `manor-fabric-${sway?.key ?? "still"}-${String(isSheer)}`
  return material
}
