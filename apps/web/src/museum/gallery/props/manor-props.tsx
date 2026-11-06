import { useReducedMotion } from "@/museum/gallery/_hooks/use-reduced-motion"
import type { PropId, PropSpot } from "@/museum/gallery/props/_lib/prop-spots"
import { BenchRibbon } from "@/museum/gallery/props/bench-ribbon/bench-ribbon"
import { Birdcage } from "@/museum/gallery/props/birdcage/birdcage"
import { CapeStand } from "@/museum/gallery/props/cape-stand/cape-stand"
import { DiningTable } from "@/museum/gallery/props/dining-table/dining-table"
import { DressForms } from "@/museum/gallery/props/dress-form/dress-forms"
import { PaleMark } from "@/museum/gallery/props/pale-mark/pale-mark"
import { PerfumeConsole } from "@/museum/gallery/props/perfume-console/perfume-console"
import { Vanity } from "@/museum/gallery/props/vanity/vanity"
import { useMemo, type ComponentType } from "react"

type ManorPropsProps = {
  spots: readonly PropSpot[]
}

type SingleProp = Exclude<PropId, "dress-form">

type PropProps = { isStill: boolean }

const singles: Record<SingleProp, ComponentType<PropProps>> = {
  "cape-stand": CapeStand,
  "perfume-console": PerfumeConsole,
  birdcage: Birdcage,
  "bench-ribbon": BenchRibbon,
  vanity: Vanity,
  "dining-table": DiningTable,
  "pale-mark": PaleMark,
}

function isSingle(spot: PropSpot): spot is PropSpot & { id: SingleProp } {
  return spot.id !== "dress-form"
}

function spotKey(spot: PropSpot) {
  return `${spot.id}:${spot.position.join(":")}`
}

// Madame's furniture and traces, each at its spot, front (+z) turned by
// rotationY. Repeated dress forms share instanced meshes.
export function ManorProps({ spots }: ManorPropsProps) {
  const isStill = useReducedMotion()
  const dressForms = useMemo(
    () => spots.filter((spot) => spot.id === "dress-form"),
    [spots]
  )
  return (
    <group>
      {spots.filter(isSingle).map((spot) => {
        const Prop = singles[spot.id]
        return (
          <group
            key={spotKey(spot)}
            position={[...spot.position]}
            rotation-y={spot.rotationY}
          >
            <Prop isStill={isStill} />
          </group>
        )
      })}
      {dressForms.length > 0 ? <DressForms spots={dressForms} /> : null}
    </group>
  )
}
