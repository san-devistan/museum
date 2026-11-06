import { cameraStart } from "@/museum/_lib/museum-layout"
import { facadeZ } from "@/museum/entrance/_lib/manor-layout"
import { MathUtils, PerspectiveCamera, Vector3, type Camera } from "three"
import { create } from "zustand"

/**
 * The page opens on the whole manor against the sky, holds a beat, then
 * pushes in to the close framing on the portal. The button waits for it.
 */
export const establishingShot = {
  hold: 0.7,
  push: 5.2,
  /** Push progress at which the button starts fading in (700 ms fade). */
  reveal: 0.86,
}

export const establishingShotLength =
  establishingShot.hold + establishingShot.push

/** What the wide frame must hold: tower to east wing, ground to spire. */
const wideFrame = {
  centerX: -0.4,
  halfWidth: 21.5,
  minDistance: 18,
  maxDistance: 40,
  eyeRise: 0.2,
  target: new Vector3(-0.4, 9.4, 0),
}

type ShotState = { isSettled: boolean }

/** Whether the shot has (nearly) landed, for the overlay's button. */
export const useEntranceShot = create<ShotState>()(() => ({
  isSettled: false,
}))

function settle() {
  if (!useEntranceShot.getState().isSettled) {
    useEntranceShot.setState({ isSettled: true })
  }
}

export type EntranceShot = { elapsed: number; isDone: boolean }

export function createEntranceShot(): EntranceShot {
  return { elapsed: 0, isDone: false }
}

const closePosition = new Vector3(...cameraStart.position)
const closeTarget = new Vector3(...cameraStart.lookAt)
const widePosition = new Vector3()
const lookTarget = new Vector3()

/** Backs off until the manor fits the screen's width; narrow screens go further. */
function frameWide(camera: Camera) {
  const isPerspective = camera instanceof PerspectiveCamera
  const aspect = isPerspective ? camera.aspect : 16 / 9
  const fov = isPerspective ? camera.fov : cameraStart.fov
  const halfHeight = Math.tan(MathUtils.degToRad(fov) / 2)
  const distance = MathUtils.clamp(
    wideFrame.halfWidth / (halfHeight * aspect),
    wideFrame.minDistance,
    wideFrame.maxDistance
  )
  return widePosition.set(
    wideFrame.centerX,
    cameraStart.position[1] + distance * wideFrame.eyeRise,
    facadeZ + distance
  )
}

type ShotFrame = { camera: Camera; delta: number; reducedMotion: boolean }

/**
 * Moves the camera along the establishing shot. Returns false once the
 * camera rests on the close framing, where the idle sway takes over.
 */
export function stepEntranceShot(shot: EntranceShot, frame: ShotFrame) {
  if (shot.isDone) {
    return false
  }
  if (frame.reducedMotion) {
    shot.isDone = true
    settle()
    return false
  }
  shot.elapsed += frame.delta
  const travel = MathUtils.clamp(
    (shot.elapsed - establishingShot.hold) / establishingShot.push,
    0,
    1
  )
  if (travel >= establishingShot.reveal) {
    settle()
  }
  if (travel >= 1) {
    shot.isDone = true
    return false
  }
  const eased = MathUtils.smootherstep(travel, 0, 1)
  frame.camera.position.lerpVectors(
    frameWide(frame.camera),
    closePosition,
    eased
  )
  lookTarget.lerpVectors(wideFrame.target, closeTarget, eased)
  frame.camera.lookAt(lookTarget)
  return true
}
