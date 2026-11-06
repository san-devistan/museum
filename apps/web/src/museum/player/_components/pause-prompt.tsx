import { requestPlayerPointerLock } from "@/museum/player/_lib/pointer-lock"
import { cn } from "@workspace/ui/lib/utils"

type PausePromptProps = {
  isVisible: boolean
}

// Shown only after Escape: the visitor arrives straight into the room, and a
// first click on the scene is enough to look around.
export function PausePrompt({ isVisible }: PausePromptProps) {
  return (
    <div
      inert={!isVisible}
      className={cn(
        "inset-0 p-4 absolute flex items-center justify-center bg-background/30 transition-opacity duration-300 starting:opacity-0",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <button
        type="button"
        onClick={requestPlayerPointerLock}
        className={cn(
          "px-6 py-4 text-2xl shadow-lg backdrop-blur-sm font-semibold rounded-xl border border-border bg-background/85 font-display text-foreground transition-colors hover:border-ring focus-visible:border-ring focus-visible:outline-none",
          isVisible
            ? "pointer-events-auto cursor-pointer"
            : "pointer-events-none"
        )}
      >
        En pause · cliquez pour reprendre
      </button>
    </div>
  )
}
