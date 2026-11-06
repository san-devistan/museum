import { poseDoorRibbon, doorRibbon } from "@/museum/entrance/_lib/door-ribbon"
import { ribbonMaterial } from "@/museum/entrance/_lib/entrance-assets"
import { ribbonHitArea, ribbonKnot } from "@/museum/entrance/_lib/ribbon-layout"
import { doorSatinMaterial } from "@/museum/entrance/_lib/satin-material"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import { useRef, type Ref } from "react"
import type { Group, Mesh } from "three"

type EntranceRibbonProps = {
  ribbonRef: Ref<Group>
  loopsRef: Ref<Group>
  onUntie: (event: ThreeEvent<MouseEvent>) => void
  onHoverChange: (isHovered: boolean) => void
}

/**
 * The opening sequence fades `ribbonMaterial` as it unties the ribbon
 * (opacity = 1 − progress) and the door's hover lights it; the satin follows
 * both, and loosens the bow and lacing with the same progress.
 */
function followUntie(lacing: Mesh | null, bow: Mesh | null) {
  doorSatinMaterial.opacity = ribbonMaterial.opacity
  doorSatinMaterial.depthWrite = ribbonMaterial.depthWrite
  doorSatinMaterial.emissiveIntensity = ribbonMaterial.emissiveIntensity
  poseDoorRibbon(lacing, bow, 1 - ribbonMaterial.opacity)
}

export function EntranceRibbon({
  ribbonRef,
  loopsRef,
  onUntie,
  onHoverChange,
}: EntranceRibbonProps) {
  const lacingRef = useRef<Mesh>(null)
  const bowRef = useRef<Mesh>(null)

  useFrame(() => {
    followUntie(lacingRef.current, bowRef.current)
  })

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onHoverChange(true)
  }

  return (
    <group ref={ribbonRef}>
      <mesh
        ref={lacingRef}
        geometry={doorRibbon.lacing}
        material={doorSatinMaterial}
      />
      <group ref={loopsRef} position={ribbonKnot.center}>
        <mesh
          ref={bowRef}
          geometry={doorRibbon.bow}
          material={doorSatinMaterial}
        />
      </group>
      <mesh
        position={ribbonHitArea.center}
        scale={ribbonHitArea.size}
        onClick={onUntie}
        onPointerOut={() => onHoverChange(false)}
        onPointerOver={handlePointerOver}
        visible={false}
      >
        <boxGeometry />
      </mesh>
    </group>
  )
}
