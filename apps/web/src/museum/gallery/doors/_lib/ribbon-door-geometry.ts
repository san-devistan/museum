import { meteredBox } from "@/museum/_lib/metered-box"
import {
  leafCarving,
  leafInlay,
  leafIronwork,
} from "@/museum/entrance/_lib/door-carving"
import { ribbonGeometry } from "@/museum/entrance/_lib/entrance-assets"
import {
  doorFaceZ,
  doorLeaves as frontDoorLeaves,
} from "@/museum/entrance/_lib/entrance-layout"
import { mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import { eyelets } from "@/museum/entrance/_lib/ribbon-layout"
import type { DoorLeaf } from "@/museum/gallery/doors/_lib/door-leaves"
import { mirrorDepth } from "@/museum/gallery/doors/_lib/mirror-depth"
import type { BufferGeometry } from "three"

// The front door's carving, ironwork and satin ribbon, fitted to the manor's
// smaller double doors and carved on both faces.

export type CarvedLeaf = {
  wood: BufferGeometry
  pearl: BufferGeometry
  iron: BufferGeometry
  eyelets: BufferGeometry
}

function frontLeafFor(sign: 1 | -1) {
  return frontDoorLeaves.find((leaf) => leaf.sign === sign)
}

// The front door's ornament, stretched to this leaf and repeated, mirrored,
// on its back face.
function ornament(
  build: (spec: NonNullable<ReturnType<typeof frontLeafFor>>) => BufferGeometry,
  leaf: DoorLeaf
) {
  const front = frontLeafFor(leaf.sign)
  if (!front) {
    return []
  }
  const [frontWidth, frontHeight] = front.size
  const face = build(front)
    .scale(leaf.width / frontWidth, leaf.height / frontHeight, 1)
    .translate(0, -leaf.hinge[1], 0)
  return [face, mirrorDepth(face, leaf.depth / 2)]
}

// How much smaller the front door's ribbon and eyelets are on this door:
// they keep their height on the leaf, and their proportions.
function ribbonScale(leaf: DoorLeaf) {
  const front = frontLeafFor(leaf.sign)
  return front ? leaf.height / front.size[1] : 1
}

// Where the front door's eyelets sit on this leaf, front and back.
function leafEyelets(leaf: DoorLeaf, faceZ: number) {
  const [hingeX, hingeY] = leaf.hinge
  const scale = ribbonScale(leaf)
  return eyelets
    .filter(([x]) => Math.sign(x) === -leaf.sign)
    .flatMap(([x, y, z]) => {
      const eyelet = ribbonGeometry.eyelet
        .clone()
        .scale(scale, scale, scale)
        .translate(
          x * scale - hingeX,
          y * scale - hingeY,
          faceZ + (z - doorFaceZ) * scale
        )
      return [eyelet, mirrorDepth(eyelet, leaf.depth / 2)]
    })
}

export function carvedLeaf(leaf: DoorLeaf): CarvedLeaf {
  const slab = meteredBox([leaf.width, leaf.height, leaf.depth])
    .clone()
    .translate((leaf.sign * leaf.width) / 2, leaf.height / 2, leaf.depth / 2)
  return {
    wood: mergeParts([slab, ...ornament(leafCarving, leaf)]),
    pearl: mergeParts(ornament(leafInlay, leaf)),
    iron: mergeParts(ornament(leafIronwork, leaf)),
    eyelets: mergeParts(leafEyelets(leaf, leaf.depth)),
  }
}

// The front door's satin ribbon (kept whole: merging would drop its vertex
// colours and untie morph), placed on a door whose face is at `faceZ` by its
// group: scaled about the floor, its face moved onto the door's.
export type RibbonFit = {
  scale: number
  z: number
}

export function ribbonFit(leaf: DoorLeaf, faceZ: number): RibbonFit {
  const scale = ribbonScale(leaf)
  return { scale, z: faceZ - doorFaceZ * scale }
}
