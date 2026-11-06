import { useMuseumStore } from "@/museum/_lib/museum-store"
import {
  createNarrationDirector,
  type NarrationDirector,
  type NarrationScene,
} from "@/museum/narration/_lib/narration-director"
import {
  showNarrationLine,
  showWhisperCaption,
  useNarrationStore,
  useWhisperCaptionStore,
  type CaptionPlacement,
} from "@/museum/narration/_lib/narration-store"
import {
  createWhisperChannel,
  type WhisperChannel,
} from "@/museum/narration/_lib/whisper-channel"
import {
  introNarration,
  lineNarration,
  workNarration,
} from "@/museum/narration/narration-tracks"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { cn } from "@workspace/ui/lib/utils"
import { useEffect, useRef } from "react"

type SceneInput = Omit<NarrationScene, "line"> & {
  lineId: string | null
  lineSerial: number
}

function useNarrationDirector({
  isListening,
  canSpeakLines,
  photographId,
  lineId,
  lineSerial,
  isIntroDone,
}: SceneInput) {
  const directorRef = useRef<NarrationDirector | null>(null)

  useEffect(() => {
    const story = useStoryStore.getState
    const director = createNarrationDirector({
      intro: introNarration,
      workTrack: workNarration,
      lineTrack: lineNarration,
      shouldPreloadIntro: !story().introFinished,
      onLine: showNarrationLine,
      onIntroEnd: () => {
        story().finishIntro()
      },
      onLineEnd: () => {
        story().shiftLine()
      },
    })
    directorRef.current = director
    return () => {
      director.dispose()
      directorRef.current = null
    }
  }, [])

  useEffect(() => {
    directorRef.current?.sync({
      isListening,
      canSpeakLines,
      photographId,
      line: lineId === null ? null : { id: lineId, serial: lineSerial },
      isIntroDone,
    })
  }, [
    isListening,
    canSpeakLines,
    photographId,
    lineId,
    lineSerial,
    isIntroDone,
  ])
}

type WhisperInput = {
  canSpeak: boolean
  whisperId: string | null
  whisperSerial: number
}

// The ikebanas' whispers, over whatever the main voice is saying.
function useWhisperChannel({
  canSpeak,
  whisperId,
  whisperSerial,
}: WhisperInput) {
  const channelRef = useRef<WhisperChannel | null>(null)

  useEffect(() => {
    const channel = createWhisperChannel({
      lineTrack: lineNarration,
      onCaption: showWhisperCaption,
      onWhisperEnd: () => {
        useStoryStore.getState().shiftWhisper()
      },
    })
    channelRef.current = channel
    return () => {
      channel.dispose()
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    channelRef.current?.sync({
      canSpeak,
      whisper:
        whisperId === null ? null : { id: whisperId, serial: whisperSerial },
    })
  }, [canSpeak, whisperId, whisperSerial])
}

export function Narration() {
  const isListening = useMuseumStore(
    (state) =>
      state.phase === "gallery" && !state.isPaused && state.hasDoorSlammed
  )
  // Outside the gallery (walking out, at the door) only story lines speak, and
  // they keep going: the house says goodbye as the visitor leaves.
  const isOutside = useMuseumStore((state) => state.phase !== "gallery")
  const photographId = useMuseumStore((state) =>
    state.focusedArtwork?.kind === "photograph" ? state.focusedArtwork.id : null
  )
  const lineId = useStoryStore((state) => state.lineQueue[0] ?? null)
  const lineSerial = useStoryStore((state) => state.linesSpoken)
  const isIntroDone = useStoryStore((state) => state.introFinished)
  const whisperId = useStoryStore((state) => state.whisperQueue[0] ?? null)
  const whisperSerial = useStoryStore((state) => state.whispersSpoken)
  const canSpeakLines = isListening || isOutside
  useNarrationDirector({
    isListening,
    canSpeakLines,
    photographId,
    lineId,
    lineSerial,
    isIntroDone,
  })
  useWhisperChannel({ canSpeak: canSpeakLines, whisperId, whisperSerial })

  return <NarrationCaption isOutside={isOutside} />
}

// The work card covers the bottom right while a work is in view, the keys
// the bottom left.
function captionInset(isBesideCard: boolean) {
  return isBesideCard ? "pr-108 pl-60" : "px-60"
}

// The whisper's caption sits just above the main one, so both can show at
// once without overlapping.
function NarrationCaption({ isOutside }: { isOutside: boolean }) {
  const placement = useNarrationStore((state) => state.placement)
  const isCardShown = useMuseumStore(
    (state) => state.phase === "gallery" && state.focusedArtwork !== null
  )

  return (
    <div
      aria-hidden="true"
      className={cn(
        "inset-x-0 gap-2 pointer-events-none absolute flex flex-col items-center select-none",
        // Outside, the entrance button sits where the caption usually does.
        isOutside ? "bottom-28" : "bottom-10"
      )}
    >
      <WhisperCaptionLine
        isBesideCard={isCardShown || placement === "beside-card"}
      />
      <VoiceCaptionLine placement={placement} />
    </div>
  )
}

function WhisperCaptionLine({ isBesideCard }: { isBesideCard: boolean }) {
  const text = useWhisperCaptionStore((state) => state.text)
  const isShown = useWhisperCaptionStore((state) => state.cueIndex >= 0)

  return (
    <div
      className={cn("flex w-full justify-center", captionInset(isBesideCard))}
    >
      <p
        className={cn(
          "max-w-md px-3 py-1 shadow-md backdrop-blur-sm text-sm/snug rounded-md bg-background/40 text-center text-pretty text-foreground/80 italic transition-opacity duration-700",
          isShown ? "opacity-100" : "opacity-0"
        )}
      >
        {text}
      </p>
    </div>
  )
}

function VoiceCaptionLine({ placement }: { placement: CaptionPlacement }) {
  const text = useNarrationStore((state) => state.text)
  const isWhisper = useNarrationStore((state) => state.tone === "whisper")
  const isShown = useNarrationStore((state) => state.cueIndex >= 0)

  return (
    <div
      className={cn(
        "flex w-full justify-center",
        captionInset(placement === "beside-card")
      )}
    >
      <p
        className={cn(
          "max-w-2xl px-4 py-2 shadow-lg backdrop-blur-sm rounded-lg text-center text-pretty transition-opacity duration-700",
          isWhisper
            ? "text-sm/snug bg-background/50 text-foreground/85 italic"
            : "text-base/snug bg-background/70 text-foreground",
          isShown ? "opacity-100" : "opacity-0"
        )}
      >
        {text}
      </p>
    </div>
  )
}
