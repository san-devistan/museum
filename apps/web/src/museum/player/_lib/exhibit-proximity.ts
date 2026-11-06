import type {
  ArtworkLabel,
  ExhibitSpot,
  PlanarSpot,
} from "@/museum/_lib/exhibit"

export type Viewer = {
  position: PlanarSpot
  forward: PlanarSpot
}

const minFrontDistance = 0.4
const enterViewCosine = Math.cos((40 * Math.PI) / 180)
const keepViewCosine = Math.cos((55 * Math.PI) / 180)
const keepReachScale = 1.15

function viewScore(spot: ExhibitSpot, viewer: Viewer, isCurrent: boolean) {
  if (spot.isFocusable?.() === false) {
    return null
  }
  const toX = spot.position.x - viewer.position.x
  const toZ = spot.position.z - viewer.position.z
  const distance = Math.hypot(toX, toZ)
  const reach = isCurrent ? spot.reach * keepReachScale : spot.reach
  if (distance > reach || distance < 1e-6) {
    return null
  }
  if (spot.normal) {
    const front = -(toX * spot.normal.x + toZ * spot.normal.z)
    if (front < minFrontDistance) {
      return null
    }
  }
  const alignment = (toX * viewer.forward.x + toZ * viewer.forward.z) / distance
  if (alignment < (isCurrent ? keepViewCosine : enterViewCosine)) {
    return null
  }
  return distance / reach - alignment * 0.5
}

export function nearestExhibit(
  spots: readonly ExhibitSpot[],
  viewer: Viewer,
  current: ArtworkLabel | null
) {
  let best: ExhibitSpot | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const spot of spots) {
    const score = viewScore(spot, viewer, spot.label.id === current?.id)
    if (score !== null && score < bestScore) {
      best = spot
      bestScore = score
    }
  }
  return best?.label ?? null
}
