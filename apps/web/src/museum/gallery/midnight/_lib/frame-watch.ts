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
import {
  createFramePortrait,
  disposeFramePortrait,
  freezePortrait,
  hangKeptPortrait,
  settlePortrait,
  type FramePortrait,
} from "@/museum/gallery/midnight/_lib/frame-portrait"
import { setMirrorInView } from "@/museum/gallery/midnight/_lib/midnight-scene"
import { keepVisitor } from "@/museum/gallery/midnight/_lib/midnight-sequence"
import {
  createMirror,
  type Mirror,
} from "@/museum/gallery/midnight/_lib/mirror"
import {
  bakePortrait,
  keptPhoto,
} from "@/museum/gallery/midnight/_lib/portrait-bake"
import {
  framePlacement,
  isFacingFrame,
  nightKey,
  thirteenthFrame,
} from "@/museum/gallery/midnight/_lib/thirteenth-frame"
import { canChooseEnding, useStoryStore } from "@/museum/story/_lib/story-store"
import {
  MathUtils,
  Vector2,
  Vector3,
  Vector4,
  type BufferGeometry,
  type Camera,
  type Group,
  type Mesh,
  type ShaderMaterial,
  type WebGLRenderer,
} from "three"

// What the thirteenth frame does each frame: its veil falls under the
// visitor's gaze and pools at the wall's foot, its mirror reflects only
// while it can be seen, its card shows while the visitor faces it, and
// standing there long enough after midnight is ending B: the mist closes in
// as they stay, and the mirror freezes into their portrait, which it hangs
// from then on.

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
// Quick, so the mist keeps pace with the time stayed.
const holdDamping = 6
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
  portrait: FramePortrait
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
  renderer: WebGLRenderer | null
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
    portrait: createFramePortrait(),
    gaze: 0,
    fall: 0,
    isFalling: false,
    dwell: 0,
  }
}

export function disposeFrameParts(parts: FrameParts) {
  parts.mirror.dispose()
  parts.veil.material.dispose()
  disposeFramePortrait(parts.portrait)
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

const eye = new Vector3()

// The mirror freezes on what it last showed, the visitor in it at last.
function takePortrait(
  parts: FrameParts,
  group: Group,
  camera: Camera,
  step: FrameStep
) {
  camera.getWorldPosition(eye)
  const eyeHeight = eye.y
  group.worldToLocal(eye)
  const print = step.renderer
    ? bakePortrait(step.renderer, camera, parts.mirror, {
        x: eye.x,
        y: eye.y,
        eyeHeight,
      })
    : null
  const portrait = {
    night: nightKey(new Date()),
    photo: print ? keptPhoto(print) : null,
  }
  if (print) {
    freezePortrait(parts.portrait, portrait, print, step.isStill)
  } else {
    hangKeptPortrait(parts.portrait, portrait)
  }
  useStoryStore.getState().hangPortrait(portrait)
}

// Ending B: stand before it about eight seconds once the house has said all
// it had to say. The mist closes in as the visitor stays, and clears again
// if they look away or walk off. True once they have stayed long enough.
function watchStay(parts: FrameParts, isFacing: boolean, step: FrameStep) {
  const dt = Math.min(step.delta, 0.1)
  const story = useStoryStore.getState()
  const canStay = isFacing && canChooseEnding(story)
  parts.dwell = canStay ? parts.dwell + dt : Math.max(0, parts.dwell - dt * 2)
  const hold = story.ending === "stay" ? 1 : parts.dwell / stayAfter
  parts.mirror.hold.value = MathUtils.damp(
    parts.mirror.hold.value,
    hold,
    holdDamping,
    dt
  )
  if (parts.dwell < stayAfter) {
    return false
  }
  parts.dwell = 0
  return true
}

// The glass shows the kept portrait once it is painted, and the veil drapes
// over it instead of the foxed silver.
function showPortrait(parts: FrameParts, glass: Mesh, step: FrameStep) {
  const { portrait, mirror, veil } = parts
  const surface = portrait.isPainted ? portrait.material : mirror.glass
  if (glass.material !== surface) {
    glass.material = surface
    veil.uniforms.photo.value = surface.map
  }
  settlePortrait(portrait, step.delta)
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

  // The reflection is a second render of the scene: only while it shows,
  // and never again once the mirror has become a portrait.
  const isReflecting = isHere && parts.isFalling && parts.portrait.hung === null
  parts.mirror.reflector.visible = isReflecting
  glass.visible = !isReflecting
  showPortrait(parts, glass, step)

  const isFacing =
    parts.fall >= 1 &&
    isHere &&
    !museum.isPaused &&
    isFacingFrame(camera, facing.reach, facing.cone)
  setMirrorInView(isFacing)
  if (watchStay(parts, isFacing, step)) {
    keepVisitor(step.isStill)
    takePortrait(parts, group, camera, step)
  }
}
