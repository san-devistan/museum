import type { RoomBounds } from "@/museum/gallery/_lib/room-bounds"
import {
  buildChandelierWebs,
  buildRoomWebs,
} from "@/museum/gallery/cobwebs/_lib/cobweb-geometry"
import { cobwebMaterial } from "@/museum/gallery/cobwebs/_lib/cobweb-material"
import type { ManorWindowSpec } from "@/museum/gallery/windows/_lib/window-layout"
import { useEffect, useMemo } from "react"
import type { BufferGeometry } from "three"

type CobwebsProps = {
  bounds: RoomBounds
  windows: readonly ManorWindowSpec[]
}

// Webs strung across a room's top corners and over some of its windows.
export function Cobwebs({ bounds, windows }: CobwebsProps) {
  const geometry = useMemo(
    () => buildRoomWebs(bounds, windows),
    [bounds, windows]
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} material={cobwebMaterial()} renderOrder={2} />
  )
}

let chandelierWebs: BufferGeometry | null = null

// Webs hanging from a chandelier's arms, in the fixture's own frame so they
// sway with it.
export function ChandelierWebs() {
  chandelierWebs ??= buildChandelierWebs()
  return (
    <mesh
      geometry={chandelierWebs}
      material={cobwebMaterial()}
      renderOrder={2}
    />
  )
}
