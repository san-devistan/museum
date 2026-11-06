import { useMuseumStore } from "@/museum/_lib/museum-store"
import { ArtworkPaper } from "@/museum/player/_components/artwork-paper"
import { ControlsPanel } from "@/museum/player/_components/controls-panel"
import { Crosshair } from "@/museum/player/_components/crosshair"
import { PausePrompt } from "@/museum/player/_components/pause-prompt"
import { useArtworkLink } from "@/museum/player/_hooks/use-artwork-link"
import { useKeyboardLayout } from "@/museum/player/_hooks/use-keyboard-layout"

export function PlayerHud() {
  const phase = useMuseumStore((state) => state.phase)

  if (phase !== "gallery") {
    return null
  }

  return <PlayerHudLayer />
}

function PlayerHudLayer() {
  const isPlaying = useMuseumStore((state) => !state.isPaused)
  const isFocused = useMuseumStore((state) => state.focusedArtwork !== null)
  const layout = useKeyboardLayout()
  useArtworkLink()

  return (
    <div className="inset-0 pointer-events-none absolute select-none">
      <Crosshair isVisible={isPlaying} isFocused={isFocused} />
      <ArtworkPaper isVisible={isPlaying && isFocused} layout={layout} />
      <PausePrompt isVisible={!isPlaying} />
      <ControlsPanel isPlaying={isPlaying} layout={layout} />
    </div>
  )
}
