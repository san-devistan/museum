import {
  keyLabels,
  type KeyboardLayout,
} from "@/museum/player/_hooks/use-keyboard-layout"
import { Kbd } from "@workspace/ui/components/kbd"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react"
import type { ReactNode } from "react"

type ClusterKeys = {
  up: ReactNode
  left: ReactNode
  down: ReactNode
  right: ReactNode
}

const arrowKeys: ClusterKeys = {
  up: <ArrowUp />,
  left: <ArrowLeft />,
  down: <ArrowDown />,
  right: <ArrowRight />,
}

function Keycap({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <Kbd className={cn("size-6", className)}>{children}</Kbd>
}

// Four keys laid out as on the keyboard: one on top, three below.
function KeyCluster({ keys }: { keys: ClusterKeys }) {
  return (
    <div className="gap-0.5 grid grid-cols-3">
      <Keycap className="col-start-2">{keys.up}</Keycap>
      <Keycap className="col-start-1">{keys.left}</Keycap>
      <Keycap>{keys.down}</Keycap>
      <Keycap>{keys.right}</Keycap>
    </div>
  )
}

type ControlsPanelProps = {
  isPlaying: boolean
  layout: KeyboardLayout
}

// The keys stay in the bottom left corner, clear of the subtitles (bottom
// centre), the artwork card (bottom right) and the pearls (top centre).
export function ControlsPanel({ isPlaying, layout }: ControlsPanelProps) {
  const letters = keyLabels[layout]
  const letterKeys: ClusterKeys = {
    up: letters.KeyW,
    left: letters.KeyA,
    down: letters.KeyS,
    right: letters.KeyD,
  }
  const moveLabel = `Se déplacer : ${letters.KeyW} ${letters.KeyA} ${letters.KeyS} ${letters.KeyD} ou les flèches`

  return (
    <aside aria-label="Commandes" className="bottom-6 left-6 absolute">
      <div
        className={cn(
          "gap-2 p-2.5 text-sm backdrop-blur-sm flex flex-col items-center rounded-lg border border-border bg-background/40 text-muted-foreground transition-opacity duration-500 starting:opacity-0",
          isPlaying ? "opacity-70" : "opacity-100"
        )}
      >
        <p className="sr-only">{moveLabel}</p>
        <div aria-hidden="true" className="gap-3 flex">
          <KeyCluster keys={letterKeys} />
          <KeyCluster keys={arrowKeys} />
        </div>
        <p className="gap-1.5 flex items-center">
          <Kbd>Échap</Kbd>
          Pause
        </p>
      </div>
    </aside>
  )
}
