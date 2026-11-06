import { ikebanaAssets } from "@/museum/gallery/ikebana/_lib/ikebana-assets"
import type { IkebanaVariant } from "@/museum/gallery/ikebana/_lib/ikebana-layout"
import { ikebanaMaterials } from "@/museum/gallery/ikebana/_lib/ikebana-materials"
import {
  biteHead,
  createLivingState,
  headCenter,
  type LivingFrame,
  type LivingState,
} from "@/museum/gallery/ikebana/_lib/living-motion"
import type { LivingEntry } from "@/museum/gallery/ikebana/_lib/living-registry"
import type { LivingIkebanaRole } from "@/museum/gallery/ikebana/_lib/living-role"
import {
  createLivingUniforms,
  livingMaterial,
} from "@/museum/gallery/ikebana/_lib/living-shader"
import { feedingColors } from "@/museum/gallery/ikebana/_lib/living-tuning"
import { createPollen, type Pollen } from "@/museum/gallery/ikebana/_lib/pollen"
import {
  createTornPetals,
  hideTornPetals,
  tearPetal,
  type TornPetals,
} from "@/museum/gallery/ikebana/_lib/torn-petals"
import {
  Color,
  Vector3,
  Vector4,
  type Group,
  type InstancedMesh,
  type Material,
  type Texture,
} from "three"

export type LivingParts = {
  state: LivingState
  frame: LivingFrame
  // Where the partner head lands each frame, so the frame never allocates.
  partnerPoint: Vector3
  // Its scene objects, attached once mounted.
  group: Group | null
  petals: InstancedMesh | null
  materials: {
    stem: Material
    lacquer: Material
    crystal: Material
    spadix: Material
    petal: Material
    floret: Material
  }
  // Each living copy and the still material it follows for reflections.
  reflections: readonly { copy: Material; source: Material }[]
  pollen: Pollen | null
  torn: TornPetals | null
  dispose: () => void
}

function vesselClearance(variant: IkebanaVariant) {
  const { vessel } = ikebanaAssets(variant)
  vessel.computeBoundingBox()
  const box = vessel.boundingBox
  return box ? Math.max(box.max.x, box.max.z, -box.min.x, -box.min.z) : 0.15
}

function stamenAccent() {
  const color = new Color(feedingColors.yellow)
  return new Vector4(color.r, color.g, color.b, 1)
}

export function createLivingParts(
  variant: IkebanaVariant,
  role: LivingIkebanaRole
): LivingParts {
  const { heads } = ikebanaAssets(variant)
  const uniforms = createLivingUniforms(heads)
  const state = createLivingState(role, heads, uniforms)
  const living = { uniforms }
  const still = ikebanaMaterials
  const materials = {
    stem: livingMaterial(still.stem, living),
    lacquer: livingMaterial(still.lacquer, living),
    crystal: livingMaterial(still.crystal, living),
    spadix: livingMaterial(still.spadix, { uniforms, accent: stamenAccent() }),
    petal: livingMaterial(still.petal, living),
    floret: livingMaterial(still.floret, living),
  }
  const pollen = state.isTable ? createPollen(variant * 7 + 3) : null
  return {
    state,
    partnerPoint: new Vector3(),
    group: null,
    petals: null,
    frame: {
      delta: 0,
      time: 0,
      camera: new Vector3(),
      watched: 1,
      distance: Number.POSITIVE_INFINITY,
      isStill: false,
      isFeeding: false,
      isMidnight: false,
      partner: null,
    },
    materials,
    reflections: [
      { copy: materials.lacquer, source: still.lacquer },
      { copy: materials.crystal, source: still.crystal },
    ],
    pollen,
    torn:
      role === "table-left" ? createTornPetals(vesselClearance(variant)) : null,
    dispose: () => {
      for (const material of Object.values(materials)) {
        material.dispose()
      }
      pollen?.dispose()
    },
  }
}

type Reflective = Material & {
  envMap?: Texture | null
  envMapIntensity?: number
}

// The still materials get the scene's reflections; their living copies follow.
export function syncLivingReflections(parts: LivingParts) {
  for (let index = 0; index < parts.reflections.length; index += 1) {
    const pair = parts.reflections[index]
    if (!pair) {
      continue
    }
    const target: Reflective = pair.copy
    const from: Reflective = pair.source
    if (target.envMap !== from.envMap) {
      target.envMap = from.envMap ?? null
      target.envMapIntensity = from.envMapIntensity ?? 1
      target.needsUpdate = true
    }
  }
}

const torn = { from: new Vector3() }

// What this ikebana shows the other living ones.
export function livingEntry(parts: LivingParts): LivingEntry {
  const { state } = parts
  return {
    origin: (target) => {
      const { group } = parts
      return group
        ? target.setFromMatrixPosition(group.matrixWorld)
        : target.set(0, 0, 0)
    },
    reacher: () => state.reacher,
    headWorld: (index, target) => {
      headCenter(state, index, target)
      const { group } = parts
      return group ? target.applyMatrix4(group.matrixWorld) : target
    },
    bite: (index) => {
      biteHead(state, index)
      const color = state.tints[index]
      const mesh = parts.petals
      if (parts.torn && mesh && color) {
        headCenter(state, index, torn.from)
        tearPetal(parts.torn, mesh, { from: torn.from, color })
      }
    },
  }
}

type LivingObjects = {
  group: Group | null
  petals: InstancedMesh | null
}

// Hands the mounted scene objects to the frame loop; torn petals start hidden,
// in the double's colours. Returns the detach.
export function attachLiving(parts: LivingParts, objects: LivingObjects) {
  parts.group = objects.group
  parts.petals = objects.petals
  const color = parts.state.tints[0]
  if (objects.petals && color) {
    hideTornPetals(objects.petals, color)
  }
  return () => {
    parts.group = null
    parts.petals = null
  }
}
