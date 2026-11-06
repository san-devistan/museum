import { PaperPin } from "@/museum/player/_components/paper-pin"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { cn } from "@workspace/ui/lib/utils"
import { useEffect } from "react"

// Long enough to read twice, short enough not to linger over the visit.
const shownForMs = 16_000

type ObjectiveCardProps = {
  isVisible: boolean
}

// The written objective, pinned under the pearls. It leaves on the next wake
// (the store unpins it) or after a while on screen.
export function ObjectiveCard({ isVisible }: ObjectiveCardProps) {
  useEffect(() => {
    const timer = isVisible
      ? window.setTimeout(() => {
          useStoryStore.getState().dismissObjective()
        }, shownForMs)
      : undefined
    return () => {
      window.clearTimeout(timer)
    }
  }, [isVisible])

  return (
    <div className="inset-x-0 top-20 px-6 absolute flex justify-center">
      <aside
        aria-hidden={!isVisible}
        aria-live="polite"
        className={cn(
          "px-6 pt-6 pb-5 shadow-xl starting:-translate-y-4 max-w-sm relative bg-paper text-center text-paper-foreground transition-all motion-reduce:transition-opacity starting:rotate-3 starting:opacity-0",
          isVisible
            ? "translate-y-0 ease-out -rotate-1 opacity-100 duration-700"
            : "-translate-y-4 ease-in rotate-2 opacity-0 duration-700"
        )}
      >
        <PaperPin className="left-2" />
        <PaperPin className="right-2" />
        <p className="text-2xl leading-tight font-semibold font-display">
          Douze images dorment sous leurs voiles.
        </p>
        <span className="mt-3 h-0.5 w-10 mx-auto block bg-paper-accent" />
        <p className="mt-3 text-base font-medium">Regardez-les toutes.</p>
      </aside>
    </div>
  )
}
