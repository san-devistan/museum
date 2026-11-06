import { useMuseumStore } from "@/museum/_lib/museum-store"
import { useReducedMotion } from "@/museum/gallery/_hooks/use-reduced-motion"
import { useMidnightScene } from "@/museum/gallery/midnight/_lib/midnight-scene"
import {
  emptyFrameCard,
  keptVisitorCard,
  tonight,
} from "@/museum/gallery/midnight/_lib/thirteenth-frame"
import { PaperPin } from "@/museum/player/_components/paper-pin"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { cn } from "@workspace/ui/lib/utils"
import { useEffect, useState } from "react"

type Card = { title: string; lines: readonly string[] }

// The new words come in one letter at a time, as if a hand wrote them.
const letterEveryMs = 55
const pauseBeforeMs = 700

function letterCount(card: Card) {
  return card.lines.reduce((sum, line) => sum + line.length, card.title.length)
}

// The first `count` letters of the card, title first.
function written(card: Card, count: number): Card {
  let left = Math.max(0, count - card.title.length)
  return {
    title: card.title.slice(0, count),
    lines: card.lines.map((line) => {
      const part = line.slice(0, left)
      left = Math.max(0, left - line.length)
      return part
    }),
  }
}

function useHandwriting(card: Card, isWriting: boolean) {
  const total = letterCount(card)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isWriting) {
      return undefined
    }
    let interval: number | undefined
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setCount((current) => Math.min(total, current + 1))
      }, letterEveryMs)
    }, pauseBeforeMs)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(interval)
    }
  }, [isWriting, total])

  return isWriting ? written(card, count) : card
}

// The card's words; remounted when they change, so the writing starts over.
function CardText({ card, isWriting }: { card: Card; isWriting: boolean }) {
  const shown = useHandwriting(card, isWriting)

  return (
    <div className="transition-opacity duration-700 starting:opacity-0">
      <p className="min-h-9 text-3xl leading-tight font-semibold font-display">
        {shown.title}
      </p>
      <span className="mt-2 h-0.5 w-10 block bg-paper-accent" />
      {shown.lines.map((line, index) => (
        <p key={card.lines[index]} className="mt-3 min-h-5 text-sm/relaxed">
          {line}
        </p>
      ))}
    </div>
  )
}

// The thirteenth frame's card. When the house keeps the visitor (ending B),
// it rewrites itself: the empty frame is theirs now.
export function MirrorCard() {
  const isPlaying = useMuseumStore(
    (state) => state.phase === "gallery" && !state.isPaused
  )
  const isInView = useMidnightScene((state) => state.isMirrorInView)
  const isKept = useStoryStore((state) => state.ending === "stay")
  const isStill = useReducedMotion()
  const [night] = useState(tonight)
  const isVisible = isPlaying && (isInView || isKept)

  return (
    <div className="inset-6 pointer-events-none absolute flex items-end justify-end select-none">
      <aside
        aria-hidden={!isVisible}
        aria-live="polite"
        className={cn(
          "w-72 px-6 pt-7 pb-6 shadow-xl starting:translate-x-8 starting:translate-y-8 relative origin-bottom-right bg-paper text-paper-foreground transition-all motion-reduce:transition-opacity starting:rotate-6 starting:opacity-0",
          isVisible
            ? "translate-x-0 translate-y-0 ease-out -rotate-2 opacity-100 duration-500"
            : "translate-x-8 translate-y-8 ease-in rotate-6 opacity-0 duration-300"
        )}
      >
        <PaperPin className="left-2" />
        <PaperPin className="right-2" />
        {isKept ? (
          <CardText
            key="kept"
            card={keptVisitorCard(night)}
            isWriting={!isStill}
          />
        ) : (
          <CardText key="empty" card={emptyFrameCard} isWriting={false} />
        )}
      </aside>
    </div>
  )
}
