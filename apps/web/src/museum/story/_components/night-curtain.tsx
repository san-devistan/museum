import {
  useMidnightScene,
  type Curtain,
  type CurtainFade,
} from "@/museum/gallery/midnight/_lib/midnight-scene"
import { cn } from "@workspace/ui/lib/utils"

const shades: Record<Curtain, string> = {
  clear: "opacity-0",
  dim: "opacity-60",
  black: "opacity-100",
}

const fades: Record<CurtainFade, string> = {
  cut: "duration-150",
  soft: "duration-1500",
  slow: "duration-2500",
}

// Black over the whole screen: the midnight blackout, and the fade as the
// house keeps the visitor (ending B).
export function NightCurtain() {
  const curtain = useMidnightScene((state) => state.curtain)
  const fade = useMidnightScene((state) => state.curtainFade)

  return (
    <div
      aria-hidden="true"
      className={cn(
        "inset-0 ease-in-out pointer-events-none absolute bg-background transition-opacity",
        fades[fade],
        shades[curtain]
      )}
    />
  )
}
