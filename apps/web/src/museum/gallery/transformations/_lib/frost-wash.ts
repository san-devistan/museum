import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { AdditiveBlending, Color, MathUtils, ShaderMaterial } from "three"

// Frost-blue light washing a wall, from celle qui vient du dedans: brightest
// low down, in patches like frost on glass, with a pool on the floor below.

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const noiseChunk = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float bottom = mix(hash(cell), hash(cell + vec2(1.0, 0.0)), u.x);
  float top = mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), u.x);
  return mix(bottom, top, u.y);
}
`

const wallShader = /* glsl */ `
uniform float level;
uniform float manorTime;
uniform vec3 frost;
varying vec2 vUv;
${noiseChunk}

void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float sides = 1.0 - smoothstep(0.4, 1.0, across);
  float low = 1.0 - smoothstep(0.0, 1.0, vUv.y);
  vec2 p = vUv * vec2(18.0, 8.5);
  float frosting = noise(p) * 0.6 + noise(p * 2.7 + 3.1) * 0.4;
  float crystals = smoothstep(0.5, 0.8, frosting);
  float shimmer = 0.9 + 0.1 * sin(manorTime * 0.6 + vUv.x * 9.0 + vUv.y * 4.0);
  float light = sides * (0.3 + 0.7 * low) * (0.7 + 0.6 * crystals) * shimmer;
  gl_FragColor = vec4(frost * light * level, 1.0);
}
`

const floorShader = /* glsl */ `
uniform float level;
uniform vec3 frost;
varying vec2 vUv;

void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float sides = 1.0 - smoothstep(0.4, 1.0, across);
  float fromWall = 1.0 - vUv.y;
  float pool = exp(-fromWall * 3.2) * (1.0 - smoothstep(0.75, 1.0, fromWall));
  gl_FragColor = vec4(frost * sides * pool * level * 0.7, 1.0);
}
`

const frost = {
  value: new Color(sceneTokens.manor.frost)
    .lerp(new Color(sceneTokens.props.tulleFrost), 0.5)
    .multiplyScalar(0.62),
}

function washMaterial(fragmentShader: string, level: { value: number }) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { level, frost, manorTime },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}

export function frostWashMaterials(level: { value: number }) {
  return {
    wall: washMaterial(wallShader, level),
    floor: washMaterial(floorShader, level),
  }
}

// Seconds for the frost light to come up.
const washRise = 4

// Sets the wash's level `elapsed` seconds after the chapter woke.
export function riseFrost(level: { value: number }, elapsed: number) {
  level.value = MathUtils.smoothstep(Math.min(elapsed, washRise), 0, washRise)
}
