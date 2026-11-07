import { useMuseumStore } from "@/museum/_lib/museum-store"
import { useManorPresence } from "@/museum/gallery/_lib/manor-presence"
import { useMidnightScene } from "@/museum/gallery/midnight/_lib/midnight-scene"
import { EndingSigns } from "@/museum/story/_components/ending-signs"
import { ObjectiveCard } from "@/museum/story/_components/objective-card"
import { PearlNecklace } from "@/museum/story/_components/pearl-necklace"
import {
  canChooseEnding,
  hasGameStarted,
  useStoryStore,
} from "@/museum/story/_lib/story-store"

export function StoryHud() {
  const isInGallery = useMuseumStore((state) => state.phase === "gallery")
  const isStarted = useStoryStore(hasGameStarted)

  if (!isInGallery || !isStarted) {
    return null
  }

  return <StoryHudLayer />
}

function StoryHudLayer() {
  const isPlaying = useMuseumStore((state) => !state.isPaused)
  const wokenCount = useStoryStore((state) => state.woken.length)
  const isObjectiveShown = useStoryStore((state) => state.objectiveShown)
  // By the mirror, after midnight's scripted moments and the epilogue.
  const isByMirror = useManorPresence((state) => state.roomId === "vestibule")
  const isScripted = useMidnightScene(
    (state) => state.isStriking || state.isKeeping
  )
  const canChoose = useStoryStore(canChooseEnding)

  return (
    <div className="inset-0 pointer-events-none absolute select-none">
      <PearlNecklace wokenCount={wokenCount} isPlaying={isPlaying} />
      <ObjectiveCard isVisible={isPlaying && isObjectiveShown} />
      <EndingSigns
        isVisible={isPlaying && isByMirror && !isScripted && canChoose}
      />
    </div>
  )
}
