import { createRandom } from "@/museum/_lib/relief/height-field"
import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  NoColorSpace,
  RedFormat,
  RepeatWrapping,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from "three"

export const pileShells = 14
export const pileHeight = 0.018
const tuftsSize = 256
const tuftsPerMeter = 1.8

function createTuftTexture(seed: number) {
  const random = createRandom(seed)
  const data = new Uint8Array(tuftsSize * tuftsSize)
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.round(random() ** 0.6 * 255)
  }
  const texture = new DataTexture(data, tuftsSize, tuftsSize, RedFormat)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.colorSpace = NoColorSpace
  texture.needsUpdate = true
  return texture
}

const tuftTexture = createTuftTexture(29)

function injectPile(shell: number) {
  const level = shell / pileShells
  return (parameters: WebGLProgramParametersWithUniforms) => {
    parameters.uniforms.pileTufts = { value: tuftTexture }
    parameters.uniforms.pileLevel = { value: level }
    parameters.uniforms.pileDensity = { value: tuftsPerMeter }
    parameters.vertexShader = parameters.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vPileUv;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvPileUv = uv;")
    parameters.fragmentShader = parameters.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vPileUv;\nuniform sampler2D pileTufts;\nuniform float pileLevel;\nuniform float pileDensity;"
      )
      .replace(
        "#include <alphatest_fragment>",
        [
          "float pileTuft = texture2D(pileTufts, vPileUv * pileDensity).r;",
          "if (pileTuft < pileLevel) discard;",
          "diffuseColor.rgb *= mix(0.35, 1.05, pileLevel) * mix(0.8, 1.15, pileTuft);",
        ].join("\n")
      )
  }
}

export function createPileMaterials(map: Texture | null) {
  return Array.from({ length: pileShells }, (_, index) => {
    const shell = index + 1
    const material = new MeshStandardMaterial({
      map,
      roughness: 1,
    })
    material.onBeforeCompile = injectPile(shell)
    material.customProgramCacheKey = () => "carpet-pile"
    return { shell, material, y: (shell / pileShells) * pileHeight }
  })
}
