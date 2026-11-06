import { surfaceMaterial } from "@/museum/_lib/surface-materials"
import { ironMaterial } from "@/museum/gallery/chandelier/_lib/chandelier-assets"
import { asFabric } from "@/museum/gallery/props/_lib/fabric-shaders"
import {
  laceFieldTexture,
  laceHemTexture,
} from "@/museum/gallery/props/_lib/lace-textures"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from "three"

const { props, palette } = sceneTokens

function satin(color: string) {
  return new MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    sheen: 1,
    sheenRoughness: 0.3,
    sheenColor: new Color(palette.blush),
    side: DoubleSide,
  })
}

// Lace cut out of the field's openwork and the hem's scallops (second UV).
export function laceMaterial(color: string) {
  return new MeshStandardMaterial({
    color,
    map: laceHemTexture(),
    alphaMap: laceFieldTexture(),
    alphaTest: 0.3,
    alphaToCoverage: true,
    side: DoubleSide,
    roughness: 0.75,
  })
}

function createPropMaterials() {
  return {
    wood: surfaceMaterial("wood"),
    iron: ironMaterial,
    satin: satin(props.satin),
    satinBlush: satin(props.satinBlush),
    pearl: new MeshPhysicalMaterial({
      color: props.pearl,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      iridescence: 0.8,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [280, 620],
      sheen: 0.6,
      sheenColor: new Color(palette.blush),
    }),
    silver: new MeshStandardMaterial({
      color: props.silver,
      metalness: 1,
      roughness: 0.32,
    }),
    glass: new MeshPhysicalMaterial({
      color: props.glass,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      specularIntensity: 1,
      envMapIntensity: 3,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: DoubleSide,
    }),
    porcelain: new MeshPhysicalMaterial({
      color: props.porcelain,
      roughness: 0.3,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    }),
    linen: new MeshStandardMaterial({
      color: props.linen,
      roughness: 0.95,
      side: DoubleSide,
    }),
    velvet: new MeshPhysicalMaterial({
      color: props.velvet,
      roughness: 1,
      sheen: 1,
      sheenRoughness: 0.5,
      sheenColor: new Color(palette.blush).multiplyScalar(0.45),
    }),
    laceWhite: laceMaterial(props.laceWhite),
    capeLace: asFabric(laceMaterial(props.lace), {
      sway: {
        key: "cape",
        top: 1.5,
        length: 1.15,
        amount: [0.028, 0.02, 0.008],
      },
    }),
  }
}

let materials: ReturnType<typeof createPropMaterials> | null = null

// Materials every prop shares, built once on first use.
export function propMaterials() {
  materials ??= createPropMaterials()
  return materials
}
