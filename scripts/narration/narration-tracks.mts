import { readdir, readFile } from "node:fs/promises"
import { registerHooks } from "node:module"

export type NarrationTrack = {
  id: string
  text: string
  audio: URL
  cues: URL
  cuesExport: string
}

type CollectionWork = { id: string; statement?: string }

const webSrc = new URL("../../apps/web/src/", import.meta.url)
const narrationDir = new URL("museum/narration/", webSrc)
const worksDir = new URL("works/", narrationDir)
const linesDir = new URL("lines/", narrationDir)
const assetFile = /\.(?:jpe?g|png|webp|avif|mp3)$/

// Lets Node import the app's collection file as-is: `@/` points at the web
// source and image imports become plain strings.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(specifier.slice(2), webSrc).href, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (assetFile.test(url)) {
      return {
        format: "module",
        source: `export default ${JSON.stringify(url)}`,
        shortCircuit: true,
      }
    }
    return nextLoad(url, context)
  },
})

function isCollection(
  value: unknown
): value is { collectionWorks: readonly CollectionWork[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "collectionWorks" in value &&
    Array.isArray(value.collectionWorks)
  )
}

async function collectionWorks() {
  const url = new URL("museum/collection/collection-works.ts", webSrc)
  const collection: unknown = await import(url.href)
  if (!isCollection(collection)) {
    throw new Error(`No collectionWorks exported by ${url.pathname}`)
  }
  return collection.collectionWorks
}

// A narration whose text sits next to its audio: `intro.txt` and
// `lines/<id>.txt`.
async function textTrack(
  dir: URL,
  id: string,
  cuesExport: string
): Promise<NarrationTrack> {
  return {
    id,
    text: (await readFile(new URL(`${id}.txt`, dir), "utf8")).trim(),
    audio: new URL(`${id}.mp3`, dir),
    cues: new URL(`${id}-cues.ts`, dir),
    cuesExport,
  }
}

// Works that share a statement (Fashion Chaos I and II) share one recording,
// saved under the first work's id. The app looks it up the same way.
function workTracks(works: readonly CollectionWork[]) {
  const tracks = new Map<string, NarrationTrack>()
  for (const work of works) {
    const text = work.statement?.trim()
    if (text && !tracks.has(text)) {
      tracks.set(text, {
        id: work.id,
        text,
        audio: new URL(`${work.id}.mp3`, worksDir),
        cues: new URL(`${work.id}-cues.ts`, worksDir),
        cuesExport: "workCues",
      })
    }
  }
  return [...tracks.values()]
}

async function lineTracks() {
  const ids = (await readdir(linesDir))
    .filter((name) => name.endsWith(".txt"))
    .map((name) => name.slice(0, -".txt".length))
    .toSorted()
  return Promise.all(ids.map((id) => textTrack(linesDir, id, "lineCues")))
}

export async function narrationTracks(): Promise<NarrationTrack[]> {
  return [
    await textTrack(narrationDir, "intro", "introCues"),
    ...workTracks(await collectionWorks()),
    ...(await lineTracks()),
  ]
}
