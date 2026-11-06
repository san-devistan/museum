import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"
import { access, mkdir, writeFile } from "node:fs/promises"

type SoundEffect = {
  file: string
  dir: URL
  text: string
  durationSeconds: number
  promptInfluence: number
  loop?: boolean
}

const museumDir = new URL("../../apps/web/src/museum/", import.meta.url)
const entranceDir = new URL("entrance/", museumDir)
const ambienceDir = new URL("ambience/sounds/", museumDir)

const carpetStep =
  "A single soft muffled footstep on thick plush carpet, one dull padded step, close and quiet, dry"

const effects: readonly SoundEffect[] = [
  {
    file: "door-slam.mp3",
    dir: entranceDir,
    text: "A heavy old wooden double door slams shut violently behind you in a vast empty hall, one deep booming impact, latch rattle, long dark reverb tail, horror movie jump scare",
    durationSeconds: 3,
    promptInfluence: 0.6,
  },
  {
    file: "door-creak.mp3",
    dir: entranceDir,
    text: "A heavy old wooden door slowly creaks open in a quiet empty hall, long eerie hinge creak, horror movie",
    durationSeconds: 2.5,
    promptInfluence: 0.6,
  },
  {
    file: "exterior-night.mp3",
    dir: ambienceDir,
    text: "Quiet empty city street at night, steady soft cold wind brushing past a stone facade, very distant low city traffic hum, calm lonely nocturnal ambience",
    durationSeconds: 10,
    promptInfluence: 0.5,
    loop: true,
  },
  {
    file: "neon-buzz.mp3",
    dir: ambienceDir,
    text: "Close-up electrical hum of an old neon sign, steady low mains buzz with a faint high transformer whine and tiny irregular crackles",
    durationSeconds: 6,
    promptInfluence: 0.6,
    loop: true,
  },
  {
    file: "neon-crackle.mp3",
    dir: ambienceDir,
    text: "A failing neon tube sputters, short sharp electrical spark crackle and stuttering buzz, close up",
    durationSeconds: 1.5,
    promptInfluence: 0.6,
  },
  {
    file: "gallery-drone.mp3",
    dir: ambienceDir,
    text: "Dark uneasy room tone of a vast empty museum hall at night, low droning air, deep subtle rumble, faint eerie hiss, slow horror film ambience",
    durationSeconds: 12,
    promptInfluence: 0.5,
    loop: true,
  },
  {
    file: "carpet-step-1.mp3",
    dir: ambienceDir,
    text: carpetStep,
    durationSeconds: 0.7,
    promptInfluence: 0.7,
  },
  {
    file: "carpet-step-2.mp3",
    dir: ambienceDir,
    text: carpetStep,
    durationSeconds: 0.7,
    promptInfluence: 0.7,
  },
  {
    file: "carpet-step-3.mp3",
    dir: ambienceDir,
    text: carpetStep,
    durationSeconds: 0.7,
    promptInfluence: 0.7,
  },
  {
    file: "chandelier-tinkle.mp3",
    dir: ambienceDir,
    text: "Delicate crystal chandelier prisms softly tinkling and clinking together, stirred by a faint draft in a silent hall, sparse glassy chimes, airy reverb",
    durationSeconds: 3,
    promptInfluence: 0.55,
  },
  {
    file: "wood-creak.mp3",
    dir: ambienceDir,
    text: "A single long slow creak of old wooden floorboards under weight somewhere in a large silent hall, distant, reverberant, eerie",
    durationSeconds: 3,
    promptInfluence: 0.55,
  },
  {
    file: "whisper.mp3",
    dir: ambienceDir,
    text: "A faint breathy ghostly whisper, unintelligible hushed words fading away in a large dark empty hall, distant reverb, eerie",
    durationSeconds: 3,
    promptInfluence: 0.5,
  },
]

async function exists(url: URL) {
  try {
    await access(url)
    return true
  } catch {
    return false
  }
}

async function selectEffects(names: readonly string[]) {
  if (names.length > 0) {
    const unknown = names.filter(
      (name) => !effects.some((effect) => effect.file === name)
    )
    if (unknown.length > 0) {
      throw new Error(`Unknown sound effects: ${unknown.join(", ")}`)
    }
    return effects.filter((effect) => names.includes(effect.file))
  }
  const missing: SoundEffect[] = []
  for (const effect of effects) {
    if (await exists(new URL(effect.file, effect.dir))) {
      console.log(`${effect.file}: exists, skipped`)
    } else {
      missing.push(effect)
    }
  }
  return missing
}

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is missing. Run `pnpm sound-effects`.")
}

const client = new ElevenLabsClient()

for (const effect of await selectEffects(process.argv.slice(2))) {
  const audio = await client.textToSoundEffects.convert({
    text: effect.text,
    modelId: "eleven_text_to_sound_v3",
    durationSeconds: effect.durationSeconds,
    promptInfluence: effect.promptInfluence,
    loop: effect.loop ?? false,
    outputFormat: "mp3_44100_128",
  })
  const bytes = Buffer.from(await new Response(audio).arrayBuffer())
  await mkdir(effect.dir, { recursive: true })
  await writeFile(new URL(effect.file, effect.dir), bytes)
  console.log(`${effect.file}: ${bytes.length} bytes`)
}
