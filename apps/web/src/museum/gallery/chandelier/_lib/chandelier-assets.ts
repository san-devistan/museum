import { haloPositions } from "@/museum/gallery/chandelier/_lib/chandelier-crystals"
import {
  armAngles,
  armPaths,
  canopyProfile,
  chandelierLayout,
  columnBaseProfile,
  columnTopProfile,
  crownCurlPath,
  crystalBulbProfile,
  crystalVaseProfile,
  cupProfile,
  dishProfile,
  flameProfile,
  halfStepAngles,
  haloSize,
  teardropProfile,
  type ProfilePoint,
  type TubePath,
} from "@/museum/gallery/chandelier/_lib/chandelier-layout"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DataTexture,
  IcosahedronGeometry,
  LatheGeometry,
  LinearFilter,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PointsMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector2,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

function lathe(profile: readonly ProfilePoint[], segments: number) {
  return new LatheGeometry(
    profile.map(([radius, y]) => new Vector2(radius, y)),
    segments
  )
}

function tube(path: TubePath) {
  return new TubeGeometry(
    new CatmullRomCurve3(path.points),
    path.points.length * 4,
    path.radius,
    6,
    false
  )
}

function aroundColumn(angles: readonly number[], build: () => BufferGeometry) {
  return angles.map((angle) => build().rotateY(angle))
}

function chainLinks() {
  const { top, step, links } = chandelierLayout.chain
  return Array.from({ length: links }, (_, index) =>
    new TorusGeometry(0.017, 0.0042, 6, 18)
      .scale(1, 1.45, 1)
      .rotateY(index % 2 === 0 ? 0 : Math.PI / 2)
      .translate(0, top - index * step, 0)
  )
}

function buildIronGeometry() {
  const { tipRadius } = chandelierLayout
  const parts = [
    lathe(canopyProfile, 40),
    lathe(columnTopProfile, 28),
    lathe(columnBaseProfile, 28),
    ...chainLinks(),
    ...armPaths.flatMap((path) => aroundColumn(armAngles, () => tube(path))),
    ...aroundColumn(halfStepAngles, () => tube(crownCurlPath)),
    ...aroundColumn(armAngles, () =>
      lathe(cupProfile, 14).translate(tipRadius, 0, 0)
    ),
  ]
  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  return merged
}

function buildCrystalBodyGeometry() {
  const { tipRadius, dishY } = chandelierLayout
  const parts = [
    lathe(crystalBulbProfile, 10),
    lathe(crystalVaseProfile, 10),
    ...aroundColumn(armAngles, () =>
      lathe(dishProfile, 12).translate(tipRadius, dishY, 0)
    ),
  ]
  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  return merged
}

function buildCandleGeometry() {
  const { tipRadius, candle } = chandelierLayout
  const parts = aroundColumn(armAngles, () =>
    new CylinderGeometry(
      candle.radius,
      candle.radius,
      candle.height,
      12
    ).translate(tipRadius, candle.baseY + candle.height / 2, 0)
  )
  const merged = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  return merged
}

function buildHaloGeometry() {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(haloPositions, 3))
  return geometry
}

function buildHaloTexture() {
  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const dx = (column + 0.5) / size - 0.5
      const dy = (row + 0.5) / size - 0.5
      const falloff = Math.max(0, 1 - Math.hypot(dx, dy) * 2)
      const offset = (row * size + column) * 4
      data.fill(255, offset, offset + 3)
      data[offset + 3] = Math.round(falloff ** 2.2 * 255)
    }
  }
  const texture = new DataTexture(data, size, size)
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

export const chandelierGeometry = {
  iron: buildIronGeometry(),
  crystalBody: buildCrystalBodyGeometry(),
  candles: buildCandleGeometry(),
  flame: lathe(flameProfile, 12),
  bead: new OctahedronGeometry(1, 0),
  drop: lathe(teardropProfile, 8),
  ball: new IcosahedronGeometry(1, 1),
  halos: buildHaloGeometry(),
} as const

export const ironMaterial = new MeshStandardMaterial({
  color: sceneTokens.color.ironwork,
  metalness: 0.6,
  roughness: 0.35,
})

export const crystalMaterial = new MeshPhysicalMaterial({
  color: sceneTokens.color.crystal,
  transmission: 1,
  roughness: 0,
  metalness: 0,
  ior: 1.5,
  thickness: 0.02,
  envMapIntensity: 3.5,
  iridescence: 0.35,
  iridescenceIOR: 1.3,
  specularIntensity: 1,
  flatShading: true,
})

export const candleMaterial = new MeshStandardMaterial({
  color: sceneTokens.color.candle,
  roughness: 0.6,
  emissive: sceneTokens.palette.blush,
  emissiveIntensity: 0.12,
})

export const flameMaterial = new MeshBasicMaterial({
  color: sceneTokens.color.flame,
  toneMapped: false,
})

export const haloMaterial = new PointsMaterial({
  color: sceneTokens.color.flame,
  map: buildHaloTexture(),
  size: haloSize,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
  blending: AdditiveBlending,
  toneMapped: false,
})
