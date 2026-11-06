import type { Random } from "@/museum/_lib/relief/height-field"

// One letter of the failing sign. It burns steady until the sign makes it
// fail: an unstable spell (stutters, dropouts, a dim buzz), or a death (a
// last stutter, a few seconds dark, then sputtering back with an arc).

export type Range = readonly [min: number, max: number]

type LetterMode = "steady" | "unstable" | "dying" | "dead" | "reviving"

/** How a letter misbehaves during one unstable spell. */
type Temper = {
  /** How long it holds lit between cuts. */
  on: Range
  /** How long a quick cut lasts. */
  off: Range
  /** Chance a cut becomes a longer dropout. */
  dropout: number
  /** Its level while lit. */
  glow: Range
  /** Depth of the dim shimmer while lit. */
  buzz: Range
}

const tempers: readonly Temper[] = [
  // Stutters: quick cuts, lit near full.
  {
    on: [0.04, 0.32],
    off: [0.025, 0.09],
    dropout: 0.12,
    glow: [0.85, 1],
    buzz: [0, 0.08],
  },
  // A dim buzz, rarely cut.
  {
    on: [0.35, 1.6],
    off: [0.03, 0.07],
    dropout: 0.05,
    glow: [0.45, 0.75],
    buzz: [0.12, 0.3],
  },
  // Both, with long dropouts.
  {
    on: [0.08, 0.7],
    off: [0.03, 0.12],
    dropout: 0.32,
    glow: [0.6, 0.95],
    buzz: [0.04, 0.18],
  },
]

export const letterTiming = {
  spell: [0.6, 4.5],
  dropout: [0.12, 0.5],
  cutLevel: [0, 0.12],
  rest: [2, 9],
  dying: [2, 6],
  dead: [2.2, 6.5],
  reviving: [4, 11],
  revivedRest: [5, 12],
  quickToggle: [0.035, 0.15],
  firstRest: [0, 2.5],
  dyingGlow: [0.4, 1],
  strikeGlow: [0.6, 1],
  strikeHold: [0.02, 0.06],
  sputterJitter: [0.5, 1.5],
} satisfies Record<string, Range>

export type ArcSpec = { chance: number; strength: Range }

/** Chance and strength of the arc each failure throws. */
const arcs = {
  spell: { chance: 0.18, strength: [0.15, 0.5] },
  death: { chance: 0.45, strength: [0.2, 0.45] },
  strike: { chance: 0.85, strength: [0.6, 1] },
  sputter: { chance: 0.12, strength: [0.25, 0.55] },
} satisfies Record<string, ArcSpec>

export const maxTransitions = 4

export type Letter = {
  index: number
  mode: LetterMode
  temper: Temper
  on: boolean
  glow: number
  cut: number
  buzz: number
  level: number
  /** Time to the next toggle. */
  timer: number
  /** Time left in an unstable spell. */
  remaining: number
  /** Toggles left while dying or reviving. */
  toggles: number
  total: number
  /** Time before the letter may fail again. */
  rest: number
}

/** The sign a letter fails on: its random stream and this step's arc. */
export type FailingSign = {
  random: Random
  levels: Float32Array
  arc: number
  arcStrength: number
}

export function between(random: Random, [min, max]: Range) {
  return min + (max - min) * random()
}

function chooseTemper(random: Random) {
  return tempers[Math.floor(random() * tempers.length)] ?? tempers[0]
}

/** Keeps the strongest arc thrown on this step. */
export function throwArc(sign: FailingSign, letter: number, strength: number) {
  if (strength > sign.arcStrength) {
    sign.arc = letter
    sign.arcStrength = strength
  }
}

export function maybeArc(sign: FailingSign, letter: number, spec: ArcSpec) {
  if (sign.random() < spec.chance) {
    throwArc(sign, letter, between(sign.random, spec.strength))
  }
}

export function settleLetter(letter: Letter, rest: Range, random: Random) {
  letter.mode = "steady"
  letter.on = true
  letter.level = 1
  letter.rest = between(random, rest)
}

export const isRested = (letter: Letter) =>
  letter.mode === "steady" && letter.rest <= 0

export const isUnstable = (letter: Letter) => letter.mode === "unstable"

export const isFailing = (letter: Letter) =>
  letter.mode === "dying" ||
  letter.mode === "dead" ||
  letter.mode === "reviving"

export function createLetter(index: number, random: Random): Letter {
  return {
    index,
    mode: "steady",
    temper: chooseTemper(random),
    on: true,
    glow: 1,
    cut: 0,
    buzz: 0,
    level: 1,
    timer: 0,
    remaining: 0,
    toggles: 0,
    total: 0,
    rest: between(random, letterTiming.firstRest),
  }
}

export function startSpell(sign: FailingSign, letter: Letter) {
  const { random } = sign
  letter.mode = "unstable"
  letter.temper = chooseTemper(random)
  letter.glow = between(random, letter.temper.glow)
  letter.buzz = between(random, letter.temper.buzz)
  letter.remaining = between(random, letterTiming.spell)
  letter.on = random() < 0.5
  letter.cut = between(random, letterTiming.cutLevel)
  letter.timer = between(
    random,
    letter.on ? letter.temper.on : letter.temper.off
  )
  maybeArc(sign, letter.index, arcs.spell)
}

export function startDying(sign: FailingSign, letter: Letter) {
  letter.mode = "dying"
  letter.on = false
  letter.cut = between(sign.random, letterTiming.cutLevel)
  letter.toggles = Math.round(between(sign.random, letterTiming.dying))
  letter.timer = between(sign.random, letterTiming.quickToggle)
}

function toggleSpell(sign: FailingSign, letter: Letter) {
  const { random } = sign
  const { temper } = letter
  if (letter.remaining <= 0) {
    settleLetter(letter, letterTiming.rest, random)
    return
  }
  letter.on = !letter.on
  if (letter.on) {
    letter.glow = between(random, temper.glow)
    letter.timer = between(random, temper.on)
  } else {
    const isDropout = random() < temper.dropout
    letter.cut = between(random, letterTiming.cutLevel)
    letter.timer = between(
      random,
      isDropout ? letterTiming.dropout : temper.off
    )
  }
}

function toggleDying(sign: FailingSign, letter: Letter) {
  const { random } = sign
  if (letter.toggles <= 0) {
    letter.mode = "dead"
    letter.on = false
    letter.cut = 0
    letter.timer = between(random, letterTiming.dead)
    maybeArc(sign, letter.index, arcs.death)
    return
  }
  letter.toggles -= 1
  letter.on = !letter.on
  letter.glow = between(random, letterTiming.dyingGlow)
  letter.cut = between(random, letterTiming.cutLevel)
  letter.timer = between(random, letterTiming.quickToggle)
}

function revive(sign: FailingSign, letter: Letter) {
  letter.mode = "reviving"
  letter.total = Math.round(between(sign.random, letterTiming.reviving))
  letter.toggles = letter.total
  letter.on = true
  letter.glow = between(sign.random, letterTiming.strikeGlow)
  letter.timer = between(sign.random, letterTiming.strikeHold)
  maybeArc(sign, letter.index, arcs.strike)
}

/** Sputtering back: cuts shorten and holds lengthen as the tube catches. */
function toggleReviving(sign: FailingSign, letter: Letter) {
  const { random } = sign
  if (letter.toggles <= 0) {
    settleLetter(letter, letterTiming.revivedRest, random)
    return
  }
  const caught = 1 - letter.toggles / Math.max(1, letter.total)
  const jitter = between(random, letterTiming.sputterJitter)
  letter.toggles -= 1
  letter.on = !letter.on
  if (letter.on) {
    const dimmest = 0.5 + 0.4 * caught
    letter.glow = dimmest + (1 - dimmest) * random()
    letter.timer = (0.02 + 0.22 * caught) * jitter
    maybeArc(sign, letter.index, arcs.sputter)
  } else {
    letter.cut = between(random, letterTiming.cutLevel)
    letter.timer = (0.18 - 0.14 * caught) * jitter
  }
}

function advanceLetter(sign: FailingSign, letter: Letter) {
  switch (letter.mode) {
    case "unstable":
      toggleSpell(sign, letter)
      break
    case "dying":
      toggleDying(sign, letter)
      break
    case "dead":
      revive(sign, letter)
      break
    case "reviving":
      toggleReviving(sign, letter)
      break
    case "steady":
      break
  }
}

function letterLevel(sign: FailingSign, letter: Letter) {
  if (letter.mode === "steady") {
    return 1
  }
  if (letter.mode === "dead") {
    return 0
  }
  if (!letter.on) {
    return letter.cut
  }
  // Only an unstable letter buzzes; a dying or reviving one cuts clean.
  const buzz = letter.mode === "unstable" ? letter.buzz * sign.random() : 0
  return letter.glow * (1 - buzz)
}

function isActive(letter: Letter) {
  return letter.mode !== "steady"
}

/** Advances one letter and writes its level into the sign. */
export function stepLetter(sign: FailingSign, letter: Letter, delta: number) {
  letter.rest -= delta
  if (isActive(letter)) {
    letter.remaining -= delta
    letter.timer -= delta
    let transitions = 0
    while (
      isActive(letter) &&
      letter.timer <= 0 &&
      transitions < maxTransitions
    ) {
      advanceLetter(sign, letter)
      transitions += 1
    }
  }
  letter.level = letterLevel(sign, letter)
  sign.levels[letter.index] = letter.level
}
