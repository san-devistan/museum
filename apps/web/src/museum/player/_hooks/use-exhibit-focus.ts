import type { ExhibitSpot } from "@/museum/_lib/exhibit"
import { useMuseumStore } from "@/museum/_lib/museum-store"
import { nearestExhibit } from "@/museum/player/_lib/exhibit-proximity"
import { rememberArtwork } from "@/museum/player/_lib/player-session"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import { Vector3 } from "three"

const focusInterval = 0.1
const forward = new Vector3()

export function useExhibitFocus(exhibits: readonly ExhibitSpot[]) {
  const elapsedRef = useRef(focusInterval)

  useFrame((state, delta) => {
    elapsedRef.current += delta
    if (elapsedRef.current < focusInterval) {
      return
    }
    elapsedRef.current = 0

    state.camera.getWorldDirection(forward)
    const planar = Math.hypot(forward.x, forward.z)
    if (planar < 1e-6) {
      return
    }
    const store = useMuseumStore.getState()
    const label = nearestExhibit(
      exhibits,
      {
        position: { x: state.camera.position.x, z: state.camera.position.z },
        forward: { x: forward.x / planar, z: forward.z / planar },
      },
      store.focusedArtwork
    )
    if (label) {
      rememberArtwork(label)
    }
    store.setFocusedArtwork(label)
  })

  useEffect(
    () => () => {
      useMuseumStore.getState().setFocusedArtwork(null)
    },
    []
  )
}
