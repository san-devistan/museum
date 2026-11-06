import type { IkebanaVariant } from "@/museum/gallery/ikebana/_lib/ikebana-layout"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Texture,
} from "three"

const { botanical, color, palette } = sceneTokens

export const ikebanaMaterials = {
  chrome: new MeshStandardMaterial({
    color: color.chrome,
    metalness: 1,
    roughness: 0.08,
    flatShading: true,
    side: DoubleSide,
  }),
  stem: new MeshStandardMaterial({
    color: botanical.stem,
    roughness: 0.62,
  }),
  willow: new MeshStandardMaterial({
    color: botanical.willow,
    roughness: 0.78,
  }),
  lacquer: new MeshPhysicalMaterial({
    color: botanical.spathe,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    side: DoubleSide,
  }),
  crystal: new MeshPhysicalMaterial({
    color: color.crystal,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 0.012,
    ior: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    side: DoubleSide,
  }),
  spadix: new MeshStandardMaterial({
    color: botanical.blush,
    roughness: 0.55,
  }),
  petal: new MeshStandardMaterial({
    color: botanical.bloom,
    roughness: 0.72,
    vertexColors: true,
    side: DoubleSide,
  }),
  floret: new MeshStandardMaterial({
    color: botanical.bloom,
    roughness: 0.6,
  }),
  moss: new MeshStandardMaterial({
    color: palette.white,
    roughness: 1,
    flatShading: true,
    vertexColors: true,
  }),
  bead: new MeshPhysicalMaterial({
    color: botanical.bead,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  }),
} as const

const vesselMaterials = {
  porcelain: new MeshPhysicalMaterial({
    color: palette.white,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: DoubleSide,
  }),
  basin: new MeshPhysicalMaterial({
    color: palette.black,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    side: DoubleSide,
  }),
  celadon: new MeshPhysicalMaterial({
    color: botanical.blush,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    sheen: 0.4,
    sheenColor: palette.white,
    side: DoubleSide,
  }),
}

const variantVessels: Record<IkebanaVariant, MeshStandardMaterial> = {
  0: ikebanaMaterials.chrome,
  1: vesselMaterials.porcelain,
  2: vesselMaterials.basin,
  3: vesselMaterials.celadon,
}

export function vesselMaterial(variant: IkebanaVariant) {
  return variantVessels[variant]
}

export const reflectiveMaterials: readonly {
  material: MeshStandardMaterial
  intensity: number
}[] = [
  { material: ikebanaMaterials.chrome, intensity: 0.75 },
  { material: ikebanaMaterials.crystal, intensity: 0.9 },
  { material: ikebanaMaterials.lacquer, intensity: 0.35 },
  { material: ikebanaMaterials.bead, intensity: 0.4 },
  { material: vesselMaterials.porcelain, intensity: 0.5 },
  { material: vesselMaterials.basin, intensity: 0.6 },
  { material: vesselMaterials.celadon, intensity: 0.45 },
]

export function syncReflections(environment: Texture | null) {
  for (const { material, intensity } of reflectiveMaterials) {
    if (material.envMap !== environment) {
      material.envMap = environment
      material.envMapIntensity = intensity
      material.needsUpdate = true
    }
  }
}
