import { mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  DoubleSide,
  LatheGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
} from "three"

// Madame, glimpsed: a dark figure in a long dress under a tulle veil, seen
// from behind. No face, no hands: only her outline catching the cold light.
// She faces +z; her back and the veil are toward -z.

// Radius and height up her body, hem to neck.
const bodyProfile = [
  [0, 0],
  [0.32, 0],
  [0.31, 0.1],
  [0.27, 0.42],
  [0.21, 0.78],
  [0.14, 0.98],
  [0.115, 1.06],
  [0.14, 1.2],
  [0.155, 1.3],
  [0.185, 1.38],
  [0.13, 1.44],
  [0.048, 1.48],
  [0.044, 1.53],
  [0, 1.55],
] as const

const veilProfile = [
  [0.06, 1.74],
  [0.1, 1.66],
  [0.17, 1.45],
  [0.24, 1.15],
  [0.3, 0.82],
  [0.33, 0.62],
] as const

function lathe(
  profile: readonly (readonly [number, number])[],
  arc?: readonly [number, number]
) {
  return new LatheGeometry(
    profile.map(([radius, y]) => new Vector2(radius, y)),
    28,
    arc?.[0],
    arc?.[1]
  )
}

export function silhouetteGeometry() {
  // Shoulders wider than deep.
  const body = lathe(bodyProfile).scale(1, 1, 0.62)
  const head = new SphereGeometry(0.092, 18, 12)
    .scale(0.9, 1.12, 0.95)
    .translate(0, 1.64, 0)
  const chignon = new SphereGeometry(0.058, 14, 10).translate(0, 1.67, -0.075)
  // The veil falls from the crown down her back only.
  const veil = lathe(veilProfile, [Math.PI * 0.5, Math.PI]).scale(1, 1, 0.8)
  return { body: mergeParts([body, head, chignon]), veil }
}

const vertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vView = -view.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * view;
}
`

// Near black, with a rim where her outline turns away from the eye.
const bodyShader = /* glsl */ `
uniform float presence;
uniform vec3 shade;
uniform vec3 rim;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float edge = 1.0 - facing;
  float edge2 = edge * edge;
  gl_FragColor = vec4(shade + rim * edge2 * edge2, presence * (0.9 + 0.1 * edge));
  #include <colorspace_fragment>
}
`

// Black tulle: thicker where it turns away, its folds catching the light.
const veilShader = /* glsl */ `
uniform float presence;
uniform vec3 shade;
uniform vec3 rim;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float edge = 1.0 - facing;
  float sheer = mix(0.75, 0.3, facing);
  gl_FragColor = vec4(shade + rim * edge * edge * 0.6, presence * sheer);
  #include <colorspace_fragment>
}
`

export function silhouetteMaterials(presence: { value: number }) {
  const rim = { value: new Color(sceneTokens.manor.frost).multiplyScalar(0.22) }
  return {
    body: new ShaderMaterial({
      vertexShader,
      fragmentShader: bodyShader,
      uniforms: {
        presence,
        rim,
        shade: { value: new Color(sceneTokens.manor.nightSky) },
      },
      transparent: true,
      depthWrite: false,
    }),
    veil: new ShaderMaterial({
      vertexShader,
      fragmentShader: veilShader,
      uniforms: {
        presence,
        rim,
        shade: { value: new Color(sceneTokens.props.tulleBlack) },
      },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    }),
  }
}
