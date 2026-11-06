import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
} from "three"

const { color, palette } = sceneTokens

export const pictureLight = {
  gap: 0.16,
  reach: 0.36,
  drop: 0.1,
  hoodRatio: 0.55,
  minHood: 0.42,
  maxHood: 1.1,
  aimLift: 0.15,
  glow: 0.12,
  pool: 2,
  washWidth: 1.45,
  washHeight: 1.35,
  washLift: 0.12,
}

const hoodArc = Math.PI * 1.25
const hoodGapTheta = Math.PI + hoodArc / 2
const hoodGapAngle = Math.atan2(Math.cos(hoodGapTheta), Math.sin(hoodGapTheta))

export function hoodAim(toward: { y: number; z: number }) {
  const length = Math.hypot(toward.y, toward.z)
  return {
    turn: Math.atan2(toward.z, toward.y) - hoodGapAngle,
    direction: { y: toward.y / length, z: toward.z / length },
  }
}

const washSize = 256
const poolSize = 256
const poolReach = 1.8

function washIntensity(x: number, y: number) {
  const falloff = Math.max(0, 1 - x * x - y * y)
  return Math.min(1, falloff ** 2 * (1 + 0.15 * y))
}

function poolIntensity(x: number, y: number) {
  const radius = Math.hypot(x / 1.05, (y - 0.08) / 1.1)
  return Math.min(1, Math.exp(-0.5 * radius ** 3.5) * (0.88 + 0.12 * y))
}

function paintField(size: number, intensity: (x: number, y: number) => number) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")
  if (!context) {
    return canvas
  }
  const image = context.createImageData(size, size)
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = (column / (size - 1)) * 2 - 1
      const y = 1 - (row / (size - 1)) * 2
      const level = Math.round(255 * intensity(x, y))
      const offset = (row * size + column) * 4
      image.data[offset] = level
      image.data[offset + 1] = level
      image.data[offset + 2] = level
      image.data[offset + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}

function createWashTexture() {
  const texture = new CanvasTexture(paintField(washSize, washIntensity))
  texture.colorSpace = SRGBColorSpace
  return texture
}

let poolTexture: CanvasTexture | null = null

function basePoolTexture() {
  poolTexture ??= new CanvasTexture(
    paintField(poolSize, (x, y) => poolIntensity(x * poolReach, y * poolReach))
  )
  poolTexture.colorSpace = NoColorSpace
  return poolTexture
}

export function artworkLightMap(extent: { x: number; y: number }) {
  const texture = basePoolTexture().clone()
  const repeatX = extent.x / poolReach
  const repeatY = extent.y / poolReach
  texture.repeat.set(repeatX, repeatY)
  texture.offset.set(0.5 - repeatX / 2, 0.5 - repeatY / 2)
  return texture
}

export const pictureLightGeometry = {
  hood: new CylinderGeometry(0.035, 0.035, 1, 20, 1, false, 0, hoodArc),
  cap: new CylinderGeometry(0.036, 0.036, 0.012, 20),
  bar: new BoxGeometry(1, 0.012, 0.03),
  arm: new CylinderGeometry(0.007, 0.007, 1, 8),
  rose: new CylinderGeometry(0.03, 0.03, 0.02, 20),
  knuckle: new SphereGeometry(0.012, 12, 8),
  wash: new PlaneGeometry(1, 1),
}

export const pictureLightMaterials = {
  shell: new MeshStandardMaterial({
    color: color.ironwork,
    metalness: 0.7,
    roughness: 0.32,
    side: DoubleSide,
  }),
  brass: new MeshStandardMaterial({
    color: palette.blush,
    metalness: 1,
    roughness: 0.3,
  }),
  glow: new MeshBasicMaterial({
    color: palette.white,
    toneMapped: false,
  }),
  wash: new MeshBasicMaterial({
    map: createWashTexture(),
    color: color.lightWarm,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  }),
}
