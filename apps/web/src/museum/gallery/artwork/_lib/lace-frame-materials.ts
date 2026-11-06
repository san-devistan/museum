import { paintNormalMap } from "@/museum/_lib/relief/height-field"
import { cottonField } from "@/museum/_lib/relief/relief-fields"
import { paintLace } from "@/museum/gallery/_lib/lace-painter"
import {
  artworkLightMap,
  pictureLight,
} from "@/museum/gallery/artwork/_lib/picture-light"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  CanvasTexture,
  Color,
  MeshPhysicalMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  type Texture,
} from "three"

const { color } = sceneTokens
const lacePixelsPerMeter = 560
const laceMaxSize = 2048
const cottonTileSize = 256
const cottonTileMeters = 0.18
const threadRelief = 2.2
const threadCutoff = 0.3 * 255

type LaceSpec = {
  id: string
  seed: number
  width: number
  height: number
}

function paintedLace(spec: LaceSpec) {
  const scale = Math.min(
    lacePixelsPerMeter,
    laceMaxSize / Math.max(spec.width, spec.height)
  )
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(spec.width * scale)
  canvas.height = Math.round(spec.height * scale)
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (context) {
    paintLace(context, {
      width: canvas.width,
      height: canvas.height,
      seed: spec.seed,
      thread: color.lace,
      shade: color.laceShade,
    })
  }
  return canvas
}

function readThreads(lace: HTMLCanvasElement) {
  const source = lace.getContext("2d", { willReadFrequently: true })
  return source?.getImageData(0, 0, lace.width, lace.height) ?? null
}

function solidThreads(threads: ImageData) {
  const canvas = document.createElement("canvas")
  canvas.width = threads.width
  canvas.height = threads.height
  const context = canvas.getContext("2d")
  if (!context) {
    return canvas
  }
  const image = new ImageData(
    new Uint8ClampedArray(threads.data),
    threads.width,
    threads.height
  )
  for (let offset = 3; offset < image.data.length; offset += 4) {
    image.data[offset] = (image.data[offset] ?? 0) > threadCutoff ? 255 : 0
  }
  context.putImageData(image, 0, 0)
  return canvas
}

function laceOnGround(threads: ImageData) {
  const canvas = document.createElement("canvas")
  canvas.width = threads.width
  canvas.height = threads.height
  const context = canvas.getContext("2d")
  if (context) {
    context.fillStyle = color.laceGround
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(solidThreads(threads), 0, 0)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function threadNormals(threads: ImageData) {
  const { width, height, data } = threads
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (context) {
    const values = new Float32Array(width * height)
    for (let index = 0; index < values.length; index += 1) {
      values[index] = (data[index * 4 + 3] ?? 0) / 255
    }
    paintNormalMap(context, {
      field: { width, height, values },
      strength: threadRelief,
    })
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = NoColorSpace
  texture.anisotropy = 8
  return texture
}

let cottonRelief: CanvasTexture | null = null

function cottonTexture(spec: LaceSpec) {
  if (!cottonRelief) {
    const canvas = document.createElement("canvas")
    canvas.width = cottonTileSize
    canvas.height = cottonTileSize
    const context = canvas.getContext("2d")
    if (context) {
      paintNormalMap(context, {
        field: cottonField(
          { width: cottonTileSize, height: cottonTileSize },
          7
        ),
        strength: 3.5,
      })
    }
    cottonRelief = new CanvasTexture(canvas)
    cottonRelief.colorSpace = NoColorSpace
    cottonRelief.wrapS = RepeatWrapping
    cottonRelief.wrapT = RepeatWrapping
  }
  const texture = cottonRelief.clone()
  texture.repeat.set(
    spec.width / cottonTileMeters,
    spec.height / cottonTileMeters
  )
  return texture
}

function faceMaterial(spec: LaceSpec, lightMap: Texture) {
  const threads = readThreads(paintedLace(spec))
  const map = threads ? laceOnGround(threads) : null
  return new MeshPhysicalMaterial({
    map,
    emissive: color.lightWarm,
    emissiveMap: map,
    emissiveIntensity: pictureLight.glow * 0.6,
    lightMap,
    lightMapIntensity: pictureLight.pool,
    normalMap: threads ? threadNormals(threads) : null,
    normalScale: new Vector2(1, 1),
    roughness: 0.9,
    sheen: 1,
    sheenRoughness: 0.75,
    sheenColor: new Color(color.laceShade),
  })
}

function edgeMaterial(spec: LaceSpec, lightMap: Texture) {
  return new MeshPhysicalMaterial({
    color: color.lace,
    lightMap,
    lightMapIntensity: pictureLight.pool * 0.8,
    normalMap: cottonTexture(spec),
    normalScale: new Vector2(1.4, 1.4),
    roughness: 0.95,
    sheen: 1,
    sheenRoughness: 0.7,
    sheenColor: new Color(color.laceShade),
  })
}

const laceFrames = new Map<string, MeshPhysicalMaterial[]>()

export function laceFrameMaterials(spec: LaceSpec) {
  const cached = laceFrames.get(spec.id)
  if (cached) {
    return cached
  }
  const lightMap = artworkLightMap({ x: 1, y: 1 })
  const materials = [faceMaterial(spec, lightMap), edgeMaterial(spec, lightMap)]
  laceFrames.set(spec.id, materials)
  return materials
}
