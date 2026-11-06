import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  PlaneGeometry,
  ShaderMaterial,
  type Texture,
  type Vector2,
  type Vector4,
} from "three"

// The white tulle over a sleeping photograph. It hangs just in front of the
// print, inside the lace, and shows the photo's shapes and colours blurred
// through it. The next work to wake glows from within and breathes; the
// others stay dim and still. On waking it lets go at its top edge, slides
// down the print, slips out under the lace and falls to the floor, where it
// stays in a crumpled pool at the wall's foot (under reduced motion it only
// fades out of the frame and fades in on the floor).

export type VeilUniforms = {
  photo: { value: Texture | null }
  photoFit: { value: Vector4 }
  size: { value: Vector2 }
  corner: { value: number }
  // 0 dim and still, 1 lit from within and breathing.
  glow: { value: number }
  // 1 while the visitor looks at the next work: the tulle stirs.
  stir: { value: number }
  // How far its fall has gone, in time (0 hanging, 1 settled on the floor),
  // and how far it has faded.
  fall: { value: number }
  fade: { value: number }
  // The floor, in the frame's own metres (the frame's centre is 0).
  floorY: { value: number }
  // Crumples each pool its own way.
  seed: { value: number }
}

// Metres in front of the lace's back: clear of the print's domed face.
const veilDepth = { edge: 0.056, dome: 0.013 }

// How far the veil reaches under the lace past the print's opening.
export const veilOverlap = 0.006

// How far the glow spills onto the wall around the lace, in metres.
export const haloSpill = 0.55

// The fall, in its share of the fall's time and in metres: all of it is on
// the floor at `landed`, then it settles. `slack` keeps it falling a little
// past the floor so the last of it lands before then. The top edge folds
// over at `hinge` below it; the pool lies from `wallFoot` (clear of the
// skirting) outward, and `base` keeps it above a carpet's pile. On the
// floor it lies back and forth every `foldLength` of cloth, bunched in
// creases every `crease`.
const fallTuning = {
  landed: "0.82",
  slack: "0.45",
  hinge: "0.16",
  wallFoot: "0.05",
  base: "0.022",
  foldLength: "0.55",
  crease: "0.18",
}

// The slow swell of the next veil's breath, shared by the veil and its halo.
const breathChunk = /* glsl */ `
float breath() {
  return 0.5 + 0.5 * sin(manorTime * 1.2);
}
`

const vertexShader = /* glsl */ `
uniform float manorTime;
uniform vec2 size;
uniform vec4 photoFit;
uniform float glow;
uniform float stir;
uniform float fall;
uniform float floorY;
uniform float seed;
varying vec2 vUv;
varying vec2 vFold;
varying vec2 vPhotoUv;
varying float vBehind;
varying float vPool;
varying float vRise;
varying vec3 vView;
varying vec3 vLight;
${breathChunk}

const float PI = 3.14159265;

void main() {
  vUv = uv;
  vec3 rest = position;
  float hang = 1.0 - uv.y;
  float fromHem = uv.y * size.y;
  float across = rest.x / (size.x * 0.5);

  // Folds fall from gathers at the top and open out toward the hem; they
  // travel with the cloth.
  float phase = rest.x * (24.0 - 7.0 * hang) + sin(rest.x * 3.1 + 0.7) * 1.8
    + sin(rest.y * 2.3 + rest.x * 4.0) * 1.1;
  float depth = 0.0016 + 0.0036 * hang;

  // The fall: a slow slide off the print, faster and faster, until all of
  // it lies on the floor; then it settles.
  float t = min(fall / ${fallTuning.landed}, 1.0);
  float settle = smoothstep(${fallTuning.landed}, 1.0, fall);
  float reach = size.y * 0.5 - floorY + ${fallTuning.slack};
  float drop = t * t * (0.55 + 0.45 * t) * reach;

  // It lets go at its top edge first: the top folds over, forward and down.
  float bend = smoothstep(0.0, 0.16, fall) * 2.0;
  float hinge = ${fallTuning.hinge} * (1.0 + 0.4 * sin(across * 4.0 + seed));
  float flop = max(hinge - hang * size.y, 0.0);
  vec3 air = vec3(rest.x, rest.y - flop + flop * cos(bend) - drop, 0.0);

  // Over the print it keeps to its domed face; once out under the lace,
  // nothing holds it: it falls off the wall and narrows, ripples run up it,
  // it sways, its edges flap and the corners of its hem lag behind.
  float laceBottom = -size.y * 0.5 - 0.1;
  float free = clamp((laceBottom - air.y) * 2.0, 0.0, 1.0);
  float moving = smoothstep(0.0, 0.08, fall) * (1.0 - settle);
  float flutter = moving * free;
  float ripple = sin(fromHem * 10.0 - drop * 9.0 + across * 1.5 + seed) * 0.7
    + sin(rest.x * 5.0 - drop * 6.0 + fromHem * 4.0 + seed * 1.3) * 0.3;
  float hemLag = 1.0 - smoothstep(0.0, 0.45, fromHem);
  air.x *= 1.0 - free * (0.14 + 0.06 * sin(fromHem * 3.0 + seed));
  air.x += flutter * (0.05 * sin(fromHem * 4.5 - drop * 6.0 + seed)
    + across * 0.05 * sin(fromHem * 7.0 - drop * 8.0 + seed * 2.0));
  air.y += flutter * hemLag * across * across
    * (0.1 + 0.04 * sin(drop * 7.0 + across * 3.0 + seed));

  vec2 onPrint = clamp(air.xy / (size * 0.5), -1.0, 1.0);
  float dome = (1.0 - onPrint.x * onPrint.x) * (1.0 - onPrint.y * onPrint.y);
  float billow = glow * (0.002 + 0.007 * breath()) * dome
    + stir * 0.006 * sin(manorTime * 2.7 + rest.x * 5.0 + rest.y * 3.0) * hang;
  air.z = ${veilDepth.edge.toFixed(3)} + ${veilDepth.dome.toFixed(3)} * dome
    + sin(phase) * depth + billow + flop * sin(bend) + free * 0.06
    + moving * mix(0.008, 0.07, free) * ripple;

  // Where it comes to rest: laid back and forth at the wall's foot, more
  // cloth than floor, so it bunches in crooked creases both ways; heaped
  // against the skirting and in the middle, its outline uneven. A wide veil
  // gathers more as it falls, and heaps higher.
  float gather = clamp(0.95 - 0.22 * size.x / size.y, 0.55, 0.8);
  float heap = 0.75 / gather;
  float fold = fromHem / ${fallTuning.foldLength}
    + 0.35 * sin(across * 2.6 + seed);
  float turn = cos(fold * PI);
  float middle = 1.0 - 0.3 * across * across;
  float lobe = middle * (0.72 + 0.18 * sin(across * 3.3 + seed * 1.3)
    + 0.1 * sin(across * 8.1 + seed * 2.1));
  float creasePhase = fromHem / ${fallTuning.crease} * 2.0 * PI + across * 2.5
    + 3.0 * sin(across * 1.7 + seed)
    + 1.6 * sin(fromHem * 3.1 + across * 2.2 + seed);
  float bunchPhase = rest.x / ${fallTuning.crease} * 1.6 * PI
    + fromHem * 4.0 + seed * 2.3;
  float crease = (0.5 - 0.5 * cos(creasePhase))
    * (0.55 + 0.45 * (0.5 + 0.5 * sin(bunchPhase)));
  float againstWall = max(turn, 0.0);
  float poolReach = clamp(size.y * 0.26, 0.26, 0.42);
  vec3 pile = vec3(
    rest.x * (gather + 0.05 * sin(fromHem * 5.0 + seed))
      + 0.035 * sin(creasePhase * 0.5 + across * 3.0),
    floorY + ${fallTuning.base}
      + (0.07 * fromHem / size.y + 0.055 * crease
        + 0.05 * againstWall * againstWall) * middle * heap,
    ${fallTuning.wallFoot} + (0.5 - 0.5 * turn) * poolReach * lobe
      + 0.025 * crease
  );

  // It curls toward its place as it nears the floor, lands puffed with air
  // and sinks as the rest lands on it.
  float above = air.y - pile.y;
  float landing = (1.0 - smoothstep(0.0, 0.35, above))
    * smoothstep(0.0, 0.02, fall);
  float sunk = smoothstep(0.0, 0.5, max(-above, 0.0));
  pile.y += 0.03 * (1.0 - sunk) * (1.0 - settle) * landing;
  air.y = max(air.y, pile.y);
  vec3 p = mix(air, pile, landing);

  // The photo shows through where it still covers the print.
  vPhotoUv = (p.xy / size + 0.5) * photoFit.xy + photoFit.zw;
  vec2 outside = abs(p.xy) - size * 0.5;
  vBehind = (1.0 - smoothstep(0.0, 0.04, max(outside.x, outside.y)))
    * (1.0 - landing);
  vFold = mix(vec2(sin(phase), cos(phase)), vec2(0.0, crease), landing);
  vPool = landing;
  vRise = clamp((p.y - floorY) * 8.0, 0.0, 1.0);
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  vView = view.xyz;
  // The room's light, from above and in front of the wall.
  vLight = normalize((modelViewMatrix * vec4(0.0, 1.0, 0.7, 0.0)).xyz);
  gl_Position = projectionMatrix * view;
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D photo;
uniform vec2 size;
uniform float corner;
uniform float glow;
uniform float fall;
uniform float fade;
uniform float manorTime;
uniform vec3 tulle;
uniform vec3 inner;
varying vec2 vUv;
varying vec2 vFold;
varying vec2 vPhotoUv;
varying float vBehind;
varying float vPool;
varying float vRise;
varying vec3 vView;
varying vec3 vLight;
${breathChunk}

float roundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

vec3 blurredPhoto(vec2 uv) {
  vec2 spread = vec2(0.04, 0.04 * size.x / size.y);
  vec3 sum = texture2D(photo, uv, 4.5).rgb * 0.36;
  sum += texture2D(photo, uv + vec2(spread.x, spread.y), 5.0).rgb * 0.16;
  sum += texture2D(photo, uv + vec2(-spread.x, spread.y), 5.0).rgb * 0.16;
  sum += texture2D(photo, uv + vec2(spread.x, -spread.y), 5.0).rgb * 0.16;
  sum += texture2D(photo, uv + vec2(-spread.x, -spread.y), 5.0).rgb * 0.16;
  return sum;
}

void main() {
  vec2 local = (vUv - 0.5) * size;
  float edge = roundedBox(local, size * 0.5, corner);
  float inside = 1.0 - smoothstep(-0.022, 0.0, edge);

  // Where a fold turns away, more layers of net overlap: whiter, thicker.
  float turned = abs(vFold.y);
  float lit = 0.88 + 0.12 * vFold.x;

  // A fine net, faded out where it would shimmer at a distance.
  vec2 cell = local * 240.0;
  float net = abs(sin(cell.x + cell.y)) * abs(sin(cell.x - cell.y));
  float netFade = clamp(1.0 - max(fwidth(cell.x), fwidth(cell.y)) * 0.8, 0.0, 1.0);
  float weave = mix(1.0, 0.8 + 0.32 * net, netFade);

  vec2 fromCentre = (vUv - vec2(0.5, 0.55)) * vec2(1.0, 1.2);
  float centre = 1.0 - smoothstep(0.0, 0.75, length(fromCentre));
  float swell = breath();

  // Off the print it is a cloth of its own: what faces the room's light
  // catches it, what is seen edge-on stacks more net in view (whiter,
  // thicker), and the bottom of its pool keeps dark.
  vec3 slope = cross(dFdx(vView), dFdy(vView));
  vec3 facet = normalize(slope + vec3(0.0, 0.0, 1e-10));
  float facing = abs(dot(facet, normalize(-vView)));
  float lambert = abs(dot(facet, normalize(vLight)));
  float loose = 1.0 - vBehind;
  float sheer = mix(1.0, 0.7 + 0.45 * (1.0 - facing), loose);
  float shade = mix(1.0, (0.4 + 0.9 * lambert) * (0.7 + 0.3 * vRise), loose)
    * mix(1.0, 1.4 + 1.4 * vFold.y, vPool);

  // Pooled, nothing of the print shows through any more.
  vec3 through = vec3(0.0);
  if (fall < 1.0) {
    through = blurredPhoto(vPhotoUv);
  }
  float light = mix(0.14, 0.4, glow) * shade * sheer;
  vec3 cloth = tulle * light * lit * (0.85 + 0.3 * turned) * weave;
  float veiling = mix(1.0, 0.45 + 0.15 * turned, vBehind);
  vec3 color = mix(through * mix(0.3, 0.75, glow), cloth, veiling);

  // Light from behind the print, tinted by it, swelling with each breath.
  vec3 heart = inner * (0.5 + 0.5 * through / (through + 0.2));
  color += heart * glow * (0.12 + 0.32 * swell) * (0.25 + 0.75 * centre)
    * vBehind;

  float cover = (0.8 + 0.14 * turned) * mix(1.0, weave, 0.5)
    * min(sheer, 1.0) * mix(1.0, 0.8, vPool);
  float alpha = inside * cover * (1.0 - smoothstep(0.3, 1.0, fade));
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const haloVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// A soft light on the wall around the lace, as if the print were lit from
// behind; it breathes with the veil.
const haloFragmentShader = /* glsl */ `
uniform vec2 size;
uniform float glow;
uniform float fade;
uniform float manorTime;
uniform vec3 inner;
varying vec2 vUv;
${breathChunk}

void main() {
  float reach = ${haloSpill.toFixed(2)};
  vec2 local = (vUv - 0.5) * (size + reach * 2.0);
  float round = min(size.x, size.y) * 0.35;
  vec2 q = abs(local) - size * 0.5 + round;
  float outside = max(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - round, 0.0);
  float spill = exp(-outside / (reach * 0.3));
  spill *= 1.0 - smoothstep(reach * 0.55, reach, outside);
  float level = glow * (0.035 + 0.075 * breath()) * (1.0 - fade);
  gl_FragColor = vec4(inner * spill * level, 1.0);
  #include <colorspace_fragment>
}
`

const tulle = { value: new Color(sceneTokens.props.tulleWhite) }
const inner = {
  value: new Color(sceneTokens.manor.candleLight).lerp(
    new Color(sceneTokens.palette.white),
    0.55
  ),
}

export function createVeilMaterial(uniforms: VeilUniforms) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { ...uniforms, manorTime, tulle, inner },
    transparent: true,
    depthWrite: false,
    // Folded on the floor, it shows both faces; one pass is enough for a
    // sheer white cloth.
    side: DoubleSide,
    forceSinglePass: true,
  })
}

export function createHaloMaterial(
  uniforms: Pick<VeilUniforms, "glow" | "fade"> & { size: { value: Vector2 } }
) {
  return new ShaderMaterial({
    vertexShader: haloVertexShader,
    fragmentShader: haloFragmentShader,
    uniforms: { ...uniforms, manorTime, inner },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}

const planes = new Map<string, PlaneGeometry>()

function plane(width: number, height: number, columns: number, rows: number) {
  const key = `${width}:${height}:${columns}:${rows}`
  const cached = planes.get(key)
  if (cached) {
    return cached
  }
  const geometry = new PlaneGeometry(width, height, columns, rows)
  planes.set(key, geometry)
  return geometry
}

// Rows enough for the folds of its pool to stay round.
export function veilGeometry(width: number, height: number) {
  return plane(width, height, 40, 72)
}

export function haloGeometry(width: number, height: number) {
  return plane(width + haloSpill * 2, height + haloSpill * 2, 1, 1)
}
