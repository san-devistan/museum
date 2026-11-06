import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import {
  curtainLaceTexture,
  rainTexture,
  skyTexture,
} from "@/museum/gallery/windows/_lib/window-textures"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type WebGLProgramParametersWithUniforms,
} from "three"

const { manor } = sceneTokens

function injectSway(parameters: WebGLProgramParametersWithUniforms) {
  parameters.uniforms.manorTime = manorTime
  parameters.vertexShader = parameters.vertexShader
    .replace(
      "#include <common>",
      "#include <common>\nattribute vec3 swayDirection;\nuniform float manorTime;"
    )
    .replace(
      "#include <begin_vertex>",
      [
        "#include <begin_vertex>",
        "float draft = sin(manorTime * 0.83 + position.y * 1.6 + (position.x + position.z) * 0.7) * 0.6",
        "  + sin(manorTime * 1.97 + position.y * 3.4) * 0.25 + 0.35;",
        "transformed += swayDirection * draft * 0.09;",
      ].join("\n")
    )
}

function createCurtainMaterial() {
  const material = new MeshStandardMaterial({
    color: manor.satin,
    emissive: manor.frost,
    emissiveIntensity: 0.07,
    alphaMap: curtainLaceTexture(),
    transparent: true,
    opacity: 0.85,
    side: DoubleSide,
    depthWrite: false,
    roughness: 0.85,
  })
  material.onBeforeCompile = injectSway
  material.customProgramCacheKey = () => "manor-curtain"
  return material
}

function createWindowMaterials() {
  return {
    moonlitGlass: new MeshBasicMaterial({ map: skyTexture(true) }),
    shadedGlass: new MeshBasicMaterial({ map: skyTexture(false) }),
    rain: new MeshBasicMaterial({
      color: manor.frost,
      map: rainTexture(),
      transparent: true,
      opacity: 0.22,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
    curtain: createCurtainMaterial(),
    satin: new MeshStandardMaterial({
      color: manor.satin,
      emissive: manor.satin,
      emissiveIntensity: 0.04,
      roughness: 0.3,
    }),
  }
}

let materials: ReturnType<typeof createWindowMaterials> | null = null

export function windowMaterials() {
  materials ??= createWindowMaterials()
  return materials
}
