import { useReducedMotion } from "@/museum/gallery/_hooks/use-reduced-motion"
import { ThirteenthFrame } from "@/museum/gallery/midnight/_components/thirteenth-frame"
import { useMidnightClock } from "@/museum/gallery/midnight/_hooks/use-midnight-clock"
import { useMidnightScene } from "@/museum/gallery/midnight/_lib/midnight-scene"
import { useStoryStore } from "@/museum/story/_lib/story-store"

// Midnight, the thirteenth frame and the endings inside the manor. The
// frame is hung as the lights die, so it is there when they come back.
export function Midnight() {
  const isStill = useReducedMotion()
  const isMidnight = useStoryStore((state) => state.midnight)
  const isStriking = useMidnightScene((state) => state.isStriking)

  useMidnightClock(isStill)

  return isMidnight || isStriking ? <ThirteenthFrame isStill={isStill} /> : null
}
