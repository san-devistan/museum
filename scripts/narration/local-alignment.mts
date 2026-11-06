import { execFile } from "node:child_process"
import { promisify } from "node:util"

import type { CharacterTimes } from "./narration-cues.mts"

// Free alignment, without ElevenLabs: ffmpeg finds the pauses in the voice,
// then the text is matched to them. Sentence ends and commas land on pauses,
// and the characters in between are spread over the speech around them.

type Pause = { start: number; end: number }

// The voice in a recording: where it starts and ends, and its pauses.
export type Speech = {
  start: number
  end: number
  pauses: Pause[]
  duration: number
}

type BreakKind = "sentence" | "clause" | "word"

// A place in the text where the voice may pause: after the character at
// `last`; it speaks again from `resume`.
type Break = { last: number; resume: number; kind: BreakKind }

// The text as speaking time: weightBefore[i] is how long its first i
// characters take to say, in letters.
type WeightedText = { breaks: Break[]; weightBefore: number[]; weight: number }

// The voice with its pauses taken out: speechAt[j] is how much was said before
// pause j (counting from 1), speechTime how much in all.
type Timeline = { pauses: Pause[]; speechAt: number[]; speechTime: number }

export type LocalAlignmentOptions = {
  // A pause is this much quieter than the recording's mean loudness (dB)…
  pauseBelowMean: number
  // …for at least this long (s).
  minPause: number
  // How long a digit and a space take to say, a letter taking 1.
  digitWeight: number
  spaceWeight: number
  // What a sentence end or a comma pays for having no pause, and a plain word
  // break for getting one (a breath).
  skipSentence: number
  skipClause: number
  matchWord: number
  // What a pause left unexplained by the text costs, per second.
  skipPause: number
  // What a stretch spoken faster or slower than the whole costs.
  tempo: number
  // Share of a pause the caption before it keeps.
  pauseHold: number
  // How long the last caption stays once the voice stops (s).
  endHold: number
}

export const defaultLocalAlignment: LocalAlignmentOptions = {
  pauseBelowMean: 22,
  minPause: 0.1,
  digitWeight: 2.5,
  spaceWeight: 0.4,
  skipSentence: 3,
  skipClause: 1.5,
  matchWord: 1,
  skipPause: 4,
  tempo: 0.5,
  pauseHold: 0.85,
  endHold: 0.2,
}

// Most pauses one stretch of text may speak through.
const maxSkippedPauses = 8
const edgeNoise = 0.1

const run = promisify(execFile)

async function ffmpegLog(file: string, filter: string) {
  try {
    const { stderr } = await run(
      "ffmpeg",
      [
        "-hide_banner",
        "-nostats",
        "-i",
        file,
        "-af",
        filter,
        "-f",
        "null",
        "-",
      ],
      { maxBuffer: 16 * 1024 * 1024 }
    )
    return stderr
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error("ffmpeg is missing: `brew install ffmpeg`.", {
        cause: error,
      })
    }
    throw error
  }
}

function readLog(log: string, pattern: RegExp, what: string) {
  const match = pattern.exec(log)
  if (!match) {
    throw new Error(`ffmpeg reported no ${what}.`)
  }
  return match.slice(1).map(Number)
}

export async function detectSpeech(
  file: string,
  options: LocalAlignmentOptions = defaultLocalAlignment
): Promise<Speech> {
  const loudness = await ffmpegLog(file, "volumedetect")
  const [hours, minutes, seconds] = readLog(
    loudness,
    /Duration: (\d+):(\d+):([\d.]+)/,
    "duration"
  )
  const duration = hours * 3600 + minutes * 60 + seconds
  const [meanVolume] = readLog(
    loudness,
    /mean_volume: (-?[\d.]+) dB/,
    "loudness"
  )
  const noise = (meanVolume - options.pauseBelowMean).toFixed(1)
  const log = await ffmpegLog(
    file,
    `silencedetect=noise=${noise}dB:d=${options.minPause}`
  )
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)]
  const silences = [...log.matchAll(/silence_start: (-?[\d.]+)/g)].map(
    (start, index) => ({
      start: Math.max(0, Number(start[1])),
      end: Math.min(duration, Number(ends[index]?.[1] ?? duration)),
    })
  )

  // A sound shorter than `edgeNoise` before the first pause or after the last
  // one is a click, not the voice.
  const leading =
    (silences[0]?.start ?? Infinity) < edgeNoise ? silences.shift() : undefined
  const trailing =
    (silences.at(-1)?.end ?? 0) > duration - edgeNoise
      ? silences.pop()
      : undefined
  const speech = {
    start: leading?.end ?? 0,
    end: trailing?.start ?? duration,
    pauses: silences,
    duration,
  }
  if (speech.end <= speech.start) {
    throw new Error(`No voice found in ${file}.`)
  }
  return speech
}

// [0, a, a + b, …]
function runningTotals(values: readonly number[]) {
  const totals = [0]
  let total = 0
  for (const value of values) {
    total += value
    totals.push(total)
  }
  return totals
}

const isSpace = (char: string) => /\s/.test(char)
const isSpoken = (char: string) => /[\p{L}\p{N}]/u.test(char)

function characterWeight(char: string, options: LocalAlignmentOptions) {
  if (/\p{L}/u.test(char)) {
    return 1
  }
  if (/\p{N}/u.test(char)) {
    return options.digitWeight
  }
  return isSpace(char) ? options.spaceWeight : 0
}

function textBreaks(text: string): Break[] {
  const breaks: Break[] = []
  for (let last = 0; last < text.length - 1; last += 1) {
    if (isSpace(text[last]) || !isSpace(text[last + 1])) {
      continue
    }
    let resume = last + 1
    while (resume < text.length && !isSpoken(text[resume])) {
      resume += 1
    }
    if (resume === text.length) {
      break
    }
    const gap = text.slice(last + 1, resume)
    let kind: BreakKind = "word"
    if (/[.!?…»]/.test(text[last]) || gap.includes("\n")) {
      kind = "sentence"
    } else if (/[,;:)–—]/.test(text[last]) || /[–—(]/.test(gap)) {
      kind = "clause"
    }
    breaks.push({ last, resume, kind })
  }
  return breaks
}

// Pairs text breaks with pauses by dynamic programming. Each step goes from one
// pair to the next and pays for the tempo of the text in between, for the
// sentence ends and commas it speaks through, and for the pauses it leaves
// unexplained. Breaks and pauses count from 1 here: 0 is the start of the
// voice, and m + 1, n + 1 its end.
function pairBreaksWithPauses(
  { breaks, weightBefore, weight: totalWeight }: WeightedText,
  { pauses, speechAt, speechTime }: Timeline,
  options: LocalAlignmentOptions
) {
  const m = breaks.length
  const n = pauses.length
  const pace = speechTime / totalWeight

  const breakSkip = {
    sentence: options.skipSentence,
    clause: options.skipClause,
    word: 0,
  }
  const skippedBreaks = runningTotals(breaks.map(({ kind }) => breakSkip[kind]))
  const skippedPauses = runningTotals(
    pauses.map(({ start, end }) => options.skipPause * (end - start))
  )

  const textEnd = (i: number) =>
    i === m + 1 ? totalWeight : weightBefore[breaks[i - 1].last + 1]
  const textResume = (i: number) =>
    i === 0 ? 0 : weightBefore[breaks[i - 1].resume]
  const timeAt = (j: number) => (j === n + 1 ? speechTime : speechAt[j])

  const stepCost = (i0: number, j0: number, i1: number, j1: number) => {
    const weight = textEnd(i1) - textResume(i0)
    const time = timeAt(j1) - timeAt(j0)
    if (weight <= 0 || time <= 0) {
      return Infinity
    }
    const tempo = Math.log(time / (weight * pace))
    const breath =
      i1 <= m && breaks[i1 - 1].kind === "word" ? options.matchWord : 0
    return (
      options.tempo * weight * tempo * tempo +
      (skippedBreaks[i1 - 1] - skippedBreaks[i0]) +
      (skippedPauses[j1 - 1] - skippedPauses[j0]) +
      breath
    )
  }

  const columns = n + 2
  const cost = new Float64Array((m + 2) * columns).fill(Infinity)
  const from = new Int32Array((m + 2) * columns).fill(-1)
  cost[0] = 0
  const relax = (i1: number, j1: number) => {
    const node = i1 * columns + j1
    const firstPause = j1 === n + 1 ? 0 : Math.max(0, j1 - 1 - maxSkippedPauses)
    for (let i0 = 0; i0 < i1; i0 += 1) {
      for (let j0 = firstPause; j0 < j1; j0 += 1) {
        const previous = cost[i0 * columns + j0]
        if (previous === Infinity) {
          continue
        }
        const total = previous + stepCost(i0, j0, i1, j1)
        if (total < cost[node]) {
          cost[node] = total
          from[node] = i0 * columns + j0
        }
      }
    }
  }
  for (let i1 = 1; i1 <= m; i1 += 1) {
    for (let j1 = 1; j1 <= n; j1 += 1) {
      relax(i1, j1)
    }
  }
  relax(m + 1, n + 1)

  const pairs: { breakIndex: number; pauseIndex: number }[] = []
  for (
    let node = from[(m + 1) * columns + n + 1];
    node > 0;
    node = from[node]
  ) {
    pairs.unshift({
      breakIndex: Math.floor(node / columns) - 1,
      pauseIndex: (node % columns) - 1,
    })
  }
  return pairs
}

// Per-character timings for a text read in a recording, from its pauses.
export function alignToSpeech(
  text: string,
  speech: Speech,
  options: LocalAlignmentOptions = defaultLocalAlignment
): CharacterTimes {
  const { pauses } = speech
  const characters = text.split("")
  const weightBefore = runningTotals(
    characters.map((char) => characterWeight(char, options))
  )
  const weight = weightBefore[characters.length]
  if (weight === 0) {
    throw new Error("The narration text has nothing to say.")
  }

  const speechAt = [0]
  let paused = 0
  for (const pause of pauses) {
    speechAt.push(pause.start - speech.start - paused)
    paused += pause.end - pause.start
  }
  const speechTime = speech.end - speech.start - paused

  // Back from speech time to the recording's time, around the pauses: a time
  // right at a pause is its start when something ends there, its end when
  // something starts there.
  const recordingTime = (at: number, edge: "start" | "end") => {
    let time = speech.start + at
    for (let j = 1; j <= pauses.length; j += 1) {
      const past = edge === "start" ? speechAt[j] <= at : speechAt[j] < at
      if (!past) {
        break
      }
      time += pauses[j - 1].end - pauses[j - 1].start
    }
    return time
  }

  const breaks = textBreaks(text)
  const pairs = pairBreaksWithPauses(
    { breaks, weightBefore, weight },
    { pauses, speechAt, speechTime },
    options
  )

  const starts: number[] = []
  const ends: number[] = []
  const anchors = [
    ...pairs.map(({ breakIndex, pauseIndex }) => ({
      last: breaks[breakIndex].last,
      resume: breaks[breakIndex].resume,
      at: speechAt[pauseIndex + 1],
      pause: pauses[pauseIndex],
    })),
    {
      last: text.length - 1,
      resume: text.length,
      at: speechTime,
      pause: undefined,
    },
  ]
  let from = 0
  let fromAt = 0
  for (const anchor of anchors) {
    const stretch = weightBefore[anchor.last + 1] - weightBefore[from]
    const time = anchor.at - fromAt
    for (let index = from; index <= anchor.last; index += 1) {
      const before = (weightBefore[index] - weightBefore[from]) / stretch
      const after = (weightBefore[index + 1] - weightBefore[from]) / stretch
      starts.push(recordingTime(fromAt + before * time, "start"))
      ends.push(recordingTime(fromAt + after * time, "end"))
    }
    // The caption before a pause keeps most of it, and what follows starts
    // when the voice does.
    const pause = anchor.pause
    const hold = pause
      ? pause.start + options.pauseHold * (pause.end - pause.start)
      : Math.min(speech.duration, speech.end + options.endHold)
    ends[anchor.last] = Math.max(ends[anchor.last], hold)
    for (let index = anchor.last + 1; index < anchor.resume; index += 1) {
      starts.push(pause?.end ?? hold)
      ends.push(pause?.end ?? hold)
    }
    from = anchor.resume
    fromAt = anchor.at
  }

  return {
    characters,
    characterStartTimesSeconds: starts,
    characterEndTimesSeconds: ends,
  }
}

export async function alignLocally(
  text: string,
  file: string,
  options: LocalAlignmentOptions = defaultLocalAlignment
) {
  return alignToSpeech(text, await detectSpeech(file, options), options)
}
