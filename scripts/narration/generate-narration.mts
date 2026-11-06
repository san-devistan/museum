import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import { alignLocally } from "./local-alignment.mts"
import {
  buildCues,
  cuesMatchText,
  cuesModule,
  timesForText,
  type Cue,
} from "./narration-cues.mts"
import { narrationTracks, type NarrationTrack } from "./narration-tracks.mts"

type Mode = "speak" | "align" | "align-local"
type Recording = { audio: Buffer; cues: Cue[] }

// Camille Martin: calm, deep native French narrator from the ElevenLabs voice
// library. Library voices need a paid ElevenLabs plan through the API.
const voiceId = "hFgOzpmS0CMtL2to8sAl"
const speech = {
  modelId: "eleven_v4",
  languageCode: "fr",
  outputFormat: "mp3_44100_128",
  voiceSettings: { stability: 0.55, similarityBoost: 0.75 },
  audioEffects: { environmentId: "big_room", sendLevel: 0.12 },
} as const

const { values: flags, positionals: ids } = parseArgs({
  allowPositionals: true,
  options: {
    align: { type: "boolean", default: false },
    "align-local": { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
})
function readMode(): Mode {
  if (flags["align-local"]) {
    return "align-local"
  }
  return flags.align ? "align" : "speak"
}
const mode = readMode()

async function exists(url: URL) {
  try {
    await access(url)
    return true
  } catch {
    return false
  }
}

function selectTracks(tracks: readonly NarrationTrack[]) {
  if (ids.length === 0) {
    return tracks
  }
  const unknown = ids.filter((id) => !tracks.some((track) => track.id === id))
  if (unknown.length > 0) {
    const known = tracks.map((track) => track.id).join(", ")
    throw new Error(`Unknown narration: ${unknown.join(", ")}. Known: ${known}`)
  }
  return tracks.filter((track) => ids.includes(track.id))
}

// Cues built from an older text count as missing, so a changed text gets
// aligned again once its new audio is in place.
async function hasCurrentCues(track: NarrationTrack) {
  if (!(await exists(track.cues))) {
    return false
  }
  const module: Record<string, unknown> = await import(track.cues.href)
  const cues = module[track.cuesExport]
  return Array.isArray(cues) && cuesMatchText(cues, track.text)
}

// Returns why a track is skipped, or null when it needs work.
async function skipReason(track: NarrationTrack) {
  const hasAudio = await exists(track.audio)
  if (mode !== "speak") {
    if (!hasAudio) {
      return "no audio yet"
    }
    return !flags.force && (await hasCurrentCues(track)) ? "cues exist" : null
  }
  if (!hasAudio || flags.force) {
    return null
  }
  return (await hasCurrentCues(track))
    ? "exists"
    : "audio exists without cues for this text, run with --align"
}

function describe(track: NarrationTrack, cues: readonly Cue[]) {
  const duration = cues.at(-1)?.end ?? 0
  return `${track.id}: ${track.text.length} characters, ${cues.length} captions, ${duration.toFixed(1)}s`
}

async function save(track: NarrationTrack, recording: Recording) {
  await mkdir(new URL(".", track.audio), { recursive: true })
  if (mode === "speak") {
    await writeFile(track.audio, recording.audio)
  }
  await writeFile(track.cues, cuesModule(track.cuesExport, recording.cues))
  console.log(describe(track, recording.cues))
}

async function speak(
  client: ElevenLabsClient,
  track: NarrationTrack
): Promise<Recording> {
  try {
    const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
      ...speech,
      text: track.text,
    })
    if (!response.alignment) {
      throw new Error("ElevenLabs returned no character alignment.")
    }
    return {
      audio: Buffer.from(response.audioBase64, "base64"),
      cues: buildCues(track.text, response.alignment),
    }
  } catch (error) {
    if (error instanceof ElevenLabsError && error.statusCode === 402) {
      throw new Error(
        "ElevenLabs refused the voice (402): library voices need a paid plan. Make the MP3 on elevenlabs.io instead, then run `pnpm narration --align`.",
        { cause: error }
      )
    }
    throw error
  }
}

async function align(
  client: ElevenLabsClient,
  track: NarrationTrack
): Promise<Recording> {
  const audio = await readFile(track.audio)
  const result = await client.forcedAlignment.create({
    file: new Blob([audio], { type: "audio/mpeg" }),
    text: track.text,
  })
  return {
    audio,
    cues: buildCues(track.text, timesForText(track.text, result.characters)),
  }
}

// Free: matches the text to the pauses ffmpeg finds in the audio.
async function alignLocal(track: NarrationTrack): Promise<Recording> {
  const audio = await readFile(track.audio)
  const times = await alignLocally(track.text, fileURLToPath(track.audio))
  return { audio, cues: buildCues(track.text, times) }
}

const pending: NarrationTrack[] = []
for (const track of selectTracks(await narrationTracks())) {
  const reason = await skipReason(track)
  if (reason) {
    console.log(`${track.id}: ${reason}, skipped`)
  } else {
    pending.push(track)
  }
}

if (flags["dry-run"] && mode !== "speak") {
  const names = pending.map((track) => track.id).join(", ") || "nothing"
  console.log(`Would align: ${names}`)
} else if (flags["dry-run"]) {
  for (const track of pending) {
    console.log(`${track.id}: ${track.text.length} characters`)
  }
  const characters = pending.reduce((sum, track) => sum + track.text.length, 0)
  console.log(`Would speak: ${characters} characters`)
} else if (mode === "align-local") {
  for (const track of pending) {
    await save(track, await alignLocal(track))
  }
} else if (pending.length > 0) {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is missing. Run `pnpm narration`.")
  }
  const client = new ElevenLabsClient()
  for (const track of pending) {
    const recording = await (mode === "speak"
      ? speak(client, track)
      : align(client, track))
    await save(track, recording)
  }
}
