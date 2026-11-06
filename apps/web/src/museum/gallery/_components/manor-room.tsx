import type { Surface } from "@/museum/_lib/surface-materials"
import { GalleryShell } from "@/museum/gallery/_components/gallery-shell"
import type { RoomPiece } from "@/museum/gallery/_components/room-pieces"
import type { GallerySolid } from "@/museum/gallery/_lib/gallery-layout"
import type { RoomDressing } from "@/museum/gallery/_lib/manor-dressing"
import { RoomLights } from "@/museum/gallery/candles/room-lights"
import type { Ref } from "react"
import type { Group } from "three"

// The groups the gallery shows and hides as the visitor moves: the shell,
// what fills the room, and its two lights.
export type RoomGroups = {
  shell: Group | null
  content: Group | null
  lights: Group | null
}

type ManorRoomProps = {
  dressing: RoomDressing
  solids: readonly GallerySolid[]
  pieces: readonly RoomPiece[]
  texturedSurfaces: ReadonlySet<Surface>
  isLit: boolean
  isStill: boolean
  isInitiallyNear: boolean
  shellRef: Ref<Group>
  contentRef: Ref<Group>
  lightsRef: Ref<Group>
}

export function ManorRoom({
  dressing,
  solids,
  pieces,
  texturedSurfaces,
  isLit,
  isStill,
  isInitiallyNear,
  shellRef,
  contentRef,
  lightsRef,
}: ManorRoomProps) {
  return (
    <group name={dressing.room.id}>
      <group ref={shellRef}>
        <GalleryShell solids={solids} texturedSurfaces={texturedSurfaces} />
      </group>
      <group ref={contentRef}>
        {pieces.map((piece) => (
          <group key={piece.id}>{piece.render(isStill)}</group>
        ))}
      </group>
      <group ref={lightsRef} visible={isInitiallyNear}>
        <RoomLights lights={dressing.lights} isLit={isLit} isStill={isStill} />
      </group>
    </group>
  )
}
