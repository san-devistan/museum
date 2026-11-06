import { addCameraTrauma } from "@/museum/_lib/camera-shake"
import type { CollectionWorkId } from "@/museum/collection/collection-works"
import { smoothstep } from "@/museum/gallery/ikebana/_lib/ikebana-random"
import {
  advanceLiving,
  pickReacher,
  writeUniforms,
  type LivingFrame,
} from "@/museum/gallery/ikebana/_lib/living-motion"
import {
  syncLivingReflections,
  type LivingParts,
} from "@/museum/gallery/ikebana/_lib/living-parts"
import {
  findLiving,
  livingMemory,
  partnerRole,
} from "@/museum/gallery/ikebana/_lib/living-registry"
import { advanceSnap } from "@/museum/gallery/ikebana/_lib/living-snap"
import { livingTuning } from "@/museum/gallery/ikebana/_lib/living-tuning"
import { playSnapSound } from "@/museum/gallery/ikebana/_lib/snap-sound"
import { stepTornPetals } from "@/museum/gallery/ikebana/_lib/torn-petals"
import { isChapterAwake, useStoryStore } from "@/museum/story/_lib/story-store"
import type { RootState } from "@react-three/fiber"
import {
  Matrix4,
  PerspectiveCamera,
  Vector3,
  type Camera,
  type Object3D,
} from "three"

const { watch, whisper } = livingTuning
const nibbleRange = 5

const world = {
  inverse: new Matrix4(),
  camera: new Vector3(),
  origin: new Vector3(),
  middle: new Vector3(),
  forward: new Vector3(),
  partner: new Vector3(),
}

const local = { partner: new Vector3() }

const appetite = {
  woken: null as readonly CollectionWorkId[] | null,
  isAwake: false,
}

function isFeedingTime(woken: readonly CollectionWorkId[]) {
  if (appetite.woken !== woken) {
    appetite.woken = woken
    appetite.isAwake = isChapterAwake(woken, "appetit")
  }
  return appetite.isAwake
}

// Where the visitor is, and whether they are looking this way.
function readVisitor(frame: LivingFrame, group: Object3D, camera: Camera) {
  // Fresh even on the first frame, before the renderer has placed the group.
  group.updateWorldMatrix(true, false)
  world.inverse.copy(group.matrixWorld).invert()
  camera.getWorldPosition(world.camera)
  camera.getWorldDirection(world.forward)
  frame.camera.copy(world.camera).applyMatrix4(world.inverse)
  world.origin.setFromMatrixPosition(group.matrixWorld)
  world.middle.set(0, watch.middle, 0).applyMatrix4(group.matrixWorld)
  const angle = world.forward.angleTo(world.middle.sub(world.camera))
  frame.watched = 1 - smoothstep(watch.lookedAt, watch.lookedAway, angle)
  frame.distance = Math.hypot(
    world.camera.x - world.origin.x,
    world.camera.z - world.origin.z
  )
}

// The other table ikebana's reaching head, in this one's space.
function readPartner(parts: LivingParts) {
  const { state, frame } = parts
  const role = partnerRole(state.role)
  const partner = role ? findLiving(role) : null
  frame.partner = null
  if (!partner || (!frame.isFeeding && state.feed <= 0)) {
    return
  }
  if (state.reacher < 0) {
    partner.origin(world.partner)
    local.partner.copy(world.partner).applyMatrix4(world.inverse)
    state.reacher = pickReacher(state, local.partner)
  }
  const index = partner.reacher()
  if (index >= 0) {
    partner.headWorld(index, world.partner)
    frame.partner = parts.partnerPoint
      .copy(world.partner)
      .applyMatrix4(world.inverse)
  }
}

function whisperOnApproach(parts: LivingParts) {
  const { role } = parts.state
  const story = useStoryStore.getState()
  // A fresh visit (the story was reset) wakes the whispers and the snap again.
  if (story.whispered < livingMemory.whispered.size) {
    livingMemory.whispered.clear()
    livingMemory.snapped.clear()
  }
  if (
    parts.frame.distance < whisper.distance &&
    !livingMemory.whispered.has(role)
  ) {
    livingMemory.whispered.add(role)
    story.whisperNext()
  }
}

function react(parts: LivingParts) {
  const { state, frame } = parts
  if (state.events.bite) {
    const victim = findLiving("table-left")
    victim?.bite(victim.reacher())
    if (frame.distance < nibbleRange) {
      playSnapSound("nibble", 0.3 * (1 - frame.distance / nibbleRange))
    }
  }
  if (state.events.snap === "jolt") {
    playSnapSound("jolt")
    addCameraTrauma(livingTuning.snap.jolt)
  } else if (state.events.snap === "quiet") {
    playSnapSound("quiet")
  }
}

function drift(parts: LivingParts, root: RootState) {
  const { pollen, torn, state, frame } = parts
  if (pollen) {
    const { uniforms } = pollen
    uniforms.time.value += frame.delta * (frame.isStill ? 0.25 : 1)
    uniforms.strength.value = state.feed
    if (root.camera instanceof PerspectiveCamera) {
      const halfFov = (root.camera.fov * Math.PI) / 360
      const height = root.size.height * root.viewport.dpr
      uniforms.pointScale.value = height / (2 * Math.tan(halfFov))
    }
  }
  if (torn && parts.petals) {
    stepTornPetals(torn, parts.petals, frame.delta)
  }
}

// One frame of a living ikebana; allocates nothing.
export function tickLiving(
  parts: LivingParts,
  root: RootState,
  delta: number,
  isStill: boolean
) {
  const { group } = parts
  if (!group) {
    return
  }
  const { state, frame } = parts
  const story = useStoryStore.getState()
  syncLivingReflections(parts)
  frame.delta = Math.min(delta, 0.1)
  frame.time = root.clock.elapsedTime
  frame.isStill = isStill
  frame.isFeeding = isFeedingTime(story.woken)
  frame.isMidnight = story.midnight
  readVisitor(frame, group, root.camera)
  readPartner(parts)
  whisperOnApproach(parts)
  advanceLiving(state, frame)
  advanceSnap(state, frame)
  react(parts)
  writeUniforms(state)
  drift(parts, root)
}
