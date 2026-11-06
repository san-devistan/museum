import type { ArtworkCredit, ArtworkLabel } from "@/museum/_lib/exhibit"
import { hasWorkNarration } from "@/museum/narration/narration-tracks"
import { PaperPin } from "@/museum/player/_components/paper-pin"
import { useKeyToggle } from "@/museum/player/_hooks/use-key-toggle"
import {
  keyLabels,
  type KeyboardLayout,
} from "@/museum/player/_hooks/use-keyboard-layout"
import { useWheelScroll } from "@/museum/player/_hooks/use-wheel-scroll"
import { usePlayerSession } from "@/museum/player/_lib/player-session"
import { Kbd } from "@workspace/ui/components/kbd"
import { cn } from "@workspace/ui/lib/utils"
import { useRef } from "react"

// The physical key next to Tab: Q on QWERTY, A on AZERTY.
const creditsKey = "KeyQ"

type ArtworkPaperProps = {
  isVisible: boolean
  layout: KeyboardLayout
}

// Every work is Dolla Shashin's photograph, so the card leaves out the
// artist and the medium.
function PaperHeader({ artwork }: { artwork: ArtworkLabel }) {
  return (
    <>
      <p className="text-3xl leading-tight font-semibold font-display">
        {artwork.title}
      </p>
      <span className="mt-2 h-0.5 w-10 block bg-paper-accent" />
      {artwork.year ? (
        <p className="mt-2 text-sm text-paper-foreground/70">{artwork.year}</p>
      ) : null}
    </>
  )
}

function PaperStory({
  statement,
  credits,
}: {
  statement?: string
  credits?: readonly ArtworkCredit[]
}) {
  return (
    <>
      {statement ? (
        <p className="mt-4 text-sm/relaxed whitespace-pre-line">{statement}</p>
      ) : null}
      {credits ? (
        <dl className="mt-4 gap-1 pt-3 text-sm/snug flex flex-col border-t border-paper-foreground/15">
          {credits.map((credit) => (
            <div key={credit.role} className="gap-x-2 flex flex-wrap">
              <dt className="text-paper-foreground/60">{credit.role}</dt>
              <dd className="min-w-0 break-words">{credit.names}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  )
}

function KeyHint({ label, children }: { label: string; children: string }) {
  return (
    <span className="gap-2 flex items-center">
      <Kbd>{label}</Kbd>
      {children}
    </span>
  )
}

function PaperControls({
  hasLink,
  creditsLabel,
  canScroll,
}: {
  hasLink: boolean
  creditsLabel: string | null
  canScroll: boolean
}) {
  if (!hasLink && !creditsLabel && !canScroll) {
    return null
  }

  return (
    <p className="mt-4 gap-x-4 gap-y-2 text-sm flex flex-wrap items-center text-paper-foreground/80">
      {hasLink ? <KeyHint label="E">Voir sur Instagram</KeyHint> : null}
      {creditsLabel ? <KeyHint label={creditsLabel}>Crédits</KeyHint> : null}
      {canScroll ? <KeyHint label="Molette">Lire la suite</KeyHint> : null}
    </p>
  )
}

export function ArtworkPaper({ isVisible, layout }: ArtworkPaperProps) {
  const artwork = usePlayerSession((state) => state.lastArtwork)

  if (!artwork) {
    return null
  }

  return (
    <PaperSheet
      key={artwork.id}
      artwork={artwork}
      isVisible={isVisible}
      layout={layout}
    />
  )
}

function PaperSheet({
  artwork,
  isVisible,
  layout,
}: {
  artwork: ArtworkLabel
  isVisible: boolean
  layout: KeyboardLayout
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const canScroll = useWheelScroll(scrollRef, isVisible)
  const hasCredits = Boolean(artwork.credits?.length)
  // Hidden until the visitor asks, on each new card.
  const isShowingCredits = useKeyToggle(creditsKey, isVisible && hasCredits)
  // A narrated work speaks its statement (with subtitles) instead of printing it.
  const statement = hasWorkNarration(artwork.id) ? undefined : artwork.statement
  const credits = isShowingCredits ? artwork.credits : undefined
  const hasStory = Boolean(statement ?? credits)

  return (
    <div className="inset-6 absolute flex items-end justify-end">
      <aside
        aria-hidden={!isVisible}
        aria-live="polite"
        className={cn(
          "px-6 pt-7 pb-6 shadow-xl starting:translate-x-8 starting:translate-y-8 relative flex max-h-full origin-bottom-right flex-col bg-paper text-paper-foreground transition-all motion-reduce:transition-opacity starting:rotate-6 starting:opacity-0",
          hasStory ? "w-96" : "w-72",
          isVisible
            ? "translate-x-0 translate-y-0 ease-out -rotate-2 opacity-100 duration-500"
            : "translate-x-8 translate-y-8 ease-in rotate-6 opacity-0 duration-300"
        )}
      >
        <PaperPin className="left-2" />
        <PaperPin className="right-2" />
        <div ref={scrollRef} className="min-h-0 overflow-y-auto">
          <PaperHeader artwork={artwork} />
          <PaperStory statement={statement} credits={credits} />
        </div>
        <PaperControls
          hasLink={Boolean(artwork.link)}
          creditsLabel={hasCredits ? keyLabels[layout].KeyQ : null}
          canScroll={canScroll}
        />
      </aside>
    </div>
  )
}
