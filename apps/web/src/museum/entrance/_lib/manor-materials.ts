import { paintNormalMap } from "@/museum/_lib/relief/height-field"
import { createTexture } from "@/museum/_lib/surface-texture"
import { paintWeathering } from "@/museum/entrance/_lib/facade-weathering"
import { facadeSkin } from "@/museum/entrance/_lib/manor-layout"
import {
  facadeCracks,
  facadeStreaks,
} from "@/museum/entrance/_lib/manor-weathering"
import {
  facadePixelMapper,
  paintAshlar,
  paintLimestone,
  putPixels,
  type AshlarSpec,
} from "@/museum/entrance/_lib/stone-painter"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Vector2,
  type WebGLProgramParametersWithUniforms,
} from "three"

const { facade, manor, palette } = sceneTokens

const facadeSize = { width: 1536, height: 1024 }

function createFacadeStone() {
  const spec: AshlarSpec = {
    size: facadeSize,
    meters: facadeSkin.tile,
    origin: [-facadeSkin.tile[0] / 2, 0],
    seed: 53,
    colors: {
      stone: facade.stone,
      shade: facade.stoneShade,
      mortar: facade.mortar,
      rust: facade.rust,
      lichen: facade.lichen,
    },
    cracks: facadeCracks,
  }
  const surface = paintAshlar(spec)
  const map = createTexture({
    ...facadeSize,
    meters: facadeSkin.tile,
    colorSpace: SRGBColorSpace,
    paint: (context) => {
      putPixels(context, surface)
      paintWeathering(context, {
        streaks: facadeStreaks,
        toPixel: facadePixelMapper(spec),
        colors: { grime: facade.grime, rust: facade.rust, damp: facade.damp },
        seed: 61,
      })
    },
  })
  const normalMap = createTexture({
    ...facadeSize,
    meters: facadeSkin.tile,
    colorSpace: NoColorSpace,
    paint: (context) =>
      paintNormalMap(context, { field: surface.field, strength: 5 }),
  })
  for (const texture of [map, normalMap]) {
    texture.offset.set(0.5, 0)
  }
  return new MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new Vector2(1.4, 1.4),
    roughness: 0.92,
  })
}

const limestoneSize = { width: 512, height: 512 }
const limestoneMeters = [1, 1] as const

function createLimestone() {
  const surface = paintLimestone({
    size: limestoneSize,
    seed: 37,
    colors: { base: facade.limestone, shade: facade.limestoneShade },
  })
  return new MeshStandardMaterial({
    map: createTexture({
      ...limestoneSize,
      meters: limestoneMeters,
      colorSpace: SRGBColorSpace,
      paint: (context) => putPixels(context, surface),
    }),
    normalMap: createTexture({
      ...limestoneSize,
      meters: limestoneMeters,
      colorSpace: NoColorSpace,
      paint: (context) =>
        paintNormalMap(context, { field: surface.field, strength: 4 }),
    }),
    roughness: 0.85,
  })
}

export const facadeStoneMaterial = createFacadeStone()

export const limestoneMaterial = createLimestone()

export const ironMaterial = new MeshStandardMaterial({
  color: facade.iron,
  metalness: 0.7,
  roughness: 0.42,
})

export const pearlMaterial = new MeshPhysicalMaterial({
  color: facade.pearl,
  roughness: 0.2,
  clearcoat: 1,
  clearcoatRoughness: 0.12,
  iridescence: 0.8,
  iridescenceIOR: 1.5,
  iridescenceThicknessRange: [280, 620],
  sheen: 0.6,
  sheenColor: new Color(palette.blush),
})

export const satinMaterial = new MeshPhysicalMaterial({
  color: manor.satin,
  roughness: 0.34,
  sheen: 1,
  sheenRoughness: 0.3,
  sheenColor: new Color(palette.blush),
})

export const vineMaterial = new MeshStandardMaterial({
  color: facade.vine,
  roughness: 0.88,
})

export const leafMaterial = new MeshStandardMaterial({
  color: facade.leaf,
  roughness: 0.8,
  side: DoubleSide,
})

export const roseMaterial = new MeshPhysicalMaterial({
  roughness: 0.62,
  sheen: 0.45,
  sheenRoughness: 0.5,
  sheenColor: new Color(palette.blush),
})

export const lanternGlassMaterial = new MeshStandardMaterial({
  color: manor.frost,
  emissive: facade.candle,
  emissiveIntensity: 0.55,
  transparent: true,
  opacity: 0.42,
  roughness: 0.18,
  depthWrite: false,
})

export const waxMaterial = new MeshStandardMaterial({
  color: manor.wax,
  emissive: facade.candle,
  emissiveIntensity: 0.3,
  roughness: 0.6,
})

export const flameMaterial = new MeshBasicMaterial({
  color: facade.flame,
  toneMapped: false,
})

/** Elapsed time fed to the curtain sway; frozen when motion is reduced. */
export const curtainSway = { value: 0 }

function injectSway(parameters: WebGLProgramParametersWithUniforms) {
  parameters.uniforms.curtainSway = curtainSway
  parameters.vertexShader = parameters.vertexShader
    .replace(
      "#include <common>",
      "#include <common>\nuniform float curtainSway;"
    )
    .replace(
      "#include <begin_vertex>",
      [
        "#include <begin_vertex>",
        "float curtainHang = 1.0 - uv.y;",
        "float curtainWave = sin(curtainSway * 0.8 + position.x * 2.3 + uv.y * 5.0)",
        "  + 0.5 * sin(curtainSway * 1.9 + position.x * 4.1 - uv.y * 3.0);",
        "transformed.x += curtainWave * 0.014 * curtainHang * curtainHang;",
      ].join("\n")
    )
}

export function createCurtainMaterial(
  map: MeshBasicMaterial["map"]
): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ map })
  material.onBeforeCompile = injectSway
  material.customProgramCacheKey = () => "manor-curtain"
  return material
}
