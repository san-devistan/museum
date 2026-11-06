import type { RoomBounds } from "@/museum/gallery/_lib/room-bounds"
import {
  wallMount,
  type WallGap,
  type WallMount,
} from "@/museum/gallery/_lib/wall-gaps"

export const manorWindow = {
  glassWidth: 0.9,
  sill: 0.92,
  springing: 2.56,
  architrave: 0.11,
  depth: 0.09,
  curtainRodY: 3.18,
  curtainZ: 0.16,
  curtainReach: 0.86,
  tieY: 1.22,
} as const

export const glassCrown = manorWindow.springing + manorWindow.glassWidth / 2

// Bare wall a window needs, curtains included.
export const windowFootprint = manorWindow.curtainReach * 2 + 0.2

export type ManorWindowSpec = WallMount & {
  id: string
  isMoonlit: boolean
  isStirring: boolean
}

type WindowRow = {
  bounds: RoomBounds
  gaps: readonly WallGap[]
  isMoonlit: boolean
  stirringIndex?: number
}

// One arched window centred in each gap wide enough for it.
export function windowsInGaps(row: WindowRow): ManorWindowSpec[] {
  return row.gaps
    .filter((gap) => gap.width >= windowFootprint)
    .map((gap, index) => ({
      ...wallMount(gap, row.bounds),
      id: `window-${gap.wall}-${index}`,
      isMoonlit: row.isMoonlit,
      isStirring: index === row.stirringIndex,
    }))
}
