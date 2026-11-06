import { useMuseumStore } from "@/museum/_lib/museum-store"
import { isMovementCode } from "@/museum/player/_lib/movement-keys"
import { applyLookDelta } from "@/museum/player/_lib/player-look"
import type { PlayerRig } from "@/museum/player/_lib/player-rig"
import {
  requestPlayerPointerLock,
  setPointerLockTarget,
} from "@/museum/player/_lib/pointer-lock"
import { useThree } from "@react-three/fiber"
import { useEffect, useRef, type RefObject } from "react"

function hasBlockingModifier(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey
}

export function usePlayerControls(rigRef: RefObject<PlayerRig | null>) {
  const canvas = useThree((state) => state.gl.domElement)
  const lockedRef = useRef(false)
  const pressedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const pressed = pressedRef.current
    const releaseTarget = setPointerLockTarget(canvas)
    // Walking works from the moment the visitor arrives. Looking around needs
    // the pointer locked, which the browser only grants on a click; losing the
    // lock again (Escape) pauses the visit until the next click on the scene.
    const setLocked = (isLocked: boolean) => {
      if (lockedRef.current === isLocked) {
        return
      }
      lockedRef.current = isLocked
      pressed.clear()
      useMuseumStore.getState().setPaused(!isLocked)
    }
    const onLockChange = () => {
      setLocked(document.pointerLockElement === canvas)
    }
    const onMouseMove = (event: MouseEvent) => {
      const rig = rigRef.current
      if (!lockedRef.current || !rig) {
        return
      }
      applyLookDelta(rig.look, event.movementX, event.movementY)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (hasBlockingModifier(event)) {
        pressed.clear()
        return
      }
      if (useMuseumStore.getState().isPaused || !isMovementCode(event.code)) {
        return
      }
      event.preventDefault()
      pressed.add(event.code)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      pressed.delete(event.code)
    }
    const clearPressed = () => {
      pressed.clear()
    }

    canvas.addEventListener("click", requestPlayerPointerLock)
    document.addEventListener("pointerlockchange", onLockChange)
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("visibilitychange", clearPressed)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", clearPressed)
    onLockChange()

    return () => {
      canvas.removeEventListener("click", requestPlayerPointerLock)
      document.removeEventListener("pointerlockchange", onLockChange)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("visibilitychange", clearPressed)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", clearPressed)
      releaseTarget()
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock()
      }
      lockedRef.current = false
      pressed.clear()
      useMuseumStore.getState().setPaused(false)
    }
  }, [canvas, rigRef])

  return pressedRef
}
