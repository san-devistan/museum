import { paintDamask } from "@/museum/_lib/damask-painter"
import {
  paintHeightGrey,
  paintNormalMap,
  type HeightField,
} from "@/museum/_lib/relief/height-field"
import {
  ashlarField,
  carpetField,
  marbleField,
  plasterField,
  boardField,
} from "@/museum/_lib/relief/relief-fields"
import { paintWood } from "@/museum/_lib/relief/wood-painter"
import { createTexture, type TextureSpec } from "@/museum/_lib/surface-texture"
import { paintVelvet } from "@/museum/_lib/velvet-painter"
import { sceneTokens, type SceneColor } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Vector2,
} from "three"

export type Surface =
  | "wallpaper"
  | "wallpaperWine"
  | "wallpaperFrost"
  | "wallpaperVeil"
  | "ceiling"
  | "carpet"
  | "frostCarpet"
  | "checker"
  | "cushion"
  | "stone"
  | "ashlar"
  | "marble"
  | "wood"

const { palette, color, manor, props } = sceneTokens
const damaskSize = { width: 512, height: 1024 }
const damaskMeters = [1.2, 2.4] as const
const velvetSize = 512
const carpetMeters = [1.6, 1.6] as const
const reliefSize = 512
const plasterMeters = [0.6, 1.2] as const

function fieldTextures(spec: {
  field: HeightField
  meters: readonly [number, number]
  strength: number
  range: readonly [number, number]
}) {
  const size = { width: spec.field.width, height: spec.field.height }
  const normal = createTexture({
    ...size,
    meters: spec.meters,
    colorSpace: NoColorSpace,
    paint: (context) =>
      paintNormalMap(context, { field: spec.field, strength: spec.strength }),
  })
  const roughness = createTexture({
    ...size,
    meters: spec.meters,
    colorSpace: NoColorSpace,
    paint: (context) =>
      paintHeightGrey(context, {
        field: spec.field,
        low: spec.range[0],
        high: spec.range[1],
      }),
  })
  return { normal, roughness }
}

function dimmed(hex: string, level: number) {
  return `#${new Color(hex).multiplyScalar(level).getHexString()}`
}

// One damask per room: a ground, an ink and how strongly the ink shows.
type DamaskStyle = { ground: string; ink: string; inkAlpha: number }

const damaskStyles = {
  noir: { ground: palette.black, ink: palette.white, inkAlpha: 0.085 },
  wine: { ground: props.wine, ink: palette.blush, inkAlpha: 0.11 },
  frost: {
    ground: dimmed(manor.nightHaze, 0.3),
    ink: manor.frost,
    inkAlpha: 0.1,
  },
  veil: { ground: manor.nightSky, ink: manor.moonlight, inkAlpha: 0.075 },
} as const satisfies Record<string, DamaskStyle>

function damaskMap(spec: Pick<TextureSpec, "meters">, style: DamaskStyle) {
  return createTexture({
    ...damaskSize,
    meters: spec.meters,
    colorSpace: SRGBColorSpace,
    paint: (context) =>
      paintDamask(context, {
        ...damaskSize,
        ...style,
        seed: 7,
        stripeAlpha: 0.035,
        grainAlpha: 0.03,
      }),
  })
}

function damaskRelief(spec: Pick<TextureSpec, "meters">) {
  return createTexture({
    ...damaskSize,
    meters: spec.meters,
    colorSpace: NoColorSpace,
    paint: (context) =>
      paintDamask(context, {
        ...damaskSize,
        seed: 7,
        ground: palette.white,
        ink: palette.black,
        inkAlpha: 0.45,
        stripeAlpha: 0.15,
        grainAlpha: 0.1,
      }),
  })
}

function createWallpaper(
  meters: readonly [number, number],
  style: DamaskStyle = damaskStyles.noir
) {
  const plaster = fieldTextures({
    field: plasterField({ width: reliefSize, height: reliefSize * 2 }, 11),
    meters: plasterMeters,
    strength: 8,
    range: [0.62, 1],
  })
  return new MeshStandardMaterial({
    map: damaskMap({ meters }, style),
    bumpMap: damaskRelief({ meters }),
    bumpScale: 1.2,
    normalMap: plaster.normal,
    normalScale: new Vector2(1.3, 1.3),
    roughnessMap: plaster.roughness,
    roughness: 1,
  })
}

type VelvetSpec = {
  seed: number
  base: string
  highlight: string
  shadow: string
  meters: readonly [number, number]
}

function velvetMap(spec: VelvetSpec) {
  return createTexture({
    width: velvetSize,
    height: velvetSize,
    meters: spec.meters,
    colorSpace: SRGBColorSpace,
    paint: (context) =>
      paintVelvet(context, {
        ...spec,
        width: velvetSize,
        height: velvetSize,
      }),
  })
}

type CarpetTone = { base: string; highlight: string; seed: number }

function createCarpet(
  tone: CarpetTone = { base: color.floor, highlight: palette.blush, seed: 3 }
) {
  const pile = fieldTextures({
    field: carpetField({ width: reliefSize, height: reliefSize }, 3),
    meters: [0.35, 0.35],
    strength: 5,
    range: [0.8, 1],
  })
  return new MeshPhysicalMaterial({
    map: velvetMap({
      ...tone,
      shadow: palette.black,
      meters: carpetMeters,
    }),
    normalMap: pile.normal,
    normalScale: new Vector2(1, 1),
    roughnessMap: pile.roughness,
    roughness: 1,
    sheen: 1,
    sheenRoughness: 0.9,
    sheenColor: new Color(tone.highlight).multiplyScalar(0.7),
  })
}

const checkerMeters = 0.6

// Two by two tiles per texture, each veined by the marble field.
function paintChecker(context: CanvasRenderingContext2D, field: HeightField) {
  const image = context.createImageData(field.width, field.height)
  const half = field.width / 2
  for (let index = 0; index < field.values.length; index += 1) {
    const x = index % field.width
    const y = Math.floor(index / field.width)
    const isWhite = (Math.floor(x / half) + Math.floor(y / half)) % 2 === 0
    const vein = field.values[index] ?? 0
    const grey = isWhite ? 168 - vein * 60 : 10 + vein * 26
    const offset = index * 4
    image.data[offset] = grey
    image.data[offset + 1] = grey
    image.data[offset + 2] = grey
    image.data[offset + 3] = 255
  }
  context.putImageData(image, 0, 0)
}

// Black and white marble laid in a checkerboard, under a soft polish.
function createChecker() {
  const field = marbleField({ width: reliefSize, height: reliefSize }, 47)
  const meters = [checkerMeters * 2, checkerMeters * 2] as const
  const relief = fieldTextures({
    field,
    meters,
    strength: 3,
    range: [0.2, 0.5],
  })
  const map = createTexture({
    width: reliefSize,
    height: reliefSize,
    meters,
    colorSpace: SRGBColorSpace,
    paint: (context) => paintChecker(context, field),
  })
  return new MeshPhysicalMaterial({
    map,
    color: new Color(color.trim).multiplyScalar(0.5),
    normalMap: relief.normal,
    normalScale: new Vector2(0.4, 0.4),
    roughnessMap: relief.roughness,
    roughness: 1,
    clearcoat: 0.45,
    clearcoatRoughness: 0.3,
  })
}

function createCushion() {
  const pile = fieldTextures({
    field: carpetField({ width: reliefSize / 2, height: reliefSize / 2 }, 5),
    meters: [0.3, 0.3],
    strength: 5,
    range: [0.8, 1],
  })
  return new MeshPhysicalMaterial({
    map: velvetMap({
      seed: 5,
      base: color.bench,
      highlight: palette.white,
      shadow: palette.wine,
      meters: [1, 1],
    }),
    normalMap: pile.normal,
    roughnessMap: pile.roughness,
    roughness: 1,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new Color(palette.white),
  })
}

function createStone() {
  const field = marbleField({ width: reliefSize, height: reliefSize }, 23)
  const relief = fieldTextures({
    field,
    meters: [0.8, 0.8],
    strength: 4,
    range: [0.25, 0.55],
  })
  return new MeshPhysicalMaterial({
    color: color.plinth,
    normalMap: relief.normal,
    normalScale: new Vector2(0.6, 0.6),
    roughnessMap: relief.roughness,
    roughness: 1,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  })
}

const ashlarMeters = [2.4, 2.4] as const

function createAshlar() {
  const relief = fieldTextures({
    field: ashlarField({ width: reliefSize, height: reliefSize }, 31),
    meters: ashlarMeters,
    strength: 10,
    range: [0.95, 0.55],
  })
  return new MeshStandardMaterial({
    color: color.facade,
    emissive: palette.wine,
    emissiveIntensity: 0.012,
    normalMap: relief.normal,
    normalScale: new Vector2(1.4, 1.4),
    roughnessMap: relief.roughness,
    roughness: 1,
  })
}

function createMarble() {
  const relief = fieldTextures({
    field: marbleField({ width: reliefSize, height: reliefSize }, 41),
    meters: [1.2, 1.2],
    strength: 3,
    range: [0.18, 0.45],
  })
  return new MeshPhysicalMaterial({
    color: color.trim,
    normalMap: relief.normal,
    normalScale: new Vector2(0.5, 0.5),
    roughnessMap: relief.roughness,
    roughness: 1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  })
}

const woodMeters = [1.4, 0.7] as const

function createWood() {
  const field = boardField({ width: reliefSize, height: reliefSize / 2 }, 17)
  const relief = fieldTextures({
    field,
    meters: woodMeters,
    strength: 3,
    range: [0.3, 0.62],
  })
  const map = createTexture({
    width: field.width,
    height: field.height,
    meters: woodMeters,
    colorSpace: SRGBColorSpace,
    paint: (context) =>
      paintWood(context, {
        field,
        base: sceneTokens.manor.wood,
        grain: sceneTokens.manor.woodGrain,
      }),
  })
  return new MeshStandardMaterial({
    map,
    normalMap: relief.normal,
    normalScale: new Vector2(0.5, 0.5),
    roughnessMap: relief.roughness,
    roughness: 1,
    metalness: 0.05,
  })
}

const surfaceFactories: Record<Surface, () => MeshStandardMaterial> = {
  wallpaper: () => createWallpaper(damaskMeters),
  wallpaperWine: () => createWallpaper(damaskMeters, damaskStyles.wine),
  wallpaperFrost: () => createWallpaper(damaskMeters, damaskStyles.frost),
  wallpaperVeil: () => createWallpaper(damaskMeters, damaskStyles.veil),
  ceiling: () => surfaceMaterial("wallpaper"),
  carpet: () => createCarpet(),
  frostCarpet: () =>
    createCarpet({ base: manor.nightHaze, highlight: manor.frost, seed: 13 }),
  checker: createChecker,
  cushion: createCushion,
  stone: createStone,
  ashlar: createAshlar,
  marble: createMarble,
  wood: createWood,
}

const surfaces = new Map<Surface, MeshStandardMaterial>()

export function surfaceMaterial(surface: Surface) {
  const cached = surfaces.get(surface)
  if (cached) {
    return cached
  }
  const material = surfaceFactories[surface]()
  surfaces.set(surface, material)
  return material
}

const plainMaterials = new Map<SceneColor, MeshStandardMaterial>()

export function plainMaterial(name: SceneColor) {
  const cached = plainMaterials.get(name)
  if (cached) {
    return cached
  }
  const material = new MeshStandardMaterial({
    color: color[name],
    roughness: 0.6,
  })
  plainMaterials.set(name, material)
  return material
}
