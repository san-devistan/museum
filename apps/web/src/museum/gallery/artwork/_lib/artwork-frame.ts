import {
  laceLayout,
  laceMarginRatio,
  laceOpening,
} from "@/museum/gallery/_lib/lace-outline"

export type FrameSize = { width: number; height: number }

const canvasTuck = 0.012
const canvasRecess = 0.006

export function artworkFrame(artwork: FrameSize) {
  const margin = Math.min(artwork.width, artwork.height) * laceMarginRatio
  const lace = {
    width: artwork.width + margin * 2,
    height: artwork.height + margin * 2,
  }
  const opening = laceOpening(laceLayout(lace))
  return {
    lace,
    canvas: {
      width: (opening.x + canvasTuck) * 2,
      height: (opening.y + canvasTuck) * 2,
    },
    canvasZ: canvasRecess,
  }
}
