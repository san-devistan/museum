import {
  readCameraShake,
  resetCameraShake,
  stepCameraShake,
} from "@/museum/_lib/camera-shake"
import { cameraStart, eyeHeight } from "@/museum/_lib/museum-layout"
import {
  landFootstep,
  resetFootstepSignal,
  trackGroundSpeed,
} from "@/museum/player/_lib/footstep-signal"
import {
  createHeadMotion,
  stepHeadMotion,
  type HeadMotion,
} from "@/museum/player/_lib/head-motion"
import type {
  CollisionWorld,
  PlanarPoint,
} from "@/museum/player/_lib/player-collision"
import {
  clampPitch,
  followLook,
  type LookAngles,
} from "@/museum/player/_lib/player-look"
import {
  createMotionState,
  stepMotion,
  wishVelocity,
  type MotionState,
  type MoveInput,
} from "@/museum/player/_lib/player-motion"
import { PerspectiveCamera, type Camera } from "three"

export type PlayerRig = {
  /** Where the mouse points. */
  look: LookAngles
  /** What the camera shows, easing after `look`. */
  view: LookAngles
  motion: MotionState
  head: HeadMotion
  eyeY: number
}

const eyeSettleRate = 6
const fovEpsilon = 1e-3
const wish: PlanarPoint = { x: 0, z: 0 }

export function createRigFromCamera(camera: Camera): PlayerRig {
  camera.rotation.reorder("YXZ")
  const yaw = camera.rotation.y
  const pitch = clampPitch(camera.rotation.x)

  return {
    look: { yaw, pitch },
    view: { yaw, pitch },
    motion: createMotionState({ x: camera.position.x, z: camera.position.z }),
    head: createHeadMotion(yaw),
    eyeY: camera.position.y,
  }
}

export function settleEyeHeight(eyeY: number, delta: number) {
  return eyeHeight + (eyeY - eyeHeight) * Math.exp(-eyeSettleRate * delta)
}

/** Advances look, walk, head motion and shake, and reports footfalls. */
export function stepRig(
  rig: PlayerRig,
  input: MoveInput,
  delta: number,
  world: CollisionWorld
) {
  if (delta <= 0) {
    return
  }
  followLook(rig.view, rig.look, delta)
  stepMotion(rig.motion, wishVelocity(input, rig.view.yaw, wish), delta, world)
  rig.eyeY = settleEyeHeight(rig.eyeY, delta)
  const { head } = rig
  const step = stepHeadMotion(head, rig.motion.velocity, rig.view, delta)
  trackGroundSpeed(head.speed)
  if (step) {
    landFootstep(step, head.foot, head.speed)
  }
  stepCameraShake(delta)
}

function setFov(camera: Camera, fov: number) {
  if (
    !(camera instanceof PerspectiveCamera) ||
    Math.abs(camera.fov - fov) < fovEpsilon
  ) {
    return
  }
  camera.fov = fov
  camera.updateProjectionMatrix()
}

/**
 * Poses the camera: walk position and eased view, plus head motion and shake
 * in the view's frame. Reduced motion keeps only the walk and the view.
 */
export function applyRigToCamera(
  rig: PlayerRig,
  camera: Camera,
  reducedMotion: boolean
) {
  const { view, head, motion } = rig
  const shake = readCameraShake()
  const weight = reducedMotion ? 0 : 1
  const side = (head.side + shake.x) * weight
  const forward = shake.z * weight
  const sin = Math.sin(view.yaw)
  const cos = Math.cos(view.yaw)

  camera.position.set(
    motion.position.x + side * cos - forward * sin,
    rig.eyeY + (head.up + shake.y) * weight,
    motion.position.z - side * sin - forward * cos
  )
  camera.rotation.set(
    view.pitch + (head.pitch + shake.pitch) * weight,
    view.yaw + shake.yaw * weight,
    (head.roll + shake.roll) * weight,
    "YXZ"
  )
  setFov(camera, cameraStart.fov + shake.fov * weight)
}

/** Hands the camera back clean when the player leaves or unmounts. */
export function releaseCamera(camera: Camera) {
  resetCameraShake()
  resetFootstepSignal()
  setFov(camera, cameraStart.fov)
}
