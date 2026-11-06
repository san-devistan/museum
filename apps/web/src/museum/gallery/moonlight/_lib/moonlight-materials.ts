import { createCanvasTexture } from "@/museum/_lib/surface-texture"
import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import {
  glassCrown,
  manorWindow,
} from "@/museum/gallery/windows/_lib/window-layout"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  ShaderMaterial,
  SRGBColorSpace,
} from "three"

const moonlight = new Color(sceneTokens.manor.moonlight)

const beamVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const beamFragment = /* glsl */ `
uniform vec3 color;
uniform float strength;
uniform float manorTime;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 toCamera = cameraPosition - vWorld;
  float facing = abs(dot(normalize(vNormal), normalize(toCamera)));
  float across = smoothstep(0.0, 0.3, vUv.x) * (1.0 - smoothstep(0.7, 1.0, vUv.x));
  float along = smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
  float streaks = 0.75 + 0.25 * sin(vUv.x * 37.0 + sin(vUv.y * 5.0 + manorTime * 0.2) * 2.0);
  float nearFade = smoothstep(0.5, 2.0, length(toCamera));
  float alpha = strength * pow(facing, 0.7) * across * along * streaks * nearFade;
  alpha *= 1.0 - 0.45 * vUv.y;
  gl_FragColor = vec4(color, alpha);
}
`

function createBeamMaterial() {
  return new ShaderMaterial({
    uniforms: {
      color: { value: moonlight },
      strength: { value: 0.32 },
      manorTime,
    },
    vertexShader: beamVertex,
    fragmentShader: beamFragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  })
}

// The window's silhouette as it falls on the carpet: arched panes, leading,
// glazing bars, all softened by distance.
function paintPool(context: CanvasRenderingContext2D) {
  const width = 256
  const height = 512
  const scaleX = width / manorWindow.glassWidth
  const scaleY = height / (glassCrown - manorWindow.sill)
  const springY = height - (manorWindow.springing - manorWindow.sill) * scaleY
  context.fillStyle = "#000"
  context.fillRect(0, 0, width, height)
  context.save()
  context.filter = "blur(5px)"
  context.fillStyle = "#fff"
  context.beginPath()
  context.moveTo(0, height)
  context.lineTo(0, springY)
  context.ellipse(
    width / 2,
    springY,
    width / 2,
    (manorWindow.glassWidth / 2) * scaleY,
    0,
    Math.PI,
    0
  )
  context.lineTo(width, height)
  context.closePath()
  context.fill()
  context.strokeStyle = "rgba(0, 0, 0, 0.75)"
  context.lineWidth = 9
  context.beginPath()
  context.moveTo(width / 2, 0)
  context.lineTo(width / 2, height)
  context.moveTo(0, springY)
  context.lineTo(width, springY)
  context.stroke()
  context.lineWidth = 3
  context.strokeStyle = "rgba(0, 0, 0, 0.5)"
  const step = 0.11 * scaleX
  for (let offset = -height; offset < width + height; offset += step) {
    context.beginPath()
    context.moveTo(offset, 0)
    context.lineTo(offset + height * 0.5, height)
    context.moveTo(offset, 0)
    context.lineTo(offset - height * 0.5, height)
    context.stroke()
  }
  context.restore()
}

function createPoolMaterial() {
  return new MeshBasicMaterial({
    color: moonlight,
    map: createCanvasTexture({
      width: 256,
      height: 512,
      colorSpace: SRGBColorSpace,
      paint: paintPool,
    }),
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
}

const moteVertex = /* glsl */ `
attribute float seed;
uniform float manorTime;
uniform float size;
varying float vGlint;
void main() {
  float phase = seed * 6.2831;
  vec3 drift = vec3(
    sin(manorTime * 0.11 + phase * 3.0),
    sin(manorTime * 0.07 + phase * 5.0) * 0.6 + sin(manorTime * 0.023 + phase) * 0.8,
    cos(manorTime * 0.09 + phase * 2.0)
  ) * 0.14;
  vec4 view = modelViewMatrix * vec4(position + drift, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = size * (0.6 + seed) / max(0.4, -view.z);
  float glint = 0.5 + 0.5 * sin(manorTime * (0.6 + seed) + phase * 7.0);
  vGlint = 0.35 + 0.65 * glint * glint * glint;
}
`

const moteFragment = /* glsl */ `
uniform vec3 color;
varying float vGlint;
void main() {
  float radius = length(gl_PointCoord - 0.5) * 2.0;
  float soft = 1.0 - smoothstep(0.2, 1.0, radius);
  gl_FragColor = vec4(color, soft * vGlint * 0.75);
}
`

function createMoteMaterial() {
  return new ShaderMaterial({
    uniforms: {
      color: { value: new Color(sceneTokens.manor.frost) },
      size: { value: 26 },
      manorTime,
    },
    vertexShader: moteVertex,
    fragmentShader: moteFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

function createMoonlightMaterials() {
  return {
    beam: createBeamMaterial(),
    pool: createPoolMaterial(),
    motes: createMoteMaterial(),
  }
}

let materials: ReturnType<typeof createMoonlightMaterials> | null = null

export function moonlightMaterials() {
  materials ??= createMoonlightMaterials()
  return materials
}
