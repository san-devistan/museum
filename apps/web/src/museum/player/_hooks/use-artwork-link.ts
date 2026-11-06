import { useMuseumStore } from "@/museum/_lib/museum-store"
import { useEffect } from "react"

const linkKey = "KeyE"

function hasModifier(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey
}

export function useArtworkLink() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== linkKey || event.repeat || hasModifier(event)) {
        return
      }
      const { isPaused, focusedArtwork } = useMuseumStore.getState()
      const link = focusedArtwork?.link
      if (isPaused || !link) {
        return
      }
      event.preventDefault()
      window.open(link, "_blank", "noopener,noreferrer")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])
}
