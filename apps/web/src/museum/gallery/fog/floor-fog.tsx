import { createRandom, fractalNoise } from "@/museum/_lib/relief/height-field"
import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import {
  roomCenter,
  roomSize,
  type RoomBounds,
} from "@/museum/gallery/_lib/room-bounds"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useEffect, useMemo } from "react"
import {
  Color,
  DataTexture,
  Float32BufferAttribute,
  LinearFilter,
  LinearMipmapLinearFilter,
  PlaneGeometry,
  RedFormat,
  RepeatWrapping,
  ShaderMaterial,
  Vector4,
  type BufferGeometry,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

const layers = [0.05, 0.15, 0.28] as const
const noiseSize = 128

let noiseTexture: DataTexture | null = null

function fogNoise() {
  noiseTexture ??= createNoiseTexture()
  return noiseTexture
}

function createNoiseTexture() {
  const random = createRandom(151)
  const noise = fractalNoise(random, { x: 4, y: 4, octaves: 4 })
  const data = new Uint8Array(noiseSize * noiseSize)
  for (let y = 0; y < noiseSize; y += 1) {
    for (let x = 0; x < noiseSize; x += 1) {
      const value = noise(x / noiseSize, y / noiseSize) * 0.5 + 0.5
      data[y * noiseSize + x] = Math.round(
        Math.min(1, Math.max(0, value)) * 255
      )
    }
  }
  const texture = new DataTexture(data, noiseSize, noiseSize, RedFormat)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

const vertexShader = /* glsl */ `
attribute float layer;
varying vec3 vWorld;
varying float vLayer;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vLayer = layer;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D noise;
uniform float manorTime;
uniform vec3 color;
uniform float density;
uniform vec4 bounds;
varying vec3 vWorld;
varying float vLayer;
void main() {
  vec2 drift = vec2(0.016, 0.006) * manorTime * (1.0 + vLayer * 0.7);
  float broad = texture2D(noise, vWorld.xz * 0.07 + drift + vLayer * 0.37).r;
  float fine = texture2D(noise, vWorld.xz * 0.23 - drift * 1.8 + vLayer * 0.71).r;
  float wisps = smoothstep(0.44, 0.76, broad * 0.62 + fine * 0.38);
  float edge = min(
    min(vWorld.x - bounds.x, bounds.z - vWorld.x),
    min(vWorld.z - bounds.y, bounds.w - vWorld.z)
  );
  float hug = mix(1.0, 0.22, smoothstep(0.3, 4.0, edge));
  float nearFade = smoothstep(0.4, 2.6, length(cameraPosition - vWorld));
  float alpha = wisps * hug * nearFade * density * (1.0 - vLayer * 0.3);
  gl_FragColor = vec4(color, alpha);
}
`

function layerPlane(bounds: RoomBounds, y: number, index: number) {
  const { width, depth } = roomSize(bounds)
  const center = roomCenter(bounds)
  const plane = new PlaneGeometry(width, depth)
    .rotateX(-Math.PI / 2)
    .translate(center.x, y, center.z)
  const count = plane.getAttribute("position").count
  plane.setAttribute(
    "layer",
    new Float32BufferAttribute(new Float32Array(count).fill(index / 2), 1)
  )
  plane.deleteAttribute("normal")
  plane.deleteAttribute("uv")
  return plane
}

function createFog(bounds: RoomBounds) {
  const parts = layers.map((y, index) => layerPlane(bounds, y, index))
  const geometry: BufferGeometry = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  const material = new ShaderMaterial({
    uniforms: {
      noise: { value: fogNoise() },
      color: { value: new Color(sceneTokens.manor.fog) },
      density: { value: 0.85 },
      bounds: {
        value: new Vector4(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ),
      },
      manorTime,
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  })
  return { geometry, material }
}

type FloorFogProps = {
  bounds: RoomBounds
}

// Low mist creeping over a room's floor, thicker along the walls. It drifts
// on the shared manor clock, so it holds still under reduced motion.
export function FloorFog({ bounds }: FloorFogProps) {
  const fog = useMemo(() => createFog(bounds), [bounds])

  useEffect(
    () => () => {
      fog.geometry.dispose()
      fog.material.dispose()
    },
    [fog]
  )

  return (
    <mesh geometry={fog.geometry} material={fog.material} renderOrder={2} />
  )
}
