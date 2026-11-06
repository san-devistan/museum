import type { PropSpot } from "@/museum/gallery/props/_lib/prop-spots"
import {
  drapeKinds,
  type DrapeKind,
} from "@/museum/gallery/props/dress-form/_lib/dress-form-geometry"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { Color, Euler, Matrix4, Quaternion, Vector3 } from "three"

const { props, palette } = sceneTokens

const tulles = [
  props.tulleWhite,
  props.tulleBlush,
  props.tulleBlack,
  props.tulleFrost,
] as const

export type DressFormLook = {
  drape: DrapeKind
  tulle: string
  accent: "collar" | "ribbon"
  accentColor: string
}

function accentColor(seed: number, tulle: string, isCollar: boolean) {
  if (tulle === props.tulleBlack) {
    return isCollar ? props.laceWhite : props.satinBlush
  }
  if (isCollar) {
    return seed % 4 === 0 ? props.lace : props.laceWhite
  }
  return seed % 4 === 1 ? palette.black : palette.wine
}

// Seeds 0 to 5 give six different forms: each drape twice, every tulle
// colour, collars and ribbons in turn.
export function dressFormLook(seed: number): DressFormLook {
  const n = Math.abs(Math.round(seed))
  const tulle = tulles[(n * 3 + 1) % tulles.length] ?? props.tulleWhite
  const isCollar = n % 2 === 0
  return {
    drape: drapeKinds[n % drapeKinds.length] ?? "gown",
    tulle,
    accent: isCollar ? "collar" : "ribbon",
    accentColor: accentColor(n, tulle, isCollar),
  }
}

export type InstanceBatch = { matrices: Float32Array; colors: Color[] }

export type DressFormLayout = {
  forms: InstanceBatch
  drapes: Record<DrapeKind, InstanceBatch>
  collars: InstanceBatch
  sashes: InstanceBatch
}

function emptyBatch(): { matrices: number[]; colors: Color[] } {
  return { matrices: [], colors: [] }
}

function sealed(batch: { matrices: number[]; colors: Color[] }) {
  return { matrices: Float32Array.from(batch.matrices), colors: batch.colors }
}

// Sorts every form's parts into the instanced batches they draw with.
export function layoutDressForms(spots: readonly PropSpot[]): DressFormLayout {
  const matrix = new Matrix4()
  const turn = new Quaternion()
  const euler = new Euler()
  const one = new Vector3(1, 1, 1)
  const forms = emptyBatch()
  const drapes = {
    gown: emptyBatch(),
    "high-low": emptyBatch(),
    veil: emptyBatch(),
  }
  const collars = emptyBatch()
  const sashes = emptyBatch()
  spots.forEach((spot, index) => {
    const look = dressFormLook(spot.seed ?? index)
    euler.set(0, spot.rotationY, 0)
    turn.setFromEuler(euler)
    matrix.compose(new Vector3(...spot.position), turn, one)
    const elements = matrix.elements
    forms.matrices.push(...elements)
    forms.colors.push(new Color(palette.white))
    drapes[look.drape].matrices.push(...elements)
    drapes[look.drape].colors.push(new Color(look.tulle))
    const accent = look.accent === "collar" ? collars : sashes
    accent.matrices.push(...elements)
    accent.colors.push(new Color(look.accentColor))
  })
  return {
    forms: sealed(forms),
    drapes: {
      gown: sealed(drapes.gown),
      "high-low": sealed(drapes["high-low"]),
      veil: sealed(drapes.veil),
    },
    collars: sealed(collars),
    sashes: sealed(sashes),
  }
}
