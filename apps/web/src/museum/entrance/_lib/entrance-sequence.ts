import { cameraStart, playerSpawn } from "@/museum/_lib/museum-layout"
import type { MuseumPhase } from "@/museum/_lib/museum-store"
import {
  advanceDoorSlam,
  createDoorSlam,
  leavingDoorAngle,
  releaseDoors,
  setDoorMode,
  type DoorEvent,
  type DoorFrame,
  type DoorSlam,
} from "@/museum/entrance/_lib/door-slam"
import { ribbonMaterial } from "@/museum/entrance/_lib/entrance-assets"
import { doorLeaves } from "@/museum/entrance/_lib/entrance-layout"
import {
  cameraProgress,
  doorProgress,
  leavingDuration,
  leavingProgress,
  leavingTiming,
  ribbonProgress,
  openingDuration,
  openingTiming,
  reducedLeavingTiming,
  reducedOpeningTiming,
} from "@/museum/entrance/_lib/entrance-timeline"
import {
  createEntranceShot,
  stepEntranceShot,
  type EntranceShot,
} from "@/museum/entrance/_lib/establishing-shot"
import {
  DirectionalLight,
  Euler,
  MathUtils,
  PointLight,
  Quaternion,
  Vector3,
  type Camera,
  type Object3D,
} from "three"

export type EntranceTransition = "opening" | "leaving"

export type { DoorCue } from "@/museum/entrance/_lib/door-slam"

export type EntranceEvent = "entered" | "exited" | DoorEvent

export type EntranceSequence = {
  idleTime: number
  elapsed: number
  transition: EntranceTransition | null
  reducedMotion: boolean
  fromPosition: Vector3
  fromQuaternion: Quaternion
  fromView: Euler
  door: DoorSlam
  shot: EntranceShot
}

export type EntranceRig = {
  leaves: readonly (Object3D | null)[]
  ribbon: Object3D | null
  loops: Object3D | null
  lights: Object3D | null
}

// After midnight (isMidnight) the ribbon also lies untied on the doorstep;
// in ending B (isKept) the visitor is put straight back outside.
type EntranceFrame = DoorFrame & {
  phase: MuseumPhase
  rig: EntranceRig
  reducedMotion: boolean
}

const startPosition = new Vector3(...cameraStart.position)
const startTarget = new Vector3(...cameraStart.lookAt)
const spawnPosition = new Vector3(...playerSpawn.position)
const spawnRotation = new Euler(0, playerSpawn.yaw, 0, "YXZ")
const spawnQuaternion = new Quaternion().setFromEuler(spawnRotation)
const startView = viewAngles(startPosition, startTarget)

const idleSway = {
  amplitudeX: 0.04,
  amplitudeY: 0.02,
  speedX: 0.45,
  speedY: 0.7,
}

const exteriorFade = { start: 0.65, end: 0.95 }

export function createEntranceSequence(): EntranceSequence {
  return {
    idleTime: 0,
    elapsed: 0,
    transition: null,
    reducedMotion: false,
    fromPosition: new Vector3(),
    fromQuaternion: new Quaternion(),
    fromView: new Euler(0, 0, 0, "YXZ"),
    door: createDoorSlam(),
    shot: createEntranceShot(),
  }
}

const ribbonFall = { drop: 0.55, twist: 1.6, spread: 0.6 }

function viewAngles(from: Vector3, to: Vector3) {
  const direction = new Vector3().subVectors(to, from)
  return {
    yaw: Math.atan2(-direction.x, -direction.z),
    pitch: Math.atan2(direction.y, Math.hypot(direction.x, direction.z)),
  }
}

function shortestTurn(from: number, to: number) {
  return MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI
}

function setDoorAngle(rig: EntranceRig, progress: number) {
  rig.leaves.forEach((leaf, index) => {
    const spec = doorLeaves[index]
    if (leaf && spec) {
      leaf.rotation.y = spec.openAngle * progress
    }
  })
}

function setRibbon(rig: EntranceRig, progress: number) {
  ribbonMaterial.opacity = 1 - progress
  ribbonMaterial.depthWrite = progress < 0.5
  if (rig.ribbon) {
    rig.ribbon.visible = progress < 1
    rig.ribbon.position.y = -ribbonFall.drop * progress * progress
  }
  if (rig.loops) {
    rig.loops.rotation.z = ribbonFall.twist * progress
    rig.loops.scale.setScalar(1 + ribbonFall.spread * progress)
  }
}

function baseIntensity(light: Object3D) {
  const value: unknown = light.userData.baseIntensity
  return typeof value === "number" ? value : 0
}

function setExteriorLight(lights: Object3D | null, level: number) {
  if (!lights) {
    return
  }
  for (const light of lights.children) {
    if (light instanceof PointLight || light instanceof DirectionalLight) {
      light.intensity = baseIntensity(light) * level
    }
  }
}

/** After midnight the bow is untied for good: it lies on the threshold. */
function ribbonAt(frame: EntranceFrame, progress: number) {
  return frame.isMidnight ? 1 : progress
}

function holdAtEntrance(sequence: EntranceSequence, frame: EntranceFrame) {
  setDoorAngle(frame.rig, 0)
  setRibbon(frame.rig, ribbonAt(frame, 0))
  setExteriorLight(frame.rig.lights, 1)
  if (stepEntranceShot(sequence.shot, frame)) {
    return
  }
  sequence.idleTime += frame.delta
  const sway = frame.reducedMotion ? 0 : 1
  const time = sequence.idleTime
  frame.camera.position.set(
    startPosition.x +
      Math.sin(time * idleSway.speedX) * idleSway.amplitudeX * sway,
    startPosition.y +
      Math.sin(time * idleSway.speedY) * idleSway.amplitudeY * sway,
    startPosition.z
  )
  frame.camera.lookAt(startTarget)
}

function beginTransition(
  sequence: EntranceSequence,
  frame: EntranceFrame,
  transition: EntranceTransition
) {
  sequence.transition = transition
  sequence.elapsed = 0
  sequence.reducedMotion = frame.reducedMotion
  sequence.fromPosition.copy(frame.camera.position)
  sequence.fromQuaternion.copy(frame.camera.quaternion)
  sequence.fromView.setFromQuaternion(frame.camera.quaternion, "YXZ")
}

function placeAtSpawn(camera: Camera) {
  camera.position.copy(spawnPosition)
  camera.rotation.copy(spawnRotation)
}

function placeAtStart(camera: Camera) {
  camera.position.copy(startPosition)
  camera.lookAt(startTarget)
}

function advanceOpening(sequence: EntranceSequence, frame: EntranceFrame) {
  if (sequence.transition !== "opening") {
    beginTransition(sequence, frame, "opening")
    setDoorMode(sequence.door, "armed", 1)
  }
  sequence.elapsed += frame.delta
  const timing = sequence.reducedMotion ? reducedOpeningTiming : openingTiming
  const openingTime = sequence.elapsed
  const walk = cameraProgress(openingTime, timing)
  setRibbon(frame.rig, ribbonAt(frame, ribbonProgress(openingTime, timing)))
  setDoorAngle(frame.rig, doorProgress(openingTime, timing))
  setExteriorLight(
    frame.rig.lights,
    1 - MathUtils.smoothstep(walk, exteriorFade.start, exteriorFade.end)
  )
  if (openingTime >= openingDuration(timing)) {
    placeAtSpawn(frame.camera)
    return true
  }
  frame.camera.position.lerpVectors(sequence.fromPosition, spawnPosition, walk)
  frame.camera.quaternion.slerpQuaternions(
    sequence.fromQuaternion,
    spawnQuaternion,
    walk
  )
  return false
}

function beginLeaving(sequence: EntranceSequence, frame: EntranceFrame) {
  beginTransition(sequence, frame, "leaving")
  return releaseDoors(sequence.door)
}

/** Ending B: behind the black curtain the visitor is simply outside again. */
function putOutside(sequence: EntranceSequence, frame: EntranceFrame) {
  setDoorMode(sequence.door, "closed", 0)
  setDoorAngle(frame.rig, 0)
  setRibbon(frame.rig, ribbonAt(frame, 0))
  setExteriorLight(frame.rig.lights, 1)
  placeAtStart(frame.camera)
  sequence.idleTime = 0
  return "exited" as const
}

function advanceLeaving(
  sequence: EntranceSequence,
  frame: EntranceFrame
): EntranceEvent | null {
  if (frame.isKept) {
    return putOutside(sequence, frame)
  }
  const cue =
    sequence.transition === "leaving" ? null : beginLeaving(sequence, frame)
  sequence.elapsed += frame.delta
  const timing = sequence.reducedMotion ? reducedLeavingTiming : leavingTiming
  const progress = leavingProgress(sequence.elapsed, timing)
  setDoorAngle(
    frame.rig,
    Math.min(progress.door, leavingDoorAngle(sequence.door, frame.delta))
  )
  setRibbon(frame.rig, ribbonAt(frame, progress.ribbon))
  setExteriorLight(
    frame.rig.lights,
    MathUtils.smoothstep(
      progress.walk,
      1 - exteriorFade.end,
      1 - exteriorFade.start
    )
  )
  if (sequence.elapsed >= leavingDuration(timing)) {
    placeAtStart(frame.camera)
    sequence.idleTime = 0
    return "exited"
  }
  const { fromView } = sequence
  frame.camera.position.lerpVectors(
    sequence.fromPosition,
    startPosition,
    progress.walk
  )
  frame.camera.rotation.set(
    MathUtils.lerp(fromView.x, startView.pitch, progress.turn),
    fromView.y + shortestTurn(fromView.y, startView.yaw) * progress.turn,
    0,
    "YXZ"
  )
  return cue
}

function holdInGallery(
  sequence: EntranceSequence,
  frame: EntranceFrame
): EntranceEvent | null {
  const cue = advanceDoorSlam(sequence.door, frame)
  setDoorAngle(frame.rig, sequence.door.angle)
  setRibbon(frame.rig, 1)
  setExteriorLight(frame.rig.lights, 0)
  return cue
}

export function stepEntrance(
  sequence: EntranceSequence,
  frame: EntranceFrame
): EntranceEvent | null {
  if (frame.phase === "opening") {
    return advanceOpening(sequence, frame) ? "entered" : null
  }
  if (frame.phase === "leaving") {
    return advanceLeaving(sequence, frame)
  }
  sequence.transition = null
  if (frame.phase === "entrance") {
    holdAtEntrance(sequence, frame)
    return null
  }
  return holdInGallery(sequence, frame)
}
