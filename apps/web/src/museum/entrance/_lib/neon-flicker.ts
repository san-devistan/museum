import { createRandom, type Random } from "@/museum/_lib/relief/height-field"
import {
  between,
  createLetter,
  isFailing,
  isRested,
  isUnstable,
  letterTiming,
  maxTransitions,
  maybeArc,
  settleLetter,
  startDying,
  startSpell,
  stepLetter,
  throwArc,
  type ArcSpec,
  type Letter,
  type Range,
} from "@/museum/entrance/_lib/neon-letter"

// A failing sign with no loop in it. Most letters burn steady; at any moment
// a few random ones stutter, drop out or buzz dim, now and then one dies for
// a few seconds and sputters back, and arcs jump to random letters. Every
// wait is drawn fresh from the sign's random stream, so nothing repeats.

const timing = {
  retarget: [1.5, 6],
  stagger: [0.15, 1.4],
  firstStagger: [0.4, 1.6],
  firstDeath: [5, 12],
  death: [8, 24],
  deathRetry: [1.5, 5],
  zap: [3, 12],
  firstZap: [1.5, 5],
  zapEcho: [0.1, 0.45],
  echoFade: [0.4, 1],
  dip: [12, 32],
  firstDip: [6, 16],
  dipToggles: [2, 5],
  dipLevel: [0.55, 0.85],
} satisfies Record<string, Range>

/** Chances of 0, 1, 2 or 3 letters being unstable at once. */
const unstableWeights = [0.16, 0.4, 0.3, 0.14]

/** A sag in the supply throws an arc now and then. */
const dipArc: ArcSpec = { chance: 0.35, strength: [0.3, 0.7] }

/** Stray zaps, mostly on a letter already failing, sometimes echoed. */
const zaps = { onUnstable: 0.65, echo: 0.3, strength: [0.2, 0.85] as Range }

type Dip = {
  active: boolean
  timer: number
  toggles: number
  level: number
}

type Director = {
  target: number
  retarget: number
  stagger: number
  death: number
  zap: number
  echo: number
  echoLetter: number
  echoStrength: number
  dip: Dip
}

export type NeonFlickerSpec = {
  /** Every character of the name, spaces included. */
  letterCount: number
  /** Indices of the characters that have a tube. */
  glyphs: readonly number[]
  seed: number
}

export type NeonFlicker = {
  /** Per-character level, 0 (dark) to 1 (full). */
  levels: Float32Array
  /** The whole sign's supply, dipping now and then. */
  master: number
  brightness: number
  /** Letter an arc hit on this step, or -1; `arcStrength` from 0 to 1. */
  arc: number
  arcStrength: number
  /** The one letter left dark on a steady (reduced motion) sign. */
  restingDead: number
  letters: readonly Letter[]
  director: Director
  random: Random
}

function chooseUnstableCount(random: Random) {
  let roll = random()
  for (let count = 0; count < unstableWeights.length; count += 1) {
    roll -= unstableWeights[count] ?? 0
    if (roll <= 0) {
      return count
    }
  }
  return 1
}

/** Counts letters matching `test`, then returns the `pick`-th one. */
function pickLetter(
  flicker: NeonFlicker,
  test: (letter: Letter) => boolean
): Letter | null {
  let count = 0
  for (const letter of flicker.letters) {
    if (test(letter)) {
      count += 1
    }
  }
  if (count === 0) {
    return null
  }
  let pick = Math.floor(flicker.random() * count)
  for (const letter of flicker.letters) {
    if (test(letter)) {
      if (pick === 0) {
        return letter
      }
      pick -= 1
    }
  }
  return null
}

const isAny = () => true

function countLetters(flicker: NeonFlicker, test: (letter: Letter) => boolean) {
  let count = 0
  for (const letter of flicker.letters) {
    if (test(letter)) {
      count += 1
    }
  }
  return count
}

/** Throws a zap at a random letter, sometimes echoed a beat later. */
function zap(flicker: NeonFlicker) {
  const { random, director } = flicker
  const unstable =
    random() < zaps.onUnstable ? pickLetter(flicker, isUnstable) : null
  const target = unstable ?? pickLetter(flicker, isAny)
  if (!target) {
    return
  }
  const strength = between(random, zaps.strength)
  throwArc(flicker, target.index, strength)
  if (random() < zaps.echo) {
    director.echo = between(random, timing.zapEcho)
    director.echoLetter = target.index
    director.echoStrength = strength * between(random, timing.echoFade)
  }
}

/** A sag in the whole sign's supply: a few dim flickers, then full again. */
function stepDip(flicker: NeonFlicker, delta: number) {
  const { dip } = flicker.director
  const { random } = flicker
  dip.timer -= delta
  let transitions = 0
  while (dip.timer <= 0 && transitions < maxTransitions) {
    transitions += 1
    if (!dip.active) {
      dip.active = true
      dip.toggles = Math.round(between(random, timing.dipToggles))
      dip.level = between(random, timing.dipLevel)
      dip.timer = between(random, letterTiming.quickToggle)
      const target = pickLetter(flicker, isAny)
      if (target) {
        maybeArc(flicker, target.index, dipArc)
      }
    } else if (dip.toggles > 0) {
      dip.toggles -= 1
      dip.level = dip.level < 1 ? 1 : between(random, timing.dipLevel)
      dip.timer = between(random, letterTiming.quickToggle)
    } else {
      dip.active = false
      dip.level = 1
      dip.timer = between(random, timing.dip)
    }
  }
  flicker.master = dip.level
}

function direct(flicker: NeonFlicker, delta: number) {
  const { director, random } = flicker
  director.retarget -= delta
  if (director.retarget <= 0) {
    director.target = chooseUnstableCount(random)
    director.retarget = between(random, timing.retarget)
  }
  director.stagger -= delta
  if (
    director.stagger <= 0 &&
    countLetters(flicker, isUnstable) < director.target
  ) {
    const letter = pickLetter(flicker, isRested)
    if (letter) {
      startSpell(flicker, letter)
    }
    director.stagger = between(random, timing.stagger)
  }
  director.death -= delta
  if (director.death <= 0) {
    const letter =
      countLetters(flicker, isFailing) === 0
        ? pickLetter(flicker, isRested)
        : null
    if (letter) {
      startDying(flicker, letter)
    }
    director.death = between(random, letter ? timing.death : timing.deathRetry)
  }
  director.zap -= delta
  if (director.zap <= 0) {
    zap(flicker)
    director.zap = between(random, timing.zap)
  }
  if (director.echo > 0) {
    director.echo -= delta
    if (director.echo <= 0) {
      throwArc(flicker, director.echoLetter, director.echoStrength)
    }
  }
}

function measureBrightness(flicker: NeonFlicker) {
  let total = 0
  for (const letter of flicker.letters) {
    total += letter.level
  }
  const count = flicker.letters.length
  flicker.brightness = count > 0 ? (total / count) * flicker.master : 0
}

export function createNeonFlicker(spec: NeonFlickerSpec): NeonFlicker {
  const random = createRandom(spec.seed)
  const letters = spec.glyphs.map((index) => createLetter(index, random))
  const restingDead =
    spec.glyphs[Math.floor(random() * spec.glyphs.length)] ?? -1
  return {
    levels: new Float32Array(spec.letterCount).fill(1),
    master: 1,
    brightness: 1,
    arc: -1,
    arcStrength: 0,
    restingDead,
    letters,
    random,
    director: {
      target: 0,
      retarget: 0,
      stagger: between(random, timing.firstStagger),
      death: between(random, timing.firstDeath),
      zap: between(random, timing.firstZap),
      echo: 0,
      echoLetter: -1,
      echoStrength: 0,
      dip: {
        active: false,
        timer: between(random, timing.firstDip),
        toggles: 0,
        level: 1,
      },
    },
  }
}

/** Advances every letter; `arc` and `arcStrength` describe this step. */
export function stepNeonFlicker(flicker: NeonFlicker, delta: number) {
  flicker.arc = -1
  flicker.arcStrength = 0
  direct(flicker, delta)
  for (const letter of flicker.letters) {
    stepLetter(flicker, letter, delta)
  }
  stepDip(flicker, delta)
  measureBrightness(flicker)
}

/** Steady sign for reduced motion: every letter lit but one dead. */
export function settleNeonFlicker(flicker: NeonFlicker) {
  for (const letter of flicker.letters) {
    letter.level = letter.index === flicker.restingDead ? 0 : 1
    flicker.levels[letter.index] = letter.level
  }
  flicker.master = 1
  flicker.arc = -1
  flicker.arcStrength = 0
  measureBrightness(flicker)
}

/** Every letter lit and holding: the sign once midnight has struck. */
export function healNeonFlicker(flicker: NeonFlicker) {
  for (const letter of flicker.letters) {
    settleLetter(letter, letterTiming.rest, flicker.random)
  }
  flicker.levels.fill(1)
  flicker.master = 1
  flicker.director.dip.active = false
  flicker.director.dip.level = 1
  flicker.director.dip.toggles = 0
  flicker.director.echo = 0
  flicker.arc = -1
  flicker.arcStrength = 0
  measureBrightness(flicker)
}
