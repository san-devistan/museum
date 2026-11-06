import {
  buildBeamGeometry,
  buildMoteGeometry,
  buildPoolGeometry,
  moonPanes,
} from "@/museum/gallery/moonlight/_lib/moonbeam-geometry"
import { moonlightMaterials } from "@/museum/gallery/moonlight/_lib/moonlight-materials"
import type { ManorWindowSpec } from "@/museum/gallery/windows/_lib/window-layout"
import { useEffect, useMemo } from "react"
import type { Vector3 } from "three"

type MoonlightProps = {
  windows: readonly ManorWindowSpec[]
  direction: Vector3
  isStill: boolean
}

// Cold shafts from the moonlit windows, their panes printed on the carpet,
// and the dust that hangs in them (hidden when motion is reduced).
export function Moonlight({ windows, direction, isStill }: MoonlightProps) {
  const parts = useMemo(() => {
    const panes = moonPanes(windows, direction)
    return {
      beams: buildBeamGeometry(panes),
      pools: buildPoolGeometry(panes),
      motes: buildMoteGeometry(panes),
    }
  }, [windows, direction])
  const materials = moonlightMaterials()

  useEffect(
    () => () => {
      for (const part of Object.values(parts)) {
        part.dispose()
      }
    },
    [parts]
  )

  return (
    <group>
      <mesh geometry={parts.pools} material={materials.pool} renderOrder={1} />
      <mesh geometry={parts.beams} material={materials.beam} renderOrder={3} />
      {isStill ? null : (
        <points
          geometry={parts.motes}
          material={materials.motes}
          renderOrder={4}
        />
      )}
    </group>
  )
}
