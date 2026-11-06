import type { Doorway, RoomBounds } from "@/museum/gallery/_lib/room-bounds"
import {
  baseProfile,
  ceilingRoseProfile,
  chairRailProfile,
  corniceProfile,
  defaultPictureRailY,
  fieldProfile,
  pictureRailProfile,
} from "@/museum/gallery/mouldings/_lib/moulding-profiles"
import { roomLoop, wallRuns } from "@/museum/gallery/mouldings/_lib/wall-paths"
import { sweepAlongWalls } from "@/museum/gallery/mouldings/_lib/wall-sweep"
import { LatheGeometry, Vector2, type BufferGeometry } from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

export type MouldingSpec = {
  bounds: RoomBounds
  doorways: readonly Doorway[]
  pictureRailY?: number
  // Off for a room whose ceiling steps down (no rail or cornice fits).
  hasUpperMouldings?: boolean
}

function merge(parts: BufferGeometry[]) {
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  return merged
}

// Dark carved woodwork for one room: skirting, panelled dado and chair rail
// stopping at doorways, a picture rail and a deep cornice all the way round.
export function buildMouldingGeometry(spec: MouldingSpec) {
  const runs = wallRuns(spec.bounds, spec.doorways)
  const loop = roomLoop(spec.bounds)
  const sweepRuns = (profile: Parameters<typeof sweepAlongWalls>[1]) =>
    runs.map((run) => sweepAlongWalls(run, profile))
  const upper =
    spec.hasUpperMouldings === false
      ? []
      : [
          sweepAlongWalls(
            loop,
            pictureRailProfile(spec.pictureRailY ?? defaultPictureRailY)
          ),
          sweepAlongWalls(loop, corniceProfile(spec.bounds.height)),
        ]
  return {
    carved: merge([
      ...sweepRuns(baseProfile),
      ...sweepRuns(chairRailProfile),
      ...upper,
    ]),
    field: merge(sweepRuns(fieldProfile)),
  }
}

export function buildCeilingRose(ceiling: number) {
  return new LatheGeometry(
    ceilingRoseProfile(ceiling).map(([radius, y]) => new Vector2(radius, y)),
    48
  )
}
