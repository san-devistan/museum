import type { SatinTone } from "@/museum/entrance/_lib/satin-sweep"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { Color, MeshPhysicalMaterial } from "three"

// Ivory satin: a soft highlight stretched along the weave (anisotropy), a
// blush sheen at grazing angles, and blush in the folds (vertex colours).

const { color, facade, palette, props } = sceneTokens

/** The satin's own look, shared by every ribbon in the manor (ivory). */
export const satinLook = {
  color: new Color(facade.pearl),
  roughness: 0.3,
  anisotropy: 0.8,
  anisotropyRotation: 0,
  sheen: 0.35,
  sheenRoughness: 0.5,
  sheenColor: new Color(palette.blush),
  specularIntensity: 0.9,
  // The room reflection stretched along the weave is most of the satin's
  // gleam on a dark night.
  envMapIntensity: 3,
  emissive: new Color(color.eyelet),
  emissiveIntensity: 0,
}

/** Lit ivory to the blush of its deepest folds, both linear. */
export const satinTone: SatinTone = {
  light: new Color(facade.pearl),
  shade: new Color(props.puff).lerp(new Color(palette.wine), 0.18),
}

// The vertex colours carry the ivory, so these start from white.
const bakedLook = { ...satinLook, color: new Color(palette.white) }

/** The door's ribbon: shaded through its vertex colours, faded as it unties. */
export const doorSatinMaterial = new MeshPhysicalMaterial({
  ...bakedLook,
  vertexColors: true,
  transparent: true,
})

/** The untied ribbon lying on the threshold: the same satin, never faded. */
export const restingSatinMaterial = new MeshPhysicalMaterial({
  ...bakedLook,
  vertexColors: true,
})
