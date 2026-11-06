import { mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import { mergePanes } from "@/museum/entrance/_lib/pane-geometry"
import {
  crestingGeometry,
  roofParts,
} from "@/museum/entrance/_lib/roof-geometry"
import { towerParts } from "@/museum/entrance/_lib/tower-geometry"
import { upperFloorParts } from "@/museum/entrance/_lib/upper-floor-geometry"

const floor = upperFloorParts()
const roofs = roofParts()
const corner = towerParts()

/**
 * Everything above the ground floor, one merged drawable per material: the
 * bedroom storey, the roof, the chimneys and the west tower.
 */
export const crownGeometry = {
  stone: mergeParts([...floor.stone, ...corner.stone]),
  limestone: mergeParts([...floor.limestone, ...corner.limestone]),
  slate: mergeParts([...roofs.slate, ...corner.slate]),
  lead: mergeParts([...floor.lead, ...roofs.lead, ...corner.lead]),
  panes: mergePanes([...floor.panes, ...corner.panes]),
  cresting: crestingGeometry(),
}
