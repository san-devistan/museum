import { surfaceMaterial } from "@/museum/_lib/surface-materials"
import type { Point3 } from "@/museum/gallery/_lib/room-bounds"
import {
  buildCeilingRose,
  buildMouldingGeometry,
  type MouldingSpec,
} from "@/museum/gallery/mouldings/_lib/moulding-geometry"
import { dadoPanelMaterial } from "@/museum/gallery/mouldings/_lib/panel-material"
import { useEffect, useMemo } from "react"

type MouldingsProps = MouldingSpec & {
  roses?: readonly Point3[]
}

export function Mouldings({
  bounds,
  doorways,
  pictureRailY,
  hasUpperMouldings,
  roses = [],
}: MouldingsProps) {
  const geometry = useMemo(
    () => ({
      ...buildMouldingGeometry({
        bounds,
        doorways,
        pictureRailY,
        hasUpperMouldings,
      }),
      rose: buildCeilingRose(bounds.height),
    }),
    [bounds, doorways, pictureRailY, hasUpperMouldings]
  )
  const wood = surfaceMaterial("wood")

  useEffect(
    () => () => {
      for (const part of Object.values(geometry)) {
        part.dispose()
      }
    },
    [geometry]
  )

  return (
    <group>
      <mesh geometry={geometry.carved} material={wood} />
      <mesh geometry={geometry.field} material={dadoPanelMaterial()} />
      {roses.map(([x, , z]) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometry.rose}
          material={wood}
          position={[x, 0, z]}
        />
      ))}
    </group>
  )
}
