import type { ExhibitSpot } from "@/museum/_lib/exhibit"
import type { ArtworkSpec } from "@/museum/gallery/_lib/gallery-artworks"
import { artworkFrame } from "@/museum/gallery/artwork/_lib/artwork-frame"
import { labelSize } from "@/museum/gallery/label/_lib/label-assets"

export type LabelPlacement = {
  position: [x: number, y: number, z: number]
  rotation: [x: number, y: number, z: number]
}

const labelGap = 0.14
const labelEyeLine = 1.32
const wallClearance = 0.006
// How much further than its viewing distance a work still takes focus.
const reachSlack = 0.9
const minReach = 3.4

export function paintingLabelOffset(artwork: ArtworkSpec): LabelPlacement {
  const { lace } = artworkFrame(artwork)
  return {
    position: [
      lace.width / 2 + labelGap + labelSize.width / 2,
      labelEyeLine - artwork.position[1],
      wallClearance,
    ],
    rotation: [0, 0, 0],
  }
}

export function paintingSpot(artwork: ArtworkSpec): ExhibitSpot {
  const yaw = artwork.rotation[1]
  const [x, , z] = artwork.position
  return {
    label: artwork,
    position: { x, z },
    normal: { x: Math.sin(yaw), z: Math.cos(yaw) },
    reach: Math.max(minReach, artwork.viewingDistance + reachSlack),
  }
}
