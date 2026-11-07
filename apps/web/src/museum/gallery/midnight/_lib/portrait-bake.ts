import type { Mirror } from "@/museum/gallery/midnight/_lib/mirror"
import { mirrorMistChunk } from "@/museum/gallery/midnight/_lib/mirror-mist"
import { portraitPhotoMaxLength } from "@/museum/story/_lib/story-store"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  MathUtils,
  Mesh,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type WebGLRenderer,
} from "three"

// The kept visitor's portrait: the mirror frozen as it last saw the room, its
// lace mist and all, with a pale veiled shape where the visitor stood (the
// mirror never showed them until now), printed like an old photograph. It is
// rendered once, from the reflection already drawn, and read back into a
// small canvas the story can keep.

// The mirror's shape, small enough to keep as a JPEG.
export const portraitPrint = { width: 384, height: 528 }

// Where the visitor's eye shows on the glass, in metres from its centre, and
// how high it is above the floor. A mirror shows a body at half its size,
// its eye straight in front of it, wherever the visitor stands.
export type VisitorImage = { x: number; y: number; eyeHeight: number }

// Seen from the side, a mirror wouldn't show the visitor at all. The house's
// print always does: no further from the middle than this share of its width.
const visitorSpan = 0.1
// A long exposure in the dark: the print shows more of the room than the
// mirror did.
const exposure = 3.6

const ghost = new Color(sceneTokens.palette.white)
  .lerp(new Color(sceneTokens.palette.blush), 0.3)
  .multiplyScalar(0.85)

const vertexShader = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec2 vPlane;

void main() {
  vUv = textureMatrix * vec4(position, 1.0);
  vPlane = uv;
  // The glass fills the print, whatever the camera.
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform sampler2D foxing;
uniform float silverLuma;
uniform float hold;
uniform float manorTime;
uniform vec2 planeSize;
uniform vec3 visitor;
uniform float exposure;
varying vec4 vUv;
varying vec2 vPlane;

${mirrorMistChunk}

const vec3 ghostColor = vec3(${ghost.r.toFixed(4)}, ${ghost.g.toFixed(4)}, ${ghost.b.toFixed(4)});

// The visitor under a long veil, in their own metres from the eye (y up): a
// round head, the shoulders, then the tulle widening down to the floor.
float veiledVisitor(vec2 plane) {
  vec2 p = ((plane - 0.5) * planeSize - visitor.xy) * 2.0;
  float crown = 0.16;
  float height = crown + visitor.z;
  float t = crown - p.y;
  float head = clamp(t / 0.2, 0.0, 1.0);
  float width = 0.12 * sqrt(head * (2.0 - head))
    + 0.11 * smoothstep(0.3, 0.46, t)
    + 0.17 * smoothstep(0.46, height, t);
  float share = clamp(t / height, 0.0, 1.0);
  float soft = 0.02 + 0.05 * share;
  float side = 1.0 - smoothstep(width - soft, width + soft, abs(p.x));
  float within = step(0.0, t) * (1.0 - smoothstep(height - 0.35, height, t));
  float folds = 0.84 + 0.16 * sin(p.x * 30.0 + t * 4.0);
  return side * within * folds * mix(0.8, 0.35, share);
}

// three's ACES filmic curve, as the mirror was shown on screen.
vec3 acesFilmic(vec3 linear) {
  const mat3 inputMatrix = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777)
  );
  const mat3 outputMatrix = mat3(
    vec3(1.60475, -0.10208, -0.00327),
    vec3(-0.53108, 1.10813, -0.07276),
    vec3(-0.07367, -0.00605, 1.07602)
  );
  vec3 v = inputMatrix * (linear / 0.6);
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return clamp(outputMatrix * (a / b), 0.0, 1.0);
}

void main() {
  vec3 room = texture2DProj(tDiffuse, vUv).rgb;
  vec3 aged = texture2D(foxing, vPlane).rgb;
  float silver = clamp(dot(aged, vec3(0.3333)) / silverLuma, 0.0, 1.15);
  vec3 seen = room * color * silver * exposure;
  seen = mix(seen, ghostColor, veiledVisitor(vPlane));
  seen = mistOver(seen, vPlane, hold, manorTime);
  vec3 print = acesFilmic(seen);
  // An old print: toned silver, soft blacks, a little grain.
  float luma = dot(print, vec3(0.2126, 0.7152, 0.0722));
  print = mix(print, luma * vec3(1.08, 0.97, 0.9), 0.6);
  print = mix(vec3(0.03, 0.022, 0.026), vec3(0.97, 0.94, 0.91), print);
  print += (mistHash(vPlane * 613.0) - 0.5) * 0.04;
  gl_FragColor = vec4(clamp(print, 0.0, 1.0), 1.0);
}
`

// WebGL reads the bottom row first.
function printCanvas(pixels: Uint8Array, width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) {
    return null
  }
  const image = context.createImageData(width, height)
  const row = width * 4
  for (let y = 0; y < height; y += 1) {
    const from = (height - 1 - y) * row
    image.data.set(pixels.subarray(from, from + row), y * row)
  }
  context.putImageData(image, 0, 0)
  return canvas
}

// Prints the mirror once. Call it while the reflection is still showing:
// it reuses the last one drawn.
export function bakePortrait(
  renderer: WebGLRenderer,
  camera: Camera,
  mirror: Mirror,
  visitor: VisitorImage
) {
  const { width, height } = portraitPrint
  const { parameters } = mirror.geometry
  const span = parameters.width * visitorSpan
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      // The reflector's own uniforms: the last reflection and its mist.
      ...mirror.surface.uniforms,
      planeSize: { value: new Vector2(parameters.width, parameters.height) },
      visitor: {
        value: new Vector3(
          MathUtils.clamp(visitor.x, -span, span),
          visitor.y,
          visitor.eyeHeight
        ),
      },
      exposure: { value: exposure },
    },
    depthTest: false,
    depthWrite: false,
  })
  const quad = new Mesh(mirror.geometry, material)
  quad.frustumCulled = false
  const scene = new Scene()
  scene.add(quad)
  // Stored as sRGB, so the bytes read back are the print as it shows.
  const target = new WebGLRenderTarget(width, height, {
    type: UnsignedByteType,
    colorSpace: SRGBColorSpace,
    depthBuffer: false,
  })
  const pixels = new Uint8Array(width * height * 4)
  const previous = renderer.getRenderTarget()
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels)
  renderer.setRenderTarget(previous)
  target.dispose()
  material.dispose()
  return printCanvas(pixels, width, height)
}

// The print as the story keeps it, or null if it would not fit.
export function keptPhoto(print: HTMLCanvasElement) {
  for (const quality of [0.82, 0.66, 0.5]) {
    const photo = print.toDataURL("image/jpeg", quality)
    if (photo.length <= portraitPhotoMaxLength) {
      return photo
    }
  }
  return null
}
