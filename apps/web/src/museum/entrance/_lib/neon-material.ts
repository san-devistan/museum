import {
  signCanvasSize,
  signFeather,
  type LetterSpan,
  type SignLayers,
} from "@/museum/entrance/_lib/entrance-sign"
import {
  CanvasTexture,
  LinearFilter,
  NearestFilter,
  ShaderMaterial,
} from "three"

// The sign drawn from its still layers. Each letter's level fades its own
// tube (found through the tag map) and its halo (feathered into its
// neighbours along x). The layers mix in sRGB, as the canvas did, and are
// converted once at the end.

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D unlitMap;
uniform sampler2D coreMap;
uniform sampler2D haloMap;
uniform sampler2D arcMap;
uniform sampler2D tagMap;
uniform float levels[LETTERS];
uniform vec2 spans[LETTERS];
uniform float feather;
uniform float master;
uniform float arcLevel;

varying vec2 vUv;

float levelAt(int index) {
  return levels[clamp(index, 0, LETTERS - 1)];
}

// A dimming tube loses its white core faster than its pink glow.
float glowOf(float level) {
  return level * (2.0 - level);
}

vec4 over(vec4 below, vec4 layer, float alpha) {
  float coverage = layer.a * alpha;
  return vec4(
    layer.rgb * coverage + below.rgb * (1.0 - coverage),
    coverage + below.a * (1.0 - coverage)
  );
}

void main() {
  float x = vUv.x;
  float spanLevel = 1.0;
  float haloKeep = 1.0;
  for (int index = 0; index < LETTERS; index++) {
    vec2 span = spans[index];
    float level = levels[index];
    float inside = step(span.x, x) * (1.0 - step(span.y, x));
    spanLevel = mix(spanLevel, level, inside);
    float ramp = min(0.5 * (span.y - span.x) + feather, 2.0 * feather);
    float reach = min(x - span.x + feather, span.y + feather - x);
    float covered = clamp(reach / ramp, 0.0, 1.0);
    haloKeep *= 1.0 - (1.0 - glowOf(level)) * covered;
  }

  // Which letter owns this tube; where two overlap, the tag falls between
  // their indices and their levels blend.
  ivec2 tagSize = textureSize(tagMap, 0);
  vec4 tag = texelFetch(tagMap, min(ivec2(vUv * vec2(tagSize)), tagSize - 1), 0);
  float owner = tag.r * 255.0 - 1.0;
  float first = floor(owner);
  float glyphLevel = mix(
    levelAt(int(first)),
    levelAt(int(first) + 1),
    owner - first
  );
  float onGlyph = step(0.5, tag.a);
  float tubeLevel = mix(spanLevel, glyphLevel, onGlyph);
  float coreLevel = tubeLevel * tubeLevel;
  haloKeep = mix(haloKeep, min(haloKeep, glowOf(glyphLevel)), onGlyph);

  vec4 unlit = texture2D(unlitMap, vUv);
  vec4 color = vec4(unlit.rgb * unlit.a, unlit.a);
  color = over(color, texture2D(haloMap, vUv), haloKeep * master);
  color = over(color, texture2D(coreMap, vUv), coreLevel * master);
  color = over(color, texture2D(arcMap, vUv), arcLevel);

  vec3 straight = color.rgb / max(color.a, 0.0001);
  gl_FragColor = vec4(sRGBTransferEOTF(vec4(straight, 1.0)).rgb, color.a);
  #include <colorspace_fragment>
}
`

export type NeonMaterial = {
  material: ShaderMaterial
  textures: readonly CanvasTexture[]
  /** The arc layer, re-uploaded only while an arc is live. */
  arcTexture: CanvasTexture | null
  levels: Float32Array
  spans: Float32Array
}

type LayerKind = "still" | "live" | "tags"

function layerTexture(canvas: HTMLCanvasElement, kind: LayerKind = "still") {
  const texture = new CanvasTexture(canvas)
  if (kind === "still") {
    texture.anisotropy = 8
  } else {
    texture.generateMipmaps = false
  }
  if (kind === "live") {
    texture.minFilter = LinearFilter
  }
  if (kind === "tags") {
    texture.minFilter = NearestFilter
    texture.magFilter = NearestFilter
  }
  return texture
}

export function createNeonMaterial(
  layers: SignLayers | null,
  levels: Float32Array
): NeonMaterial {
  const unlit = layers ? layerTexture(layers.unlit.canvas) : null
  const core = layers ? layerTexture(layers.core.canvas) : null
  const halo = layers ? layerTexture(layers.halo.canvas) : null
  const tags = layers ? layerTexture(layers.tags.canvas, "tags") : null
  const arc = layers ? layerTexture(layers.arc.canvas, "live") : null
  const spans = new Float32Array(levels.length * 2)
  const material = new ShaderMaterial({
    defines: { LETTERS: levels.length },
    uniforms: {
      unlitMap: { value: unlit },
      coreMap: { value: core },
      haloMap: { value: halo },
      arcMap: { value: arc },
      tagMap: { value: tags },
      levels: { value: levels },
      spans: { value: spans },
      feather: { value: signFeather / signCanvasSize.width },
      master: { value: 1 },
      arcLevel: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  })
  const textures = [unlit, core, halo, tags, arc].filter(
    (texture): texture is CanvasTexture => texture !== null
  )
  return { material, textures, arcTexture: arc, levels, spans }
}

/** Re-uploads the still layers and the letters' x-ranges after a relayout. */
export function refreshNeonLayers(
  neon: NeonMaterial,
  spans: readonly LetterSpan[]
) {
  for (const texture of neon.textures) {
    texture.needsUpdate = true
  }
  spans.forEach((span, index) => {
    neon.spans[index * 2] = span.start / signCanvasSize.width
    neon.spans[index * 2 + 1] = span.end / signCanvasSize.width
  })
}

export function setNeonUniform(
  neon: NeonMaterial,
  name: "master" | "arcLevel",
  value: number
) {
  const uniform = neon.material.uniforms[name]
  if (uniform) {
    uniform.value = value
  }
}

export function disposeNeonMaterial(neon: NeonMaterial) {
  neon.material.dispose()
  for (const texture of neon.textures) {
    texture.dispose()
  }
}
