import type { ArtworkLabel } from "@/museum/_lib/exhibit"
import { create } from "zustand"

export type MuseumPhase = "entrance" | "opening" | "gallery" | "leaving"

type MuseumState = {
  phase: MuseumPhase
  /** The visitor let go of the mouse (Escape) and hasn't clicked back in. */
  isPaused: boolean
  hasDoorSlammed: boolean
  focusedArtwork: ArtworkLabel | null
  openDoor: () => void
  enterGallery: () => void
  leaveGallery: () => void
  returnToEntrance: () => void
  markDoorSlammed: () => void
  setPaused: (isPaused: boolean) => void
  setFocusedArtwork: (artwork: ArtworkLabel | null) => void
}

export const useMuseumStore = create<MuseumState>()((set) => ({
  phase: "entrance",
  isPaused: false,
  hasDoorSlammed: false,
  focusedArtwork: null,
  openDoor: () =>
    set((state) => (state.phase === "entrance" ? { phase: "opening" } : state)),
  enterGallery: () => set({ phase: "gallery", hasDoorSlammed: false }),
  leaveGallery: () =>
    set((state) =>
      state.phase === "gallery"
        ? { phase: "leaving", hasDoorSlammed: false }
        : state
    ),
  returnToEntrance: () =>
    set((state) => (state.phase === "leaving" ? { phase: "entrance" } : state)),
  markDoorSlammed: () =>
    set((state) =>
      state.phase === "gallery" && !state.hasDoorSlammed
        ? { hasDoorSlammed: true }
        : state
    ),
  setPaused: (isPaused) => set({ isPaused }),
  setFocusedArtwork: (focusedArtwork) =>
    set((state) =>
      state.focusedArtwork?.id === focusedArtwork?.id
        ? state
        : { focusedArtwork }
    ),
}))
