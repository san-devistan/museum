import { useMuseumStore } from "@/museum/_lib/museum-store"
import { galleryName } from "@/museum/entrance/_lib/entrance-sign"
import { useEntranceShot } from "@/museum/entrance/_lib/establishing-shot"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function EntranceOverlay() {
  const phase = useMuseumStore((state) => state.phase)
  const openDoor = useMuseumStore((state) => state.openDoor)
  // The button only appears once the opening shot has pushed in to the door.
  const isShotSettled = useEntranceShot((state) => state.isSettled)
  // After midnight the ribbon already lies on the doorstep.
  const isUntied = useStoryStore((state) => state.midnight)

  if (phase === "gallery") {
    return null
  }

  const isHidden = phase !== "entrance" || !isShotSettled

  return (
    <div
      aria-hidden={isHidden}
      className={cn(
        "inset-0 px-6 pb-10 ease-out pointer-events-none absolute flex flex-col items-center justify-end text-foreground transition-opacity duration-700 motion-reduce:duration-200",
        isHidden ? "opacity-0" : "opacity-100"
      )}
      inert={isHidden}
    >
      <h1 className="sr-only">{galleryName}</h1>
      <div className="pointer-events-auto">
        <Button disabled={isHidden} onClick={openDoor} size="lg" type="button">
          {isUntied ? "Pousser la porte" : "Dénouer le ruban"}
        </Button>
      </div>
    </div>
  )
}
