import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { Color } from "three"

// The pale mist that closes in on the thirteenth mirror while the visitor
// stays before it: a scalloped lace trim creeping in from the rim, sheer
// tulle behind it, and a thin haze over the rest. `hold` is how long they
// have stayed (0 to 1); the mirror and its frozen portrait share it, so the
// portrait keeps the lace.

// Lit by the room's candles, a little pink.
const mist = new Color(sceneTokens.palette.blush)
  .lerp(new Color(sceneTokens.palette.white), 0.5)
  .multiplyScalar(0.4)

export const mirrorMistChunk = /* glsl */ `
const vec3 mistColor = vec3(${mist.r.toFixed(4)}, ${mist.g.toFixed(4)}, ${mist.b.toFixed(4)});
// Scallops round the trim, and the trim's width.
const float mistScallops = 7.0;
const float mistTrim = 0.17;

float mistHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float mistNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = mistHash(cell);
  float b = mistHash(cell + vec2(1.0, 0.0));
  float c = mistHash(cell + vec2(0.0, 1.0));
  float d = mistHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 0 clear glass, 1 white mist.
float mirrorMist(vec2 plane, float hold, float time) {
  vec2 q = (plane - 0.5) * 2.0;
  float reach = length(q * vec2(1.0, 0.8));
  float angle = atan(q.y, q.x);
  float drift = mistNoise(plane * vec2(4.0, 5.5) + vec2(time * 0.04, time * -0.07));
  drift = drift * 0.65 + mistNoise(plane * 12.0 - vec2(time * 0.03)) * 0.35;
  // From beyond the corners at first to an oval round the face at the end.
  float front = mix(1.22, 0.66, hold);
  float lobe = abs(sin(angle * mistScallops));
  float inside = reach + 0.07 * lobe + (drift - 0.5) * 0.12 - front;
  // The trim: solid lace pierced by one eyelet in each scallop.
  float along = fract(angle * mistScallops / 3.14159265) - 0.5;
  vec2 eyelet = vec2(along * reach * 3.14159265 / mistScallops, inside - mistTrim * 0.5);
  float hole = 1.0 - smoothstep(0.024, 0.036, length(eyelet));
  float trim = smoothstep(0.0, 0.025, inside)
    * (1.0 - smoothstep(mistTrim - 0.02, mistTrim, inside));
  // Behind it, sheer tulle: a fine net of threads.
  vec2 net = abs(fract(vec2(plane.x + plane.y * 0.72, plane.x - plane.y * 0.72) * 34.0) - 0.5);
  float thread = 1.0 - smoothstep(0.05, 0.12, min(net.x, net.y));
  float tulle = smoothstep(mistTrim - 0.02, mistTrim + 0.04, inside)
    * (0.42 + 0.3 * thread + 0.2 * drift);
  float lace = max(trim * (1.0 - hole) * 0.9, tulle);
  float haze = hold * 0.12 * drift;
  return clamp(lace + haze, 0.0, 1.0) * smoothstep(0.0, 0.04, hold);
}

vec3 mistOver(vec3 seen, vec2 plane, float hold, float time) {
  return mix(seen, mistColor, mirrorMist(plane, hold, time) * 0.88);
}
`
