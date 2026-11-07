import { PictureLight } from "@/museum/gallery/artwork/_components/picture-light"
import { laceFrameGeometry } from "@/museum/gallery/artwork/_lib/lace-frame"
import { laceFrameMaterials } from "@/museum/gallery/artwork/_lib/lace-frame-materials"
import { WallLabel } from "@/museum/gallery/label/wall-label"
import {
  hangKeptPortrait,
  takeDownPortrait,
} from "@/museum/gallery/midnight/_lib/frame-portrait"
import {
  createFrameParts,
  disposeFrameParts,
  watchFrame,
  type FrameMeshes,
  type FrameStep,
} from "@/museum/gallery/midnight/_lib/frame-watch"
import {
  emptyFrameLabel,
  framePlacement,
  keptVisitorLabel,
  labelPlacement,
  nightName,
  thirteenthFrame,
} from "@/museum/gallery/midnight/_lib/thirteenth-frame"
import { useStoryStore } from "@/museum/story/_lib/story-store"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"

type ThirteenthFrameProps = {
  isStill: boolean
}

const mirrorZ = 0.008
const { lace } = thirteenthFrame
const laceSpec = { id: "thirteenth-frame", seed: 13, ...lace }

// The thirteenth frame by the front door: veiled lace, a mirror under the
// veil that shows the room and never the visitor, and its card, which
// rewrites itself when the house keeps the visitor. From then on it hangs
// their portrait instead of the mirror.
export function ThirteenthFrame({ isStill }: ThirteenthFrameProps) {
  const [parts] = useState(createFrameParts)
  const meshesRef = useRef<FrameMeshes>({
    group: null,
    veil: null,
    glass: null,
  })
  const stepRef = useRef<FrameStep>({
    camera: null,
    renderer: null,
    delta: 0,
    isStill,
  })
  const portrait = useStoryStore((state) => state.portrait)
  const label = portrait
    ? keptVisitorLabel(nightName(portrait.night))
    : emptyFrameLabel
  const { mirror, veil } = parts

  useEffect(() => () => disposeFrameParts(parts), [parts])

  // A portrait kept on an earlier visit (the one just taken is already up).
  useEffect(() => {
    if (portrait === null) {
      takeDownPortrait(parts.portrait)
    } else if (parts.portrait.hung !== portrait) {
      hangKeptPortrait(parts.portrait, portrait)
    }
  }, [parts, portrait])

  useFrame(({ camera, gl }, delta) => {
    const step = stepRef.current
    step.camera = camera
    step.renderer = gl
    step.delta = delta
    step.isStill = isStill
    watchFrame(parts, meshesRef.current, step)
  })

  return (
    <group
      ref={(group) => {
        meshesRef.current.group = group
      }}
      position={framePlacement.position}
      rotation-y={framePlacement.rotationY}
    >
      <mesh
        ref={(glass) => {
          meshesRef.current.glass = glass
        }}
        geometry={mirror.geometry}
        material={mirror.glass}
        position-z={mirrorZ}
      />
      <primitive object={mirror.reflector} position-z={mirrorZ} />
      <mesh
        geometry={laceFrameGeometry(lace)}
        material={laceFrameMaterials(laceSpec)}
      />
      <mesh
        ref={(mesh) => {
          meshesRef.current.veil = mesh
        }}
        geometry={veil.geometry}
        material={veil.material}
        renderOrder={1}
      />
      <PictureLight
        canvasCenterY={0}
        frameHeight={lace.height}
        frameTop={lace.height / 2}
        frameWidth={lace.width}
      />
      <WallLabel label={label} position={labelPlacement} />
    </group>
  )
}
