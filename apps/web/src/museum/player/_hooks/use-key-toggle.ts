import { useEffect, useState } from "react"

function hasModifier(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey
}

// Flips on each press of the physical key `code` while `isActive`; starts off.
export function useKeyToggle(code: string, isActive: boolean) {
  const [isOn, setIsOn] = useState(false)

  useEffect(() => {
    const target = isActive ? window : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== code || event.repeat || hasModifier(event)) {
        return
      }
      event.preventDefault()
      setIsOn((value) => !value)
    }
    target?.addEventListener("keydown", onKeyDown)
    return () => {
      target?.removeEventListener("keydown", onKeyDown)
    }
  }, [code, isActive])

  return isOn
}
