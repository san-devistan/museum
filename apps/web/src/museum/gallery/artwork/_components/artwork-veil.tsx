import { useMuseumStore } from "@/museum/_lib/museum-store"
import type { ArtworkSpec } from "@/museum/gallery/_lib/gallery-artworks"
import { photoMaterial } from "@/museum/gallery/_lib/gallery-assets"
import { laceLayout, laceOpening } from "@/museum/gallery/_lib/lace-outline"
import { artworkFrame } from "@/museum/gallery/artwork/_lib/artwork-frame"
import {
  createHaloMaterial,
  createVeilMaterial,
  haloGeometry,
  veilGeometry,
  veilOverlap,
  type VeilUniforms,
} from "@/museum/gallery/artwork/_lib/veil-material"
import {
  stepVeil,
  type VeilStep,
} from "@/museum/gallery/artwork/_lib/veil-motion"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { useWakeState, wakeStateOf } from "@/museum/story/_lib/wake-order"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import { Vector2, Vector4, type Mesh } from "three"

type ArtworkVeilProps = {
  artwork: ArtworkSpec
  isStill: boolean
}

const openingCornerRatio = 0.06
// Just off the wall, behind the lace.
const haloZ = 0.003

function veilParts(artwork: ArtworkSpec, isAwake: boolean) {
  const { lace, canvas } = artworkFrame(artwork)
  const opening = laceOpening(laceLayout(lace))
  const width = (opening.x + veilOverlap) * 2
  const height = (opening.y + veilOverlap) * 2
  const map = photoMaterial(artwork).map
  // The veil covers the middle of the print: map its uv onto the print's.
  const shareX = width / canvas.width
  const shareY = height / canvas.height
  const repeat = map?.repeat ?? new Vector2(1, 1)
  const offset = map?.offset ?? new Vector2(0, 0)
  const uniforms: VeilUniforms = {
    photo: { value: map },
    photoFit: {
      value: new Vector4(
        shareX * repeat.x,
        shareY * repeat.y,
        (1 - shareX) * 0.5 * repeat.x + offset.x,
        (1 - shareY) * 0.5 * repeat.y + offset.y
      ),
    },
    size: { value: new Vector2(width, height) },
    corner: { value: Math.min(opening.x, opening.y) * openingCornerRatio },
    glow: { value: 0 },
    stir: { value: 0 },
    fall: { value: isAwake ? 1 : 0 },
    fade: { value: 0 },
    // The frame hangs from its centre, its height above the floor.
    floorY: { value: -artwork.position[1] },
    seed: { value: artwork.seed },
  }
  return {
    uniforms,
    veil: createVeilMaterial(uniforms),
    halo: createHaloMaterial({
      glow: uniforms.glow,
      fade: uniforms.fade,
      size: { value: new Vector2(lace.width, lace.height) },
    }),
    veilGeometry: veilGeometry(width, height),
    haloGeometry: haloGeometry(lace.width, lace.height),
  }
}

// The tulle over a sleeping work, and the glow around it while it is the
// next to wake. Once the work is awake it falls and stays pooled on the
// floor under the frame, so a reload finds woken works' veils there.
export function ArtworkVeil({ artwork, isStill }: ArtworkVeilProps) {
  const veilRef = useRef<Mesh>(null)
  const haloRef = useRef<Mesh>(null)
  const state = useWakeState(artwork.id)
  // 0 hanging, 1 pooled. A work awake already starts pooled; a forgotten
  // visit hangs the veil back at once.
  const [isInitiallyAwake] = useState(
    () => wakeStateOf(useStoryStore.getState().woken, artwork.id) === "awake"
  )
  const parts = useMemo(
    () => veilParts(artwork, isInitiallyAwake),
    [artwork, isInitiallyAwake]
  )
  // This frame's inputs, kept in one object so no frame allocates.
  const stepRef = useRef<VeilStep>({
    state,
    isLookedAt: false,
    isStill,
    delta: 0,
  })
  const progressRef = useRef(isInitiallyAwake ? 1 : 0)

  useEffect(() => {
    stepRef.current.state = state
    stepRef.current.isStill = isStill
  }, [state, isStill])

  useEffect(
    () => () => {
      parts.veil.dispose()
      parts.halo.dispose()
    },
    [parts]
  )

  useFrame((_, delta) => {
    const step = stepRef.current
    step.isLookedAt =
      useMuseumStore.getState().focusedArtwork?.id === artwork.id
    step.delta = delta
    const progress = stepVeil(parts.uniforms, progressRef.current, step)
    progressRef.current = progress
    const veil = veilRef.current
    // Falling carries it out of its bounds, down to the floor.
    if (veil && veil.frustumCulled !== (progress === 0)) {
      veil.frustumCulled = progress === 0
    }
    const halo = haloRef.current
    if (halo) {
      halo.visible = parts.uniforms.glow.value > 0.002
    }
  })

  return (
    <group>
      <mesh
        ref={veilRef}
        geometry={parts.veilGeometry}
        material={parts.veil}
        renderOrder={1}
        frustumCulled={!isInitiallyAwake}
      />
      <mesh
        ref={haloRef}
        geometry={parts.haloGeometry}
        material={parts.halo}
        position-z={haloZ}
      />
    </group>
  )
}
