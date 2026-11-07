import {
  collectionWorks,
  type CollectionWorkId,
} from "@/museum/collection/collection-works"
import { create } from "zustand"

// Shared contract for the story layer. Other areas read it, so keep these
// names stable: add to them, don't rename them.

export type ChapterId = "envol" | "dedans" | "appetit"

// The three chapters of « Minuit chez Dolla Shashin », in visiting order.
export const chapterWorks = {
  envol: [
    "fashion-chaos-1",
    "fashion-chaos-2",
    "le-monde-onirique",
    "a-swan-in-the-city",
  ],
  dedans: ["requiem", "abysses", "mens-tokyo", "celle-qui-vient-du-dedans"],
  appetit: [
    "le-maraicher",
    "brain",
    "le-dejeuner-sur-l-herbe",
    "cannibal-flowers",
  ],
} as const satisfies Record<ChapterId, readonly CollectionWorkId[]>

const whisperLines = [
  "ikebana-1",
  "ikebana-2",
  "ikebana-3",
  "ikebana-4",
] as const

export type WhisperLineId = (typeof whisperLines)[number]

export type StoryLineId =
  | WhisperLineId
  | "epilogue"
  | "leave-early"
  | "ending-leave"
  | "ending-stay"
  | "return"

// How the visit ended after midnight: walking out of the front door (A), or
// staying before the thirteenth frame (B).
export type EndingId = "leave" | "stay"

// The visitor the house kept (ending B), as the thirteenth frame hangs them
// on every later visit: the night they stayed and the mirror's frozen photo.
export type KeptPortrait = {
  // The visitor's local date, « 2026-11-07 ».
  night: string
  // A small JPEG data URL; null when it could not be kept.
  photo: string | null
}

// Keeps the saved visit well under the browser's storage limit.
export const portraitPhotoMaxLength = 200_000

export const workCount = collectionWorks.length

const workIds: ReadonlySet<string> = new Set(
  collectionWorks.map((work) => work.id)
)

export function isCollectionWorkId(id: string): id is CollectionWorkId {
  return workIds.has(id)
}

// What survives a reload: a visitor who comes back finds the same house.
type SavedStory = {
  woken: readonly CollectionWorkId[]
  whispered: number
  midnight: boolean
  // Entries into the manor; from the second one on, the visitor is back.
  visits: number
  introFinished: boolean
  portrait: KeptPortrait | null
}

type StoryState = SavedStory & {
  lineQueue: readonly StoryLineId[]
  // Lines already played this session. With the queue's head, it names each
  // queued line uniquely, so the same line queued twice plays twice.
  linesSpoken: number
  // The ikebanas' whispers waiting to be breathed. They play apart from the
  // line queue, over whatever speaks, and never hold it up.
  whisperQueue: readonly WhisperLineId[]
  // Whispers already played this session, counted like `linesSpoken`.
  whispersSpoken: number
  // The written objective card, pinned until the next wake or a timeout.
  objectiveShown: boolean
  // The ending this visit took, once midnight has struck. Not saved: each
  // visit after midnight can end either way.
  ending: EndingId | null
  // The artist's last card, shown outside once the goodbye has been said.
  contactShown: boolean
  wake: (id: CollectionWorkId) => void
  whisperNext: () => void
  shiftWhisper: () => void
  queueLine: (id: StoryLineId) => void
  shiftLine: () => void
  strikeMidnight: () => void
  // Called when the visitor steps into the manor (after the door opens).
  beginVisit: () => void
  // Called when the visitor walks out through the front door.
  endVisit: () => void
  // Ending B: the visitor stayed before the thirteenth frame. Once a visit.
  stay: () => void
  // The mirror froze into the kept visitor's portrait.
  hangPortrait: (portrait: KeptPortrait) => void
  dismissContact: () => void
  finishIntro: () => void
  dismissObjective: () => void
  // Forgets the whole visit, saved state included (the kept portrait too).
  // Reload to replay the intro.
  resetVisit: () => void
}

export function isChapterAwake(
  woken: readonly CollectionWorkId[],
  chapter: ChapterId
): boolean {
  const awake: ReadonlySet<CollectionWorkId> = new Set(woken)
  return chapterWorks[chapter].every((id) => awake.has(id))
}

export function isEveryWorkAwake(woken: readonly CollectionWorkId[]) {
  return woken.length >= workCount
}

// The pearls and the objective belong to the game, which starts once the
// intro has set it up, on a return, or as soon as a first image wakes.
export function hasGameStarted({
  introFinished,
  visits,
  woken,
}: Pick<StoryState, "introFinished" | "visits" | "woken">) {
  return introFinished || visits > 1 || woken.length > 0
}

// After midnight, once the house has said all it had to say, the visitor
// chooses: walk out of the open front door, or stay before the mirror. A
// visitor already kept finds their portrait there, not a mirror.
export function canChooseEnding({
  midnight,
  ending,
  lineQueue,
  portrait,
}: Pick<StoryState, "midnight" | "ending" | "lineQueue" | "portrait">) {
  return (
    midnight && ending === null && lineQueue.length === 0 && portrait === null
  )
}

const storageKey = "museum-story-v1"

const freshStory = {
  woken: [],
  whispered: 0,
  midnight: false,
  visits: 0,
  introFinished: false,
  portrait: null,
  lineQueue: [],
  linesSpoken: 0,
  whisperQueue: [],
  whispersSpoken: 0,
  objectiveShown: false,
  ending: null,
  contactShown: false,
} satisfies Omit<StoryState, keyof StoryActions>

type StoryActions = Pick<
  StoryState,
  | "wake"
  | "whisperNext"
  | "shiftWhisper"
  | "queueLine"
  | "shiftLine"
  | "strikeMidnight"
  | "beginVisit"
  | "endVisit"
  | "stay"
  | "hangPortrait"
  | "dismissContact"
  | "finishIntro"
  | "dismissObjective"
  | "resetVisit"
>

const nightPattern = /^\d{4}-\d{2}-\d{2}$/
const photoPrefix = "data:image/jpeg;base64,"

function readPortrait(saved: unknown): KeptPortrait | null {
  if (
    typeof saved !== "object" ||
    saved === null ||
    !("night" in saved) ||
    typeof saved.night !== "string" ||
    !nightPattern.test(saved.night)
  ) {
    return null
  }
  const photo = "photo" in saved ? saved.photo : null
  return {
    night: saved.night,
    photo:
      typeof photo === "string" &&
      photo.startsWith(photoPrefix) &&
      photo.length <= portraitPhotoMaxLength
        ? photo
        : null,
  }
}

function wholeNumber(value: unknown, max: number) {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(Math.max(value, 0), max)
    : 0
}

// Saved state comes from the visitor's browser, so keep only what still makes
// sense (a work removed from the collection, a hand-edited value).
function readSaved(saved: unknown): Partial<SavedStory> {
  if (typeof saved !== "object" || saved === null) {
    return {}
  }
  const woken: readonly unknown[] =
    "woken" in saved && Array.isArray(saved.woken) ? saved.woken : []
  return {
    woken: [
      ...new Set(
        woken.filter(
          (id): id is CollectionWorkId =>
            typeof id === "string" && isCollectionWorkId(id)
        )
      ),
    ],
    whispered: wholeNumber(
      "whispered" in saved ? saved.whispered : 0,
      whisperLines.length
    ),
    midnight: "midnight" in saved && saved.midnight === true,
    visits: wholeNumber(
      "visits" in saved ? saved.visits : 0,
      Number.MAX_SAFE_INTEGER
    ),
    introFinished: "introFinished" in saved && saved.introFinished === true,
    portrait: readPortrait("portrait" in saved ? saved.portrait : null),
  }
}

function loadSaved(): Partial<SavedStory> {
  try {
    const raw = localStorage.getItem(storageKey)
    const saved: unknown = raw === null ? null : JSON.parse(raw)
    return readSaved(saved)
  } catch {
    return {}
  }
}

function save({
  woken,
  whispered,
  midnight,
  visits,
  introFinished,
  portrait,
}: SavedStory) {
  const saved: SavedStory = {
    woken,
    whispered,
    midnight,
    visits,
    introFinished,
    portrait,
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(saved))
  } catch {
    // Private browsing or a full storage: the visit just isn't kept.
    return
  }
}

export const useStoryStore = create<StoryState>()((set) => ({
  ...freshStory,
  ...loadSaved(),
  wake: (id) =>
    set((state) =>
      state.woken.includes(id)
        ? state
        : { woken: [...state.woken, id], objectiveShown: false }
    ),
  // The whispers form one sentence, so the next flower always says the next
  // part, whichever ikebana the visitor passes.
  whisperNext: () =>
    set((state) => {
      const line = whisperLines[state.whispered]
      return line
        ? {
            whispered: state.whispered + 1,
            whisperQueue: [...state.whisperQueue, line],
          }
        : state
    }),
  shiftWhisper: () =>
    set((state) =>
      state.whisperQueue.length > 0
        ? {
            whisperQueue: state.whisperQueue.slice(1),
            whispersSpoken: state.whispersSpoken + 1,
          }
        : state
    ),
  queueLine: (id) => set((state) => ({ lineQueue: [...state.lineQueue, id] })),
  // The goodbye of ending A said, the artist's card comes up.
  shiftLine: () =>
    set((state) =>
      state.lineQueue.length > 0
        ? {
            lineQueue: state.lineQueue.slice(1),
            linesSpoken: state.linesSpoken + 1,
            contactShown:
              state.contactShown ||
              (state.lineQueue[0] === "ending-leave" &&
                state.ending === "leave"),
          }
        : state
    ),
  strikeMidnight: () => set({ midnight: true, objectiveShown: false }),
  // A return greets the visitor in one line if the intro was heard to the
  // end; otherwise the intro itself picks up again. Either way the objective
  // is pinned right away.
  beginVisit: () =>
    set((state) => {
      const visits = state.visits + 1
      const isReturn = visits > 1
      return {
        visits,
        ending: null,
        contactShown: false,
        objectiveShown:
          isReturn && !state.midnight && !isEveryWorkAwake(state.woken),
        lineQueue:
          isReturn && state.introFinished
            ? [...state.lineQueue, "return"]
            : state.lineQueue,
      }
    }),
  // The house says goodbye as the visitor walks out: « déjà ? » before
  // midnight if images are already awake, ending A after it. Ending A cuts
  // in: the line still playing (the epilogue) fades out and the ones still
  // waiting are dropped, counted as spoken. A visitor the house kept
  // (ending B) is put outside without a word.
  endVisit: () =>
    set((state) => {
      if (state.midnight) {
        return state.ending === "stay"
          ? { objectiveShown: false }
          : {
              objectiveShown: false,
              ending: "leave",
              lineQueue: ["ending-leave"],
              linesSpoken: state.linesSpoken + state.lineQueue.length,
            }
      }
      return {
        objectiveShown: false,
        lineQueue:
          state.woken.length > 0
            ? [...state.lineQueue, "leave-early"]
            : state.lineQueue,
      }
    }),
  stay: () =>
    set((state) =>
      state.midnight && state.ending === null ? { ending: "stay" } : state
    ),
  hangPortrait: (portrait) =>
    set((state) => (state.ending === "stay" ? { portrait } : state)),
  dismissContact: () => set({ contactShown: false }),
  finishIntro: () =>
    set((state) =>
      state.introFinished
        ? state
        : {
            introFinished: true,
            objectiveShown: !state.midnight && !isEveryWorkAwake(state.woken),
          }
    ),
  dismissObjective: () => set({ objectiveShown: false }),
  // Dropped lines and whispers still count as spoken, so the ones queued
  // afterwards keep their own place.
  resetVisit: () =>
    set((state) => ({
      ...freshStory,
      linesSpoken: state.linesSpoken + state.lineQueue.length,
      whispersSpoken: state.whispersSpoken + state.whisperQueue.length,
    })),
}))

useStoryStore.subscribe((state, previous) => {
  if (
    state.woken !== previous.woken ||
    state.whispered !== previous.whispered ||
    state.midnight !== previous.midnight ||
    state.visits !== previous.visits ||
    state.introFinished !== previous.introFinished ||
    state.portrait !== previous.portrait
  ) {
    save(state)
  }
})
