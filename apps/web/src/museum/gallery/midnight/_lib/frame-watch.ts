import { useMuseumStore } from "@/museum/_lib/museum-store"
import { laceLayout, laceOpening } from "@/museum/gallery/_lib/lace-outline"
import {
  isNearby,
  useManorPresence,
} from "@/museum/gallery/_lib/manor-presence"
import {
  createVeilMaterial,
  veilGeometry,
  veilOverlap,
  type VeilUniforms,
} from "@/museum/gallery/artwork/_lib/veil-material"
import { setVeilFall } from "@/museum/gallery/artwork/_lib/veil-motion"
import { setMirrorInView } from "@/museum/gallery/midnight/_lib/midnight-scene"
import { keepVisitor } from "@/museum/gallery/midnight/_lib/midnight-sequence"
import {
  createMirror,
  type Mirror,
} from "@/museum/gallery/midnight/_lib/mirror"
import {
  framePlacement,
  isFacingFrame,
  thirteenthFrame,
} from "@/museum/gallery/midnight/_lib/thirteenth-frame"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import {
  MathUtils,
  Vector2,
  Vector4,
  type BufferGeometry,
  type Camera,
  type Group,
  type Mesh,
  type ShaderMaterial,
} from "three"

// What the thirteenth frame does each frame: its veil falls under the
// visitor's gaze and pools at the wall's foot, its mirror reflects only
// while it can be seen, its card shows while the visitor faces it, and
// standing there long enough after midnight is ending B.

// Looked at from this close, within this cone, the veil falls.
const unveil = {
  reach: 5.5,
  cone: Math.cos(MathUtils.degToRad(26)),
  dwell: 0.5,
}
// Close enough to read its card, and to stay.
const facing = { reach: 4.2, cone: Math.cos(MathUtils.degToRad(34)) }
// Seconds before the mirror to be kept (ending B).
const stayAfter = 8
const fallDuration = 2.4
const glowDamping = 1.8
const holdDamping = 1.2
const stirDamping = 2.2
const openingCornerRatio = 0.06

type Veil = {
  uniforms: VeilUniforms
  material: ShaderMaterial
  geometry: BufferGeometry
}

export type FrameParts = {
  mirror: Mirror
  veil: Veil
  gaze: number
  // 0 hanging, 1 pooled on the floor.
  fall: number
  isFalling: boolean
  dwell: number
}

export type FrameMeshes = {
  group: Group | null
  veil: Mesh | null
  glass: Mesh | null
}

// Reused every frame (no allocation): the component fills it in.
export type FrameStep = {
  camera: Camera | null
  delta: number
  isStill: boolean
}

const { lace, canvas } = thirteenthFrame

// The same tulle as the sleeping works, over the foxed glass.
function createVeil(mirror: Mirror): Veil {
  const opening = laceOpening(laceLayout(lace))
  const width = (opening.x + veilOverlap) * 2
  const height = (opening.y + veilOverlap) * 2
  const shareX = width / canvas.width
  const shareY = height / canvas.height
  const uniforms: VeilUniforms = {
    photo: { value: mirror.glass.map },
    photoFit: {
      value: new Vector4(
        shareX,
        shareY,
        (1 - shareX) * 0.5,
        (1 - shareY) * 0.5
      ),
    },
    size: { value: new Vector2(width, height) },
    corner: { value: Math.min(opening.x, opening.y) * openingCornerRatio },
    // It glows like the next work to wake: the house wants it seen.
    glow: { value: 1 },
    stir: { value: 0 },
    fall: { value: 0 },
    fade: { value: 0 },
    // At the foot of the Vestibule's front wall, under the mirror.
    floorY: { value: -framePlacement.position[1] },
    seed: { value: 13 },
  }
  return {
    uniforms,
    material: createVeilMaterial(uniforms),
    geometry: veilGeometry(width, height),
  }
}

export function createFrameParts(): FrameParts {
  const mirror = createMirror(canvas.width, canvas.height)
  return {
    mirror,
    veil: createVeil(mirror),
    gaze: 0,
    fall: 0,
    isFalling: false,
    dwell: 0,
  }
}

export function disposeFrameParts(parts: FrameParts) {
  parts.mirror.dispose()
  parts.veil.material.dispose()
  setMirrorInView(false)
}

function dropVeil(parts: FrameParts, isLooking: boolean, step: FrameStep) {
  const dt = Math.min(step.delta, 0.1)
  parts.gaze = isLooking ? parts.gaze + dt : 0
  if (parts.gaze >= unveil.dwell) {
    parts.isFalling = true
  }
  if (parts.isFalling && parts.fall < 1) {
    parts.fall = Math.min(1, parts.fall + dt / fallDuration)
  }
  const { uniforms } = parts.veil
  setVeilFall(uniforms, parts.fall, step.isStill)
  // Its glow dies once it lets go.
  uniforms.glow.value = MathUtils.damp(
    uniforms.glow.value,
    parts.isFalling ? 0 : 1,
    glowDamping,
    dt
  )
  const isStirring = isLooking && !parts.isFalling && !step.isStill
  uniforms.stir.value = MathUtils.damp(
    uniforms.stir.value,
    isStirring ? 1 : 0,
    stirDamping,
    dt
  )
}

// Ending B: stand before it about eight seconds once the house has said all
// it had to say. The mirror's edges close in as the visitor stays.
function watchStay(parts: FrameParts, isFacing: boolean, step: FrameStep) {
  const dt = Math.min(step.delta, 0.1)
  const story = useStoryStore.getState()
  const canStay =
    isFacing &&
    story.midnight &&
    story.ending === null &&
    story.lineQueue.length === 0
  parts.dwell = canStay ? parts.dwell + dt : Math.max(0, parts.dwell - dt * 2)
  const hold = story.ending === "stay" ? 1 : parts.dwell / stayAfter
  parts.mirror.hold.value = MathUtils.damp(
    parts.mirror.hold.value,
    hold,
    holdDamping,
    dt
  )
  if (parts.dwell >= stayAfter) {
    parts.dwell = 0
    keepVisitor(step.isStill)
  }
}

export function watchFrame(
  parts: FrameParts,
  meshes: FrameMeshes,
  step: FrameStep
) {
  const { group, veil, glass } = meshes
  const { camera } = step
  if (!group || !veil || !glass || !camera) {
    return
  }
  const room = useManorPresence.getState().roomId
  const museum = useMuseumStore.getState()
  const isHere = museum.phase === "gallery" && room === "vestibule"
  group.visible = isNearby(room, "vestibule")

  const isLooking = isHere && isFacingFrame(camera, unveil.reach, unveil.cone)
  dropVeil(parts, isLooking, step)
  // Falling carries it out of its bounds, down to the floor.
  if (veil.frustumCulled !== (parts.fall === 0)) {
    veil.frustumCulled = parts.fall === 0
  }

  // The reflection is a second render of the scene: only while it shows.
  const isReflecting = isHere && parts.isFalling
  parts.mirror.reflector.visible = isReflecting
  glass.visible = !isReflecting

  const isFacing =
    parts.fall >= 1 &&
    isHere &&
    !museum.isPaused &&
    isFacingFrame(camera, facing.reach, facing.cone)
  setMirrorInView(isFacing)
  watchStay(parts, isFacing, step)
}
