import { meteredPlane } from "@/museum/_lib/metered-box"
import { surfaceMaterial, type Surface } from "@/museum/_lib/surface-materials"
import type { CarpetPatch } from "@/museum/gallery/_lib/manor-dressing"
import { createPileMaterials } from "@/museum/gallery/carpet/carpet-pile"
import { useEffect, useMemo } from "react"

type CarpetPileProps = {
  patch: CarpetPatch
  surface: Surface
  // A runner laid over another floor gets its own solid backing.
  hasBacking?: boolean
}

const backingY = 0.001

export function CarpetPile({ patch, surface, hasBacking }: CarpetPileProps) {
  const material = surfaceMaterial(surface)
  const shells = useMemo(() => createPileMaterials(material.map), [material])
  const geometry = meteredPlane(patch.width, patch.depth)

  useEffect(
    () => () => {
      for (const shell of shells) {
        shell.material.dispose()
      }
    },
    [shells]
  )

  return (
    <group position={[patch.x, 0, patch.z]} rotation-x={-Math.PI / 2}>
      {hasBacking ? (
        <mesh geometry={geometry} material={material} position-z={backingY} />
      ) : null}
      {shells.map((shell) => (
        <mesh
          key={shell.shell}
          geometry={geometry}
          material={shell.material}
          position-z={shell.y}
        />
      ))}
    </group>
  )
}
