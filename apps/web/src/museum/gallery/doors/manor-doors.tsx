import type { Surface } from "@/museum/_lib/surface-materials"
import { HiddenDoor } from "@/museum/gallery/doors/_components/hidden-door"
import { RibbonDoor } from "@/museum/gallery/doors/_components/ribbon-door"
import { lockedDoors } from "@/museum/gallery/doors/_lib/door-locks"

type ManorDoorsProps = {
  isStill: boolean
  texturedSurfaces: ReadonlySet<Surface>
}

// The manor's locked doors, one way forward: two tied with ribbon, the
// corridor's end panel and the boudoir's wallpaper door. Each keeps its
// doorway shut (for the eye and for the visitor) until its lock is met.
export function ManorDoors({ isStill, texturedSurfaces }: ManorDoorsProps) {
  return lockedDoors.map((door) =>
    door.kind === "ribbon" ? (
      <RibbonDoor key={door.id} door={door} isStill={isStill} />
    ) : (
      <HiddenDoor
        key={door.id}
        door={door}
        isStill={isStill}
        texturedSurfaces={texturedSurfaces}
      />
    )
  )
}
