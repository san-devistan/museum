import type { NarrationCue } from "@/museum/narration/_lib/narration-cues"

// Captions for a line that has no recording yet, paced like speech.
const charsPerSecond = 15
const minCueSeconds = 2
// Same longest caption as the recorded cues (scripts/narration).
const maxCueLength = 110
const minClauseLength = 30

const sentenceEnd = /(?<=[.!?…])\s+(?=\S)/u
const clauseBreaks = [", ", "; ", " : "] as const

// Cuts a long sentence after its last clause break that still fits, or at the
// last space when there is none.
function splitLong(sentence: string): string[] {
  if (sentence.length <= maxCueLength) {
    return [sentence]
  }
  const head = sentence.slice(0, maxCueLength)
  const clauseAt = Math.max(
    ...clauseBreaks.map((mark) => head.lastIndexOf(mark) + mark.length - 1)
  )
  const cutAt = clauseAt >= minClauseLength ? clauseAt : head.lastIndexOf(" ")
  if (cutAt <= 0) {
    return [sentence]
  }
  return [
    sentence.slice(0, cutAt).trim(),
    ...splitLong(sentence.slice(cutAt).trim()),
  ]
}

// Short sentences of one paragraph share a caption, as long as it fits.
function paragraphChunks(paragraph: string) {
  const chunks: string[] = []
  const sentences = paragraph
    .replaceAll(/\s+/gu, " ")
    .trim()
    .split(sentenceEnd)
    .flatMap(splitLong)
  for (const sentence of sentences) {
    const last = chunks.at(-1)
    if (
      last !== undefined &&
      last.length + 1 + sentence.length <= maxCueLength
    ) {
      chunks[chunks.length - 1] = `${last} ${sentence}`
    } else {
      chunks.push(sentence)
    }
  }
  return chunks
}

export function textCues(text: string): NarrationCue[] {
  const chunks = text
    .split(/\n\s*\n/u)
    .flatMap(paragraphChunks)
    .filter((chunk) => chunk.length > 0)
  let start = 0
  return chunks.map((chunk) => {
    const end = start + Math.max(minCueSeconds, chunk.length / charsPerSecond)
    const cue = { start, end, text: chunk }
    start = end
    return cue
  })
}
