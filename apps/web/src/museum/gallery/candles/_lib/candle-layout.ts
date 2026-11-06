import type { Collider } from "@/museum/_lib/museum-layout"
import { roomCenter, type RoomBounds } from "@/museum/gallery/_lib/room-bounds"
import type { WallMount } from "@/museum/gallery/_lib/wall-gaps"
import { Matrix4, Vector3 } from "three"

export type Candle = {
  base: Vector3
  height: number
}

export type GlowSpot = {
  position: Vector3
  normal: Vector3
  radius: number
  strength: number
}

// Wall girandoles and floor torchères that light one room.
export type CandleSet = {
  sconces: readonly WallMount[]
  torcheres: readonly Vector3[]
}

export const sconceY = 1.78
export const candleRadius = 0.021
export const torchere = { height: 1.42, armRadius: 0.21, armY: 1.5 } as const

// Torchères standing a little off each corner of a room.
export function cornerTorcheres(bounds: RoomBounds, inset = 0.55) {
  return [
    new Vector3(bounds.minX + inset, 0, bounds.minZ + inset),
    new Vector3(bounds.maxX - inset, 0, bounds.minZ + inset),
    new Vector3(bounds.minX + inset, 0, bounds.maxZ - inset),
    new Vector3(bounds.maxX - inset, 0, bounds.maxZ - inset),
  ]
}

export function mountMatrix(mount: WallMount) {
  return new Matrix4()
    .makeRotationY(mount.rotationY)
    .setPosition(...mount.position)
}

// Cup positions of a three-light girandole, in its wall-mounted frame.
export const sconceCups: readonly [Vector3, number][] = [
  [new Vector3(0, 0.25, 0.15), 0.2],
  [new Vector3(-0.19, 0.12, 0.17), 0.13],
  [new Vector3(0.19, 0.12, 0.17), 0.16],
]

const torchereCups: readonly [Vector3, number][] = [
  [new Vector3(0, torchere.height + 0.06, 0), 0.26],
  ...[0, 1, 2, 3].map((index): [Vector3, number] => {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4
    return [
      new Vector3(
        Math.cos(angle) * torchere.armRadius,
        torchere.armY,
        Math.sin(angle) * torchere.armRadius
      ),
      [0.17, 0.09, 0.21, 0.12][index] ?? 0.15,
    ]
  }),
]

export const torchereCupOffsets = torchereCups.map(([offset]) => offset)

export function candlesOf(set: CandleSet): Candle[] {
  return [
    ...set.sconces.flatMap((mount) => {
      const matrix = mountMatrix(mount)
      return sconceCups.map(([cup, height]) => ({
        base: cup.clone().applyMatrix4(matrix),
        height,
      }))
    }),
    ...set.torcheres.flatMap((origin) =>
      torchereCups.map(([cup, height]) => ({
        base: cup.clone().add(origin),
        height,
      }))
    ),
  ]
}

function toward(from: Vector3, to: Vector3) {
  return new Vector3(to.x - from.x, 0, to.z - from.z).normalize()
}

function torchereGlows(origin: Vector3, bounds: RoomBounds): GlowSpot[] {
  const center = roomCenter(bounds)
  const sideX = origin.x < center.x ? bounds.minX : bounds.maxX
  const sideZ = origin.z < center.z ? bounds.minZ : bounds.maxZ
  const onX = new Vector3(sideX, 0, origin.z)
  const onZ = new Vector3(origin.x, 0, sideZ)
  return [
    {
      position: onX.clone().setY(1.45),
      normal: toward(onX, origin),
      radius: 1.5,
      strength: 0.42,
    },
    {
      position: onZ.clone().setY(1.45),
      normal: toward(onZ, origin),
      radius: 1.5,
      strength: 0.42,
    },
    {
      position: origin.clone().setY(0.03),
      normal: new Vector3(0, 1, 0),
      radius: 1.3,
      strength: 0.3,
    },
  ]
}

// Where the candles would throw warm light: faked with additive glows on
// the walls and floor, so only one real light is needed per room.
export function glowSpotsOf(set: CandleSet, bounds: RoomBounds): GlowSpot[] {
  return [
    ...set.sconces.map((mount) => ({
      position: new Vector3(...mount.position).setY(sconceY + 0.2),
      normal: new Vector3(
        Math.sin(mount.rotationY),
        0,
        Math.cos(mount.rotationY)
      ),
      radius: 1.15,
      strength: 0.5,
    })),
    ...set.torcheres.flatMap((origin) => torchereGlows(origin, bounds)),
  ]
}

const footprint = 0.3

export function torchereColliders(torcheres: readonly Vector3[]): Collider[] {
  return torcheres.map((origin) => ({
    minX: origin.x - footprint,
    maxX: origin.x + footprint,
    minZ: origin.z - footprint,
    maxZ: origin.z + footprint,
  }))
}
