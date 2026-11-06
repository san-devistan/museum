import { collectionWorks } from "@/museum/collection/collection-works"
import type {
  LineTrack,
  NarrationCue,
  NarrationTrack,
} from "@/museum/narration/_lib/narration-cues"
import { textCues } from "@/museum/narration/_lib/text-cues"
import { introCues } from "@/museum/narration/intro-cues"
import introAudio from "@/museum/narration/intro.mp3"

// A work is narrated once `works/<work id>.mp3` exists; its subtitles come from
// `works/<work id>-cues.ts`. Both are made by scripts/narration, and works
// without them simply keep their statement on the card.
const workAudio = import.meta.glob<string>("./works/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
})
const workCues = import.meta.glob<readonly NarrationCue[]>(
  "./works/*-cues.ts",
  { eager: true, import: "workCues" }
)

const workTracks = new Map(
  Object.entries(workAudio).map(([path, src]): [string, NarrationTrack] => {
    const workId = path.slice("./works/".length, -".mp3".length)
    return [workId, { src, cues: workCues[`./works/${workId}-cues.ts`] ?? [] }]
  })
)

// Works that share a statement (Fashion Chaos I and II) share one recording,
// saved under the first of them, as scripts/narration does.
const recordingIds = new Map<string, string>(
  collectionWorks.map((work) => [
    work.id,
    collectionWorks.find((other) => other.statement === work.statement)?.id ??
      work.id,
  ])
)

export const introNarration: NarrationTrack = {
  src: introAudio,
  cues: introCues,
}

export function workNarration(workId: string) {
  return workTracks.get(recordingIds.get(workId) ?? workId) ?? null
}

export function hasWorkNarration(workId: string) {
  return workNarration(workId) !== null
}

// A story line is `lines/<line id>.txt`, spoken in `lines/<line id>.mp3` with
// subtitles in `lines/<line id>-cues.ts`, all made by scripts/narration. Until
// the MP3 exists, the line plays as captions alone, paced from its text.
const lineAudio = import.meta.glob<string>("./lines/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
})
const lineCues = import.meta.glob<readonly NarrationCue[]>(
  "./lines/*-cues.ts",
  { eager: true, import: "lineCues" }
)
const lineTexts = import.meta.glob<string>("./lines/*.txt", {
  eager: true,
  query: "?raw",
  import: "default",
})

function readLine(lineId: string): LineTrack | null {
  const src = lineAudio[`./lines/${lineId}.mp3`] ?? null
  const text = lineTexts[`./lines/${lineId}.txt`] ?? ""
  const cues = lineCues[`./lines/${lineId}-cues.ts`] ?? textCues(text)
  if (src === null && cues.length === 0) {
    return null
  }
  return {
    src,
    cues,
    tone: lineId.startsWith("ikebana-") ? "whisper" : "voice",
  }
}

const lineTracks = new Map<string, LineTrack | null>()

export function lineNarration(lineId: string) {
  if (!lineTracks.has(lineId)) {
    lineTracks.set(lineId, readLine(lineId))
  }
  return lineTracks.get(lineId) ?? null
}
