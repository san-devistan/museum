import { entranceDoor } from "@/museum/_lib/museum-layout"
import {
  closeDoorAngle,
  doorSlamTiming,
  reopenDoorAngle,
  slamDoorAngle,
  slamDuration,
} from "@/museum/entrance/_lib/entrance-timeline"
import type { Camera } from "three"

// The front doors while the visitor is inside: they slam shut behind them a
// moment after they arrive, and creak open again when the visitor walks back.
// After midnight they stay open; when the house keeps the visitor (ending B)
// they close softly.

export type DoorCue = "slam" | "creak"

// "settled": after midnight the doors stay open, and the visit begins at the
// moment they would have slammed.
export type DoorEvent = DoorCue | "settled"

export type DoorFrame = {
  camera: Camera
  delta: number
  isPaused: boolean
  // Midnight has struck: the doors stay open.
  isMidnight: boolean
  // Ending B: the house keeps the visitor.
  isKept: boolean
}

export type DoorSlamMode =
  | "armed"
  | "waiting"
  | "slamming"
  | "closed"
  | "reopening"
  | "open"
  | "closing"

export type DoorSlam = {
  mode: DoorSlamMode
  elapsed: number
  angle: number
  reopenFrom: number
  closeFrom: number
}

/** The doors creak back open once the visitor walks this close to them. */
const doorReach = {
  x: entranceDoor.centerX,
  z: (entranceDoor.innerZ + entranceDoor.outerZ) / 2,
  radius: 2.3,
}

export function setDoorMode(door: DoorSlam, mode: DoorSlamMode, angle: number) {
  door.mode = mode
  door.elapsed = 0
  door.angle = angle
}

function isNearDoor(camera: Camera) {
  const { x, z } = camera.position
  return Math.hypot(x - doorReach.x, z - doorReach.z) < doorReach.radius
}

function startReopening(door: DoorSlam): DoorCue {
  door.reopenFrom = door.angle
  setDoorMode(door, "reopening", door.angle)
  return "creak"
}

function advanceWait(door: DoorSlam, frame: DoorFrame): DoorEvent | null {
  door.elapsed += frame.delta
  if (door.elapsed < doorSlamTiming.delay) {
    return null
  }
  if (frame.isMidnight) {
    setDoorMode(door, "open", 1)
    return "settled"
  }
  setDoorMode(door, "slamming", 1)
  return null
}

function advanceSlam(door: DoorSlam, delta: number): DoorCue | null {
  const before = door.elapsed
  door.elapsed += delta
  door.angle = slamDoorAngle(door.elapsed)
  const hasHit =
    before < doorSlamTiming.swing && door.elapsed >= doorSlamTiming.swing
  if (door.elapsed >= slamDuration) {
    setDoorMode(door, "closed", 0)
  }
  return hasHit ? "slam" : null
}

/** Ending B: the doors swing shut slowly, with no slam. */
function startClosing(door: DoorSlam): DoorCue {
  door.closeFrom = door.angle
  setDoorMode(door, "closing", door.angle)
  return "creak"
}

function advanceClose(door: DoorSlam, delta: number) {
  door.elapsed += delta
  door.angle = closeDoorAngle(door.elapsed, door.closeFrom)
  if (door.elapsed >= doorSlamTiming.softClose) {
    setDoorMode(door, "closed", 0)
  }
}

/** At midnight, doors shut by the slam open again on their own. */
function openForMidnight(door: DoorSlam) {
  door.reopenFrom = door.angle
  setDoorMode(door, "reopening", door.angle)
}

function advanceReopen(door: DoorSlam, delta: number) {
  door.elapsed += delta
  door.angle = reopenDoorAngle(door.elapsed, door.reopenFrom)
  if (door.elapsed >= doorSlamTiming.reopen) {
    setDoorMode(door, "open", 1)
  }
}

/**
 * A moment after the visitor arrives, the doors slam shut behind them and
 * stay shut until the visitor walks back to them. After midnight they stay
 * open; when the house keeps the visitor (ending B) they close softly.
 */
export function advanceDoorSlam(
  door: DoorSlam,
  frame: DoorFrame
): DoorEvent | null {
  if (frame.isKept && door.mode !== "closing" && door.mode !== "closed") {
    return startClosing(door)
  }
  switch (door.mode) {
    case "armed":
      if (!frame.isPaused) {
        setDoorMode(door, "waiting", 1)
      }
      break
    case "waiting":
      return advanceWait(door, frame)
    case "slamming":
      return advanceSlam(door, frame.delta)
    case "closed":
      if (frame.isKept) {
        break
      }
      if (frame.isMidnight) {
        openForMidnight(door)
        break
      }
      return isNearDoor(frame.camera) ? startReopening(door) : null
    case "reopening":
      advanceReopen(door, frame.delta)
      break
    case "closing":
      advanceClose(door, frame.delta)
      break
    case "open":
      break
  }
  return null
}

/** Leaving through shut doors opens them first instead of snapping them. */
export function releaseDoors(door: DoorSlam): DoorCue | null {
  if (door.mode === "slamming" || door.mode === "closed") {
    return startReopening(door)
  }
  return null
}

export function leavingDoorAngle(door: DoorSlam, delta: number) {
  if (door.mode === "reopening") {
    advanceReopen(door, delta)
  }
  return door.angle
}

export function createDoorSlam(): DoorSlam {
  return { mode: "armed", elapsed: 0, angle: 1, reopenFrom: 0, closeFrom: 0 }
}
