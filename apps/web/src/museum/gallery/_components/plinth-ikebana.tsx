import type { IkebanaSpot } from "@/museum/gallery/_lib/manor-plan"
import { Ikebana } from "@/museum/gallery/ikebana/ikebana"

type ManorIkebanaProps = {
  spot: IkebanaSpot
}

// A living ikebana standing on its pedestal or on the dining table. It is
// décor, not an exhibit: no card, no focus.
export function ManorIkebana({ spot }: ManorIkebanaProps) {
  return (
    <group position={spot.position} rotation-y={spot.rotationY}>
      <Ikebana variant={spot.variant} living={spot.role} />
    </group>
  )
}
