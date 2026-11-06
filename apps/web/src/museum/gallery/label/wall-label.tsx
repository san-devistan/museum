import type { ArtworkLabel } from "@/museum/_lib/exhibit"
import {
  labelGeometry,
  labelMaterials,
  labelSize,
  pinMaterial,
} from "@/museum/gallery/label/_lib/label-assets"

type WallLabelProps = {
  label: ArtworkLabel
  position: readonly [number, number, number]
  rotation?: readonly [number, number, number]
}

const pinInset = 0.012
const pinX = labelSize.width / 2 - pinInset
const pinY = labelSize.height / 2 - pinInset
const pinCorners = [
  [-pinX, pinY],
  [pinX, pinY],
] as const

export function WallLabel({ label, position, rotation }: WallLabelProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh
        geometry={labelGeometry.sheet}
        material={labelMaterials(label)}
        position-z={labelSize.thickness / 2}
      />
      {pinCorners.map(([x, y]) => (
        <mesh
          key={`${x}:${y}`}
          geometry={labelGeometry.pin}
          material={pinMaterial}
          position={[x, y, labelSize.thickness + 0.003]}
          rotation-x={Math.PI / 2}
        />
      ))}
    </group>
  )
}
