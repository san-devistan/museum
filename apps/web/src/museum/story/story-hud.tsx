import { useMuseumStore } from "@/museum/_lib/museum-store"
import { ObjectiveCard } from "@/museum/story/_components/objective-card"
import { PearlNecklace } from "@/museum/story/_components/pearl-necklace"
import { hasGameStarted, useStoryStore } from "@/museum/story/_lib/story-store"

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

  return (
    <div className="inset-0 pointer-events-none absolute select-none">
      <PearlNecklace wokenCount={wokenCount} isPlaying={isPlaying} />
      <ObjectiveCard isVisible={isPlaying && isObjectiveShown} />
    </div>
  )
}
