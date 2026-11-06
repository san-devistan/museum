import type { Surface } from "@/museum/_lib/surface-materials"
import {
  roomCenter,
  roomSize,
  type RoomBounds,
} from "@/museum/gallery/_lib/room-bounds"
import type { SceneColor } from "@workspace/ui/lib/scene-tokens"

export type Point = [x: number, y: number, z: number]

export type BoxFace = "px" | "nx" | "py" | "ny" | "pz" | "nz"

// A box in a room: textured once its surface is revealed, and a collider
// when it is an obstacle.
export type GallerySolid = {
  id: string
  color: SceneColor
  surface?: Surface
  center: Point
  size: Point
  isObstacle: boolean
  facadeFace?: BoxFace
}

export type SolidSpec = Omit<GallerySolid, "isObstacle">

export function obstacle(spec: SolidSpec): GallerySolid {
  return { ...spec, isObstacle: true }
}

export function decor(spec: SolidSpec): GallerySolid {
  return { ...spec, isObstacle: false }
}

export type BenchSpec = {
  id: string
  x: number
  z: number
  width: number
  depth: number
}

export const benchFrame = {
  legHeight: 0.34,
  legInset: 0.075,
  apronHeight: 0.08,
  cushionHeight: 0.1,
  cushionInset: 0.035,
} as const

// Upholstered bench: the wooden apron is the solid (and collider); its
// rounded velvet cushion and turned legs are drawn by BenchDetails.
export function benchSolids(bench: BenchSpec): GallerySolid[] {
  return [
    obstacle({
      id: `${bench.id}-apron`,
      color: "ironwork",
      surface: "wood",
      center: [
        bench.x,
        benchFrame.legHeight + benchFrame.apronHeight / 2,
        bench.z,
      ],
      size: [bench.width, benchFrame.apronHeight, bench.depth],
    }),
  ]
}

export type PedestalSpec = {
  id: string
  x: number
  z: number
}

export const pedestal = { size: 0.6, height: 1 } as const

const pedestalTrim = { base: 0.12, baseWidth: 0.72, cap: 0.05, capWidth: 0.68 }

// Stone pedestal with a moulded base and cap; its top stays at
// pedestal.height so whatever stands on it keeps its footing.
export function pedestalSolids(spec: PedestalSpec): GallerySolid[] {
  const bodyHeight = pedestal.height - pedestalTrim.cap
  return [
    obstacle({
      id: spec.id,
      color: "plinth",
      surface: "stone",
      center: [spec.x, bodyHeight / 2, spec.z],
      size: [pedestal.size, bodyHeight, pedestal.size],
    }),
    obstacle({
      id: `${spec.id}-base`,
      color: "plinth",
      surface: "stone",
      center: [spec.x, pedestalTrim.base / 2, spec.z],
      size: [pedestalTrim.baseWidth, pedestalTrim.base, pedestalTrim.baseWidth],
    }),
    decor({
      id: `${spec.id}-cap`,
      color: "plinth",
      surface: "stone",
      center: [spec.x, pedestal.height - pedestalTrim.cap / 2, spec.z],
      size: [pedestalTrim.capWidth, pedestalTrim.cap, pedestalTrim.capWidth],
    }),
  ]
}

export type BeamGrid = {
  acrossZ: readonly number[]
  alongX: readonly number[]
}

const beam = { width: 0.24, depth: 0.2, crossDepth: 0.18 }

// Dark coffered beams: some spanning the room's width at the given z,
// shallower ones running its depth at the given x.
export function ceilingBeamSolids(
  bounds: RoomBounds,
  grid: BeamGrid
): GallerySolid[] {
  const center = roomCenter(bounds)
  const size = roomSize(bounds)
  return [
    ...grid.acrossZ.map((z) =>
      decor({
        id: `beam-across-${z}`,
        color: "ironwork",
        surface: "wood",
        center: [center.x, bounds.height - beam.depth / 2, z],
        size: [size.width, beam.depth, beam.width],
      })
    ),
    ...grid.alongX.map((x) =>
      decor({
        id: `beam-along-${x}`,
        color: "ironwork",
        surface: "wood",
        center: [x, bounds.height - beam.crossDepth / 2, center.z],
        size: [beam.width, beam.crossDepth, size.depth],
      })
    ),
  ]
}
