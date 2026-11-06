import { createRandom } from "@/museum/_lib/relief/height-field"
import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import { haloMaterial } from "@/museum/gallery/chandelier/_lib/chandelier-assets"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  type Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three"

const motes = 40

// Specks of scent rising from the stopper, each on its own phase.
export function buildShimmer(origin: Vector3) {
  const random = createRandom(67)
  const positions: number[] = []
  const seeds: number[] = []
  for (let index = 0; index < motes; index += 1) {
    const angle = random() * Math.PI * 2
    const reach = Math.sqrt(random()) * 0.05
    positions.push(
      origin.x + Math.cos(angle) * reach,
      origin.y + random() * 0.02,
      origin.z + Math.sin(angle) * reach
    )
    seeds.push(random())
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("seed", new Float32BufferAttribute(seeds, 1))
  return geometry
}

const rise = [
  "#include <begin_vertex>",
  "float lift = fract(manorTime * 0.05 + seed);",
  "float curl = manorTime * 0.6 + seed * 23.0 + lift * 5.0;",
  "transformed.y += lift * 0.55;",
  "transformed.x += sin(curl) * 0.03 * (0.3 + lift);",
  "transformed.z += cos(curl * 0.8) * 0.03 * (0.3 + lift);",
  "moteFade = sin(lift * 3.14159) * (0.55 + 0.45 * sin(manorTime * 2.1 + seed * 41.0));",
].join("\n")

function injectRise(parameters: WebGLProgramParametersWithUniforms) {
  parameters.uniforms.manorTime = manorTime
  parameters.vertexShader = parameters.vertexShader
    .replace(
      "#include <common>",
      "#include <common>\nattribute float seed;\nuniform float manorTime;\nvarying float moteFade;"
    )
    .replace("#include <begin_vertex>", rise)
  parameters.fragmentShader = parameters.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float moteFade;")
    .replace(
      "#include <color_fragment>",
      "#include <color_fragment>\ndiffuseColor.a *= moteFade;"
    )
}

// Faint additive motes in blush and white; they hang still under reduced
// motion because the manor clock stops.
export function createShimmerMaterial() {
  const material = new PointsMaterial({
    color: sceneTokens.props.perfume,
    map: haloMaterial.map,
    size: 0.024,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  })
  material.onBeforeCompile = injectRise
  material.customProgramCacheKey = () => "manor-scent-shimmer"
  return material
}
