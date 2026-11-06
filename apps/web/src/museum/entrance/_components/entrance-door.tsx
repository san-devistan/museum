import { meteredBox } from "@/museum/_lib/metered-box"
import { useMuseumStore } from "@/museum/_lib/museum-store"
import { EntranceRibbon } from "@/museum/entrance/_components/entrance-ribbon"
import {
  leafCarving,
  leafInlay,
  leafIronwork,
} from "@/museum/entrance/_lib/door-carving"
import { doorWoodMaterial } from "@/museum/entrance/_lib/door-materials"
import {
  eyeletMaterial,
  ribbonGeometry,
  ribbonMaterial,
} from "@/museum/entrance/_lib/entrance-assets"
import {
  doorHover,
  doorLeaves,
  type LeafSpec,
} from "@/museum/entrance/_lib/entrance-layout"
import { frameDelta } from "@/museum/entrance/_lib/entrance-timeline"
import {
  ironMaterial,
  pearlMaterial,
} from "@/museum/entrance/_lib/manor-materials"
import { eyelets, ribbon } from "@/museum/entrance/_lib/ribbon-layout"
import { useCursor } from "@react-three/drei"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import { useState, type Ref } from "react"
import { MathUtils, type Group } from "three"

export type DoorRefs = {
  left: Ref<Group>
  right: Ref<Group>
  ribbon: Ref<Group>
  loops: Ref<Group>
}

type EntranceDoorProps = {
  refs: DoorRefs
}

function leafEyelets(spec: LeafSpec) {
  return eyelets
    .filter(([x]) => Math.sign(x) === -spec.sign)
    .map(([x, y, z]) => [x - spec.hinge[0], y, z - spec.hinge[2]] as const)
}

const leafDetail = new Map(
  doorLeaves.map((spec) => [
    spec.side,
    {
      carving: leafCarving(spec),
      inlay: leafInlay(spec),
      ironwork: leafIronwork(spec),
    },
  ])
)

function DoorLeaf({ spec, leafRef }: { spec: LeafSpec; leafRef: Ref<Group> }) {
  const detail = leafDetail.get(spec.side)
  return (
    <group ref={leafRef} position={spec.hinge}>
      <mesh
        geometry={meteredBox(spec.size)}
        material={doorWoodMaterial}
        position={spec.center}
      />
      {detail ? (
        <>
          <mesh geometry={detail.carving} material={doorWoodMaterial} />
          <mesh geometry={detail.inlay} material={pearlMaterial} />
          <mesh geometry={detail.ironwork} material={ironMaterial} />
        </>
      ) : null}
      {leafEyelets(spec).map((position) => (
        <mesh
          key={position.join(":")}
          geometry={ribbonGeometry.eyelet}
          material={eyeletMaterial}
          position={position}
        />
      ))}
    </group>
  )
}

export function EntranceDoor({ refs }: EntranceDoorProps) {
  const phase = useMuseumStore((state) => state.phase)
  const openDoor = useMuseumStore((state) => state.openDoor)
  const [isHovered, setIsHovered] = useState(false)
  const isInteractive = phase === "entrance"
  const [leftLeaf, rightLeaf] = doorLeaves

  useCursor(isHovered && isInteractive)

  useFrame((_, delta) => {
    const target = isHovered && isInteractive ? ribbon.hover.glow : 0
    ribbonMaterial.emissiveIntensity = MathUtils.damp(
      ribbonMaterial.emissiveIntensity,
      target,
      doorHover.damping,
      frameDelta(delta)
    )
  })

  const handleUntie = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (isInteractive) {
      setIsHovered(false)
      openDoor()
    }
  }

  return (
    <group>
      {leftLeaf ? <DoorLeaf leafRef={refs.left} spec={leftLeaf} /> : null}
      {rightLeaf ? <DoorLeaf leafRef={refs.right} spec={rightLeaf} /> : null}
      <EntranceRibbon
        loopsRef={refs.loops}
        onHoverChange={setIsHovered}
        onUntie={handleUntie}
        ribbonRef={refs.ribbon}
      />
    </group>
  )
}
