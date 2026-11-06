import { createRandom, fractalNoise } from "@/museum/_lib/relief/height-field"
import { createTexture } from "@/museum/_lib/surface-texture"
import { moon } from "@/museum/entrance/_lib/manor-upper-layout"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  BackSide,
  Color,
  NoColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three"

const { facade } = sceneTokens

/** Far enough to sit behind the manor, inside the camera's far plane. */
export const skyRadius = 80

function paintCloudNoise(context: CanvasRenderingContext2D) {
  const { width, height } = context.canvas
  const noise = fractalNoise(createRandom(97), { x: 5, y: 5, octaves: 5 })
  const image = context.createImageData(width, height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Math.min(
        1,
        Math.max(0, 0.5 + noise(x / width, y / height) * 1.1)
      )
      const offset = (y * width + x) * 4
      const grey = Math.round(value * 255)
      image.data[offset] = grey
      image.data[offset + 1] = grey
      image.data[offset + 2] = grey
      image.data[offset + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
}

const cloudMap = createTexture({
  width: 256,
  height: 256,
  meters: [1, 1],
  colorSpace: NoColorSpace,
  paint: paintCloudNoise,
})

const moonDirection = new Vector3(
  Math.sin(moon.azimuth) * Math.cos(moon.elevation),
  Math.sin(moon.elevation),
  -Math.cos(moon.azimuth) * Math.cos(moon.elevation)
).normalize()
const moonRight = moonDirection
  .clone()
  .cross(new Vector3(0, 1, 0))
  .normalize()
const moonUp = moonRight.clone().cross(moonDirection).normalize()

/** Clock for the drifting clouds and the stars; frozen for reduced motion. */
export const skyTime = { value: 0 }

const skyVertex = /* glsl */ `
varying vec3 vDirection;

void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const skyFragment = /* glsl */ `
uniform sampler2D cloudMap;
uniform float skyTime;
uniform vec3 zenithColor;
uniform vec3 horizonColor;
uniform vec3 hazeColor;
uniform vec3 moonColor;
uniform vec3 haloColor;
uniform vec3 cloudColor;
uniform vec3 starColor;
uniform vec3 moonDirection;
uniform vec3 moonRight;
uniform vec3 moonUp;
uniform float moonRadius;
varying vec3 vDirection;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

// Thin wisps on a flat deck overhead, thinning out towards the horizon.
float cloudDensity(vec3 direction) {
  vec2 deck = direction.xz / (max(direction.y, 0.0) + 0.16);
  vec2 drift = vec2(skyTime * 0.0032, skyTime * 0.0008);
  float broad = texture2D(cloudMap, deck * vec2(0.05, 0.26) + drift).r;
  float fine = texture2D(cloudMap, deck * vec2(0.14, 0.8) - drift * 1.6 + 0.37).r;
  float body = broad * 0.75 + fine * 0.45;
  return smoothstep(0.58, 0.9, body) * smoothstep(0.03, 0.22, direction.y) * 0.75;
}

float starField(vec3 direction) {
  vec2 sphere = vec2(
    atan(direction.x, -direction.z),
    asin(clamp(direction.y, -1.0, 1.0))
  ) * 110.0;
  vec2 cell = floor(sphere);
  float seed = hash(cell);
  vec2 spot = vec2(hash(cell + 7.13), hash(cell + 3.71)) * 0.6 + 0.2;
  float point = 1.0 - smoothstep(0.05, 0.17, length(fract(sphere) - spot));
  float twinkle = 0.65 + 0.35 * sin(skyTime * (1.1 + seed * 2.0) + seed * 40.0);
  return step(0.984, seed) * point * twinkle * (seed - 0.984) * 50.0;
}

void main() {
  vec3 direction = normalize(vDirection);
  float up = direction.y;
  float low = 1.0 - clamp(up, 0.0, 1.0);
  vec3 colour = mix(zenithColor, horizonColor, low * low * low);
  float haze = 1.0 - smoothstep(0.0, 0.14, abs(up));
  colour = mix(colour, hazeColor, haze * 0.4);
  colour *= mix(0.3, 1.0, smoothstep(-0.2, 0.0, up));

  float facing = dot(direction, moonDirection);
  float angle = acos(clamp(facing, -1.0, 1.0));
  float glowNear = exp(-angle * 26.0);
  float glowFar = exp(-angle * 5.5);
  colour += haloColor * (glowNear * 0.32 + glowFar * 0.07);

  vec2 face = vec2(dot(direction, moonRight), dot(direction, moonUp)) / moonRadius;
  float rim = angle / moonRadius;
  float edge = max(fwidth(rim), 0.002);
  float disc = (1.0 - smoothstep(1.0 - edge, 1.0 + edge, rim)) * step(0.0, facing);
  float maria = texture2D(cloudMap, face * 0.2 + vec2(0.31, 0.67)).r;
  float limb = 1.0 - 0.28 * dot(face, face);
  vec3 moonFace = moonColor * limb * (0.8 - 0.3 * smoothstep(0.45, 0.75, maria));
  colour = mix(colour, moonFace, disc);

  float density = cloudDensity(direction);
  vec3 cloud = cloudColor * (0.16 + 1.5 * exp(-angle * 7.0) + 0.6 * glowNear);
  colour = mix(colour, cloud, density);
  colour += starColor * starField(direction) * (1.0 - density)
    * smoothstep(0.06, 0.3, up) * (1.0 - glowFar);

  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
}
`

/** Blue-black dome with a veiled moon; follows the camera, never moves away. */
export const skyMaterial = new ShaderMaterial({
  uniforms: {
    cloudMap: { value: cloudMap },
    skyTime,
    zenithColor: { value: new Color(facade.skyZenith) },
    horizonColor: { value: new Color(facade.skyHorizon) },
    hazeColor: { value: new Color(facade.skyHaze) },
    moonColor: { value: new Color(facade.moon) },
    haloColor: { value: new Color(facade.moonHalo) },
    cloudColor: { value: new Color(facade.cloud) },
    starColor: { value: new Color(facade.star) },
    moonDirection: { value: moonDirection },
    moonRight: { value: moonRight },
    moonUp: { value: moonUp },
    moonRadius: { value: moon.radius },
  },
  vertexShader: skyVertex,
  fragmentShader: skyFragment,
  side: BackSide,
  depthWrite: false,
  toneMapped: false,
})

export const skyGeometry = new SphereGeometry(skyRadius, 48, 24)
