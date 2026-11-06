import type { ArtworkLabel } from "@/museum/_lib/exhibit"
import { create } from "zustand"

type PlayerSession = {
  lastArtwork: ArtworkLabel | null
}

export const usePlayerSession = create<PlayerSession>()(() => ({
  lastArtwork: null,
}))

export function rememberArtwork(artwork: ArtworkLabel) {
  if (usePlayerSession.getState().lastArtwork?.id !== artwork.id) {
    usePlayerSession.setState({ lastArtwork: artwork })
  }
}

export function resetPlayerSession() {
  usePlayerSession.setState({ lastArtwork: null })
}
