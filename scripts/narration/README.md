# Narration

Generates the voices of the gallery with ElevenLabs:

- the intro that greets visitors once the door slams, from
  `apps/web/src/museum/narration/intro.txt`;
- one narration per photograph, from the `statement` of each work in
  `apps/web/src/museum/collection/collection-works.ts`;
- the other lines of the visit (ikebana whispers, epilogue, leaving and
  returning), one per `apps/web/src/museum/narration/lines/<line id>.txt`.

Each narration is two files in `apps/web/src/museum/narration/`:

| Narration | Audio                 | Subtitles                 |
| --------- | --------------------- | ------------------------- |
| Intro     | `intro.mp3`           | `intro-cues.ts`           |
| A work    | `works/<work id>.mp3` | `works/<work id>-cues.ts` |
| A line    | `lines/<line id>.mp3` | `lines/<line id>-cues.ts` |

Works that share a statement (Fashion Chaos I and II) share one recording, saved
under the first work's id (`works/fashion-chaos-1.mp3`); the app plays it for
both. The id of a line is its file name, so a new line is a new `.txt` file.

The subtitles are cues with start and end times built from per-character
timings. The app only plays these files, so visitors never call ElevenLabs and
the API key never reaches the browser.

A work without `works/<work id>.mp3` is simply not narrated: its card keeps
showing the statement. Once the audio exists, the card drops the statement and
the voice reads it when the visitor looks at the photograph.

## Speak through the API

```sh
pnpm narration                       # every narration whose audio is missing
pnpm narration le-maraicher epilogue # only these (`intro` for the intro)
pnpm narration --force requiem       # redo even if the files exist
pnpm narration --dry-run             # list what would be spoken and its cost
```

Text to speech costs one credit per character. The Camille Martin voice comes
from the voice library, which the API only allows on a paid plan: on the free
plan it fails with a 402.

## Align audio made on the website

On the free plan, make the audio on elevenlabs.io instead: paste the exact text
(the statement, `intro.txt` or the line's `.txt`), download the MP3 and save it
under the name in the table above. Then build its subtitles for free, on your
machine:

```sh
pnpm narration --align-local                 # every MP3 without cues for its text
pnpm narration --align-local le-maraicher    # only this one
pnpm narration --align-local --force intro   # redo existing cues
```

This needs `ffmpeg` (`brew install ffmpeg`) and no ElevenLabs credit. ffmpeg
finds the pauses in the voice, then `local-alignment.mts` matches them to the
sentence ends and commas of the text and spreads the words in between. Every
caption starts and ends on a pause, within about 0.1 s of ElevenLabs' own
alignment on the old intro. The text must be what the voice actually says.

`--align` does the same through ElevenLabs forced alignment, which times every
character from the words it hears. It is billed by audio length, about 1.1
credits per second (the 87 s intro cost 98 credits). Use it if the local
captions drift, for example on a recording with music or noise under the voice.

Cues built from an older text count as missing, so after editing a text, put
its new MP3 in place before aligning: aligning would otherwise match the old
audio with the new text.

Needs `ELEVENLABS_API_KEY` in the root `.env.local` (set up with
`npx -y @elevenlabs/cli@latest onboard init`).

## Tuning

Edit the constants at the top of `generate-narration.mts`:

| Constant       | Default               | Effect                                     |
| -------------- | --------------------- | ------------------------------------------ |
| `voiceId`      | Camille Martin        | The narrator's voice (needs a paid plan).  |
| `modelId`      | `eleven_v4`           | ElevenLabs model.                          |
| `audioEffects` | `big_room`, send 0.12 | Light room reverb; remove for a dry voice. |

`maxCueLength` in `narration-cues.mts` sets the longest subtitle line (110
characters).
