import { createTexture } from "@/museum/_lib/surface-texture"
import { windowOpening } from "@/museum/entrance/_lib/facade-geometry"
import {
  archCurve,
  lancetHalf,
  shift,
  type Point2,
} from "@/museum/entrance/_lib/manor-arches"
import { manorWindow, mistLayers } from "@/museum/entrance/_lib/manor-layout"
import { createCurtainMaterial } from "@/museum/entrance/_lib/manor-materials"
import {
  paintCurtain,
  paintFanlight,
  paintLeadedGlass,
  paintMist,
} from "@/museum/entrance/_lib/window-painter"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  ClampToEdgeWrapping,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Texture,
} from "three"

const { facade, manor, palette } = sceneTokens
const unit = [1, 1] as const
const curtainSize = { width: 256, height: 704 }

const curtainColors = {
  room: facade.room,
  glow: facade.candle,
  core: facade.flame,
  lace: palette.blush,
}

function clamped(texture: Texture) {
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  return texture
}

/** Window-relative metres (centre at x = 0) to curtain canvas pixels. */
function toCanvas([x, y]: Point2): Point2 {
  const { curtain } = manorWindow
  return [
    ((x + curtain.halfWidth) / (curtain.halfWidth * 2)) * curtainSize.width,
    ((curtain.top - y) / (curtain.top - curtain.bottom)) * curtainSize.height,
  ]
}

function glassTracery() {
  const { halfSpan, springY, sill } = manorWindow
  const light = halfSpan / 2
  const subArches = [-1, 1].map((side) =>
    shift(archCurve(lancetHalf(light)(light)), [side * light, springY])
  )
  return {
    opening: windowOpening(0).map(toCanvas),
    tracery: [
      [
        [0, sill],
        [0, springY],
      ] as const,
      ...subArches,
    ].map((points) => points.map(toCanvas)),
    oculus: {
      center: toCanvas([0, springY + 0.47]),
      radius: 0.085 * (curtainSize.width / (manorWindow.curtain.halfWidth * 2)),
    },
  }
}

const curtainTexture = clamped(
  createTexture({
    ...curtainSize,
    meters: unit,
    colorSpace: SRGBColorSpace,
    paint: (context) => paintCurtain(context, curtainColors),
  })
)

const glassTexture = clamped(
  createTexture({
    ...curtainSize,
    meters: unit,
    colorSpace: SRGBColorSpace,
    paint: (context) =>
      paintLeadedGlass(context, {
        ...glassTracery(),
        colors: {
          tint: facade.glass,
          sheen: manor.frost,
          lead: facade.lead,
          stone: facade.limestone,
        },
      }),
  })
)

const fanlightTexture = clamped(
  createTexture({
    width: 512,
    height: 64,
    meters: unit,
    colorSpace: SRGBColorSpace,
    paint: (context) =>
      paintFanlight(context, {
        ...curtainColors,
        lead: facade.lead,
        stone: facade.limestoneShade,
      }),
  })
)

export const curtainMaterial = createCurtainMaterial(curtainTexture)

export const windowGlassMaterial = new MeshStandardMaterial({
  map: glassTexture,
  transparent: true,
  roughness: 0.16,
  metalness: 0.1,
  depthWrite: false,
})

export const fanlightMaterial = new MeshBasicMaterial({ map: fanlightTexture })

const mistTileMeters = 4

const mistCard = createTexture({
  width: 512,
  height: 128,
  meters: unit,
  colorSpace: SRGBColorSpace,
  paint: (context) => paintMist(context, { seed: 71, color: palette.white }),
})
mistCard.wrapT = ClampToEdgeWrapping

export const mistMaterials = mistLayers.map((layer) => {
  const map = mistCard.clone()
  map.repeat.set(layer.size[0] / mistTileMeters, 1)
  return new MeshBasicMaterial({
    color: facade.mist,
    map,
    transparent: true,
    opacity: layer.opacity,
    depthWrite: false,
  })
})
