import { paintNormalMap } from "@/museum/_lib/relief/height-field"
import { createTexture } from "@/museum/_lib/surface-texture"
import { cresting } from "@/museum/entrance/_lib/manor-upper-layout"
import {
  paintCresting,
  paintSlateRelief,
  paintSlates,
  readHeightField,
  slateTile,
} from "@/museum/entrance/_lib/slate-painter"
import {
  laceMaskSize,
  paintLaceMask,
} from "@/museum/entrance/_lib/window-painter"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  DoubleSide,
  MeshStandardMaterial,
  NoColorSpace,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  type WebGLProgramParametersWithUniforms,
} from "three"

const { facade, manor, palette } = sceneTokens

const slateSize = { width: 1024, height: 1024 }
/** One slate is 0.24 m wide and shows 0.17 m of its length. */
const slateMeters = [
  slateTile.columns * 0.24,
  slateTile.courses * 0.17,
] as const

function slateNormalMap() {
  const canvas = document.createElement("canvas")
  canvas.width = slateSize.width
  canvas.height = slateSize.height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) {
    return null
  }
  paintSlateRelief(context)
  const field = readHeightField(context)
  return createTexture({
    ...slateSize,
    meters: slateMeters,
    colorSpace: NoColorSpace,
    paint: (target) => paintNormalMap(target, { field, strength: 3 }),
  })
}

/** The moon catches whatever turns away from the eye: cone flanks, cheeks. */
const moonRim = {
  color: { value: new Color(facade.moonRim) },
  strength: { value: 0.22 },
}

function injectMoonRim(parameters: WebGLProgramParametersWithUniforms) {
  parameters.uniforms.moonRimColor = moonRim.color
  parameters.uniforms.moonRimStrength = moonRim.strength
  parameters.fragmentShader = parameters.fragmentShader
    .replace(
      "#include <common>",
      "#include <common>\nuniform vec3 moonRimColor;\nuniform float moonRimStrength;"
    )
    .replace(
      "#include <emissivemap_fragment>",
      [
        "#include <emissivemap_fragment>",
        "float rimTurn = 1.0 - saturate(abs(dot(normal, normalize(vViewPosition))));",
        "float rimLift = saturate(normal.y * 0.5 + 0.6);",
        "totalEmissiveRadiance += moonRimColor * moonRimStrength * rimTurn * rimTurn * rimTurn * rimLift;",
      ].join("\n")
    )
}

function createSlateMaterial() {
  const material = new MeshStandardMaterial({
    map: createTexture({
      ...slateSize,
      meters: slateMeters,
      colorSpace: SRGBColorSpace,
      paint: (context) =>
        paintSlates(context, {
          seed: 83,
          colors: {
            slate: facade.slate,
            shade: facade.slateShade,
            bloom: facade.slateBloom,
          },
        }),
    }),
    normalMap: slateNormalMap(),
    normalScale: new Vector2(1.2, 1.2),
    roughness: 0.56,
    metalness: 0.3,
    side: DoubleSide,
  })
  material.onBeforeCompile = injectMoonRim
  material.customProgramCacheKey = () => "manor-slate"
  return material
}

export const slateMaterial = createSlateMaterial()

/** Lead rolls on the ridge and hips, faintly picked out by the moon. */
export const leadMaterial = new MeshStandardMaterial({
  color: facade.iron,
  emissive: facade.moonRim,
  emissiveIntensity: 0.12,
  metalness: 0.65,
  roughness: 0.38,
})

export const crestingMaterial = new MeshStandardMaterial({
  color: facade.iron,
  emissive: facade.moonRim,
  emissiveIntensity: 0.1,
  metalness: 0.6,
  roughness: 0.4,
  alphaMap: createTexture({
    width: 256,
    height: 288,
    meters: [cresting.tile, cresting.height],
    colorSpace: NoColorSpace,
    paint: paintCresting,
  }),
  alphaTest: 0.5,
  alphaToCoverage: true,
  side: DoubleSide,
})

const laceMask = createTexture({
  ...laceMaskSize,
  meters: [1, 1],
  colorSpace: NoColorSpace,
  paint: (context) =>
    paintLaceMask(context, { thread: palette.white, ground: palette.black }),
})

/** Driven each frame: shared clock, and Madame's candle crossing her window. */
export const paneUniforms = {
  paneTime: { value: 0 },
  wanderU: { value: -2 },
  wanderLight: { value: 0 },
}

const paneVertex = /* glsl */ `
attribute vec4 paneGlow;
attribute vec2 paneSize;
varying vec2 vUv;
varying vec4 vGlow;
varying vec2 vSize;

void main() {
  vUv = uv;
  vGlow = paneGlow;
  vSize = paneSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const paneFragment = /* glsl */ `
uniform sampler2D laceMask;
uniform vec2 laceTile;
uniform float paneTime;
uniform float wanderU;
uniform float wanderLight;
uniform float candleHeight;
uniform vec3 roomColor;
uniform vec3 glowColor;
uniform vec3 coreColor;
uniform vec3 frostColor;
uniform vec3 leadColor;
varying vec2 vUv;
varying vec4 vGlow;
varying vec2 vSize;

float flutter(float time) {
  return 1.0 + 0.07 * sin(time * 7.3) + 0.045 * sin(time * 13.7 + 1.1)
    + 0.03 * sin(time * 23.1 + 2.3);
}

float leadLine(float along, float halfWidth) {
  float dist = abs(fract(along + 0.5) - 0.5);
  float blur = fwidth(along);
  return 1.0 - smoothstep(halfWidth - blur, halfWidth + blur, dist);
}

void main() {
  vec2 metres = vUv * vSize;
  float isWander = step(0.5, vGlow.w);
  float candleU = mix(vGlow.x, wanderU, isWander);
  float strength = vGlow.y * mix(1.0, wanderLight, isWander)
    * flutter(paneTime + vGlow.z);
  vec2 reach = metres - vec2(candleU * vSize.x, candleHeight);
  reach.y *= 0.75;
  float spread = dot(reach, reach);
  float halo = exp(-spread * 4.0);
  float core = exp(-spread * 60.0);
  float lace = clamp(texture2D(laceMask, metres / laceTile).r * 2.6, 0.0, 1.0);
  float sheen = smoothstep(0.35, 1.0, vUv.y * 0.8 + (1.0 - vUv.x) * 0.35);

  vec3 colour = roomColor;
  colour += glowColor * strength * halo * (0.28 + 0.95 * lace);
  colour += coreColor * strength * core * 0.4;
  colour += frostColor * (0.012 + 0.03 * lace + 0.05 * sheen);

  vec2 lattice = metres / vec2(0.12, 0.17);
  float lead = max(
    leadLine(lattice.x + lattice.y, 0.035),
    leadLine(lattice.x - lattice.y, 0.035)
  );
  colour = mix(colour, leadColor, lead * 0.8);

  gl_FragColor = vec4(colour, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/** Upstairs panes: a dark room, a lace curtain and, now and then, a candle. */
export const paneMaterial = new ShaderMaterial({
  uniforms: {
    ...paneUniforms,
    laceMask: { value: laceMask },
    laceTile: { value: new Vector2(0.75, 0.72) },
    candleHeight: { value: 0.36 },
    roomColor: { value: new Color(facade.room) },
    glowColor: { value: new Color(facade.candle) },
    coreColor: { value: new Color(facade.flame) },
    frostColor: { value: new Color(manor.frost) },
    leadColor: { value: new Color(facade.lead) },
  },
  vertexShader: paneVertex,
  fragmentShader: paneFragment,
})
