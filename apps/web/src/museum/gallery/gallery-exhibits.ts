import type { ExhibitSpot } from "@/museum/_lib/exhibit"
import { artworks } from "@/museum/gallery/_lib/gallery-artworks"
import { paintingSpot } from "@/museum/gallery/label/_lib/label-placement"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { canFocusWork } from "@/museum/story/_lib/wake-order"

// Only the twelve works take focus: the ikebanas are the house's décor. A
// sleeping work that isn't next in the waking order doesn't take it either.
export const galleryExhibits: readonly ExhibitSpot[] = artworks.map(
  (artwork) => ({
    ...paintingSpot(artwork),
    isFocusable: () => canFocusWork(useStoryStore.getState().woken, artwork.id),
  })
)
