import { useEffect } from "react"
import { create } from "zustand"

export type KeyboardLayout = "qwerty" | "azerty"

// The letters each layout prints on the physical keys the game listens to.
export const keyLabels = {
  qwerty: { KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D", KeyQ: "Q" },
  azerty: { KeyW: "Z", KeyA: "Q", KeyS: "S", KeyD: "D", KeyQ: "A" },
} as const satisfies Record<KeyboardLayout, Record<string, string>>

// The character a physical key types tells the two layouts apart.
const layoutHints: Readonly<
  Record<string, Readonly<Record<string, KeyboardLayout>>>
> = {
  KeyW: { w: "qwerty", z: "azerty" },
  KeyA: { a: "qwerty", q: "azerty" },
  KeyQ: { q: "qwerty", a: "azerty" },
}

function layoutFromKey(code: string, key: string) {
  return layoutHints[code]?.[key.toLowerCase()] ?? null
}

// Before any keypress, French visitors most likely type on AZERTY.
function guessLayout(): KeyboardLayout {
  if (typeof navigator === "undefined") {
    return "qwerty"
  }
  return navigator.language.toLowerCase().startsWith("fr") ? "azerty" : "qwerty"
}

type LayoutMapKeyboard = {
  getLayoutMap?: () => Promise<ReadonlyMap<string, string>>
}

// Chromium knows the active layout without waiting for a keypress.
async function readLayoutMap() {
  const { keyboard } = navigator as Navigator & { keyboard?: LayoutMapKeyboard }
  if (!keyboard?.getLayoutMap) {
    return null
  }
  try {
    const map = await keyboard.getLayoutMap()
    const key = map.get("KeyW")
    return key === undefined ? null : layoutFromKey("KeyW", key)
  } catch {
    return null
  }
}

// Kept for the whole visit: the layout does not change between rooms.
const useLayoutStore = create<{ known: KeyboardLayout | null }>()(() => ({
  known: null,
}))

function learnLayout(layout: KeyboardLayout | null) {
  if (layout && useLayoutStore.getState().known === null) {
    useLayoutStore.setState({ known: layout })
  }
}

async function learnFromLayoutMap() {
  learnLayout(await readLayoutMap())
}

function learnFromKeyDown(event: KeyboardEvent) {
  learnLayout(layoutFromKey(event.code, event.key))
}

// The visitor's layout: read from the keyboard where the browser allows it,
// otherwise learned from the first telling keypress, guessed until then.
export function useKeyboardLayout(): KeyboardLayout {
  const known = useLayoutStore((state) => state.known)

  useEffect(() => {
    const target = known === null ? window : null
    if (target) {
      void learnFromLayoutMap()
    }
    target?.addEventListener("keydown", learnFromKeyDown)
    return () => {
      target?.removeEventListener("keydown", learnFromKeyDown)
    }
  }, [known])

  return known ?? guessLayout()
}
