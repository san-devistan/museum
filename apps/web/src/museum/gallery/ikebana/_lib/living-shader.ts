import { livingHeadLimit } from "@/museum/gallery/ikebana/_lib/living-geometry"
import {
  Vector4,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from "three"

type ArrayUniform = { value: Float32Array }

// Per-head state, four floats per head, shared by every material of one
// living ikebana so a frame writes it once.
export type LivingUniforms = {
  // xyz: stem tip, w: head size.
  livingPivot: ArrayUniform
  // xyz: axis the bud folds its petals toward.
  livingAxis: ArrayUniform
  // Turn around the stem tip, as a quaternion.
  livingTurn: ArrayUniform
  // xyz: lean, w: size.
  livingPose: ArrayUniform
  // x: share of the open angle kept (1 open, near 0 a shut bud).
  livingFold: ArrayUniform
  // rgb: feeding colour, a: how much of it.
  livingTint: ArrayUniform
}

type Vec3Like = { x: number; y: number; z: number }

function packed(values: readonly Vec3Like[], extra: readonly number[] = []) {
  const array = new Float32Array(livingHeadLimit * 4)
  for (const [index, value] of values.entries()) {
    array.set([value.x, value.y, value.z, extra[index] ?? 0], index * 4)
  }
  return { value: array }
}

type HeadFrame = { pivot: Vec3Like; axis: Vec3Like; size: number }

export function createLivingUniforms(
  heads: readonly HeadFrame[]
): LivingUniforms {
  const turn = new Float32Array(livingHeadLimit * 4)
  const pose = new Float32Array(livingHeadLimit * 4)
  const fold = new Float32Array(livingHeadLimit * 4)
  for (let index = 0; index < livingHeadLimit; index += 1) {
    turn[index * 4 + 3] = 1
    pose[index * 4 + 3] = 1
    fold[index * 4] = 1
  }
  return {
    livingPivot: packed(
      heads.map((head) => head.pivot),
      heads.map((head) => head.size)
    ),
    livingAxis: packed(heads.map((head) => head.axis)),
    livingTurn: { value: turn },
    livingPose: { value: pose },
    livingFold: { value: fold },
    livingTint: { value: new Float32Array(livingHeadLimit * 4) },
  }
}

const vertexHeader = /* glsl */ `
#define LIVING_HEADS ${livingHeadLimit}
attribute vec2 living;
uniform vec4 livingPivot[LIVING_HEADS];
uniform vec4 livingAxis[LIVING_HEADS];
uniform vec4 livingTurn[LIVING_HEADS];
uniform vec4 livingPose[LIVING_HEADS];
uniform vec4 livingFold[LIVING_HEADS];
uniform vec4 livingTint[LIVING_HEADS];
uniform vec4 livingAccent;
varying vec4 vLivingTint;

mat3 livingQuaternion(vec4 q) {
  vec3 q2 = q.xyz + q.xyz;
  float xx = q.x * q2.x;
  float yy = q.y * q2.y;
  float zz = q.z * q2.z;
  float xy = q.x * q2.y;
  float xz = q.x * q2.z;
  float yz = q.y * q2.z;
  float wx = q.w * q2.x;
  float wy = q.w * q2.y;
  float wz = q.w * q2.z;
  return mat3(
    1.0 - (yy + zz), xy + wz, xz - wy,
    xy - wz, 1.0 - (xx + zz), yz + wx,
    xz + wy, yz - wx, 1.0 - (xx + yy)
  );
}

mat3 livingSpin(vec3 u, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  float t = 1.0 - c;
  return mat3(
    t * u.x * u.x + c, t * u.x * u.y + s * u.z, t * u.x * u.z - s * u.y,
    t * u.x * u.y - s * u.z, t * u.y * u.y + c, t * u.y * u.z + s * u.x,
    t * u.x * u.z + s * u.y, t * u.y * u.z - s * u.x, t * u.z * u.z + c
  );
}

// Where this vertex (or floret) goes: the bud folds each point toward the
// head's axis around the stem tip, then the head shrinks, turns and leans.
// Stems only follow the lean, more toward the tip.
mat4 livingTransform(vec3 point) {
  vLivingTint = vec4(0.0);
  if (living.x < -0.5) {
    return mat4(1.0);
  }
  int head = int(living.x + 0.5);
  vec4 pose = livingPose[head];
  if (living.y > -0.5) {
    mat4 bend = mat4(1.0);
    bend[3].xyz = pose.xyz * living.y;
    return bend;
  }
  vec4 tint = livingTint[head];
  vLivingTint = vec4(mix(tint.rgb, livingAccent.rgb, livingAccent.a), tint.a);
  vec3 pivot = livingPivot[head].xyz;
  vec3 axis = livingAxis[head].xyz;
  vec3 offset = point - pivot;
  float along = dot(offset, axis);
  vec3 radial = offset - axis * along;
  float spread = length(radial);
  mat3 fold = mat3(1.0);
  if (spread > 0.00001) {
    // Closing, the tips curl in further than the base: an egg, not a brush.
    float keep = livingFold[head].x;
    float closed = clamp(1.0 - keep, 0.0, 1.0);
    float tip = smoothstep(0.0, livingPivot[head].w, length(offset));
    keep *= 1.0 - closed * 0.6 * tip;
    float angle = atan(spread, along);
    fold = livingSpin(cross(axis, radial) / spread, angle * (keep - 1.0));
  }
  mat3 linear = livingQuaternion(livingTurn[head]) * fold * pose.w;
  vec3 moved = pivot + pose.xyz - linear * pivot;
  return mat4(
    vec4(linear[0], 0.0),
    vec4(linear[1], 0.0),
    vec4(linear[2], 0.0),
    vec4(moved, 1.0)
  );
}
`

// Instanced florets move whole, from their centre; merged parts per vertex.
const vertexSetup = /* glsl */ `
#ifdef USE_INSTANCING
  mat4 livingInstance = livingTransform(instanceMatrix[3].xyz) * instanceMatrix;
  #define instanceMatrix livingInstance
  mat4 livingMatrix = mat4(1.0);
#else
  mat4 livingMatrix = livingTransform(position);
#endif
#include <beginnormal_vertex>
objectNormal = mat3(livingMatrix) * objectNormal;
`

const fragmentHeader = /* glsl */ `
varying vec4 vLivingTint;
`

// The feeding colours glow a little, so they stay candy-bright in the dark.
const livingGlow = "0.22"

function injectLiving(uniforms: LivingUniforms, accent: Vector4) {
  return (parameters: WebGLProgramParametersWithUniforms) => {
    Object.assign(parameters.uniforms, uniforms, {
      livingAccent: { value: accent },
    })
    parameters.vertexShader = parameters.vertexShader
      .replace("#include <common>", `#include <common>\n${vertexHeader}`)
      .replace("#include <beginnormal_vertex>", vertexSetup)
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed = (livingMatrix * vec4(transformed, 1.0)).xyz;"
      )
    parameters.fragmentShader = parameters.fragmentShader
      .replace("#include <common>", `#include <common>\n${fragmentHeader}`)
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vLivingTint.rgb, vLivingTint.a);"
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vLivingTint.rgb * (vLivingTint.a * ${livingGlow});`
      )
  }
}

type LivingMaterialOptions = {
  uniforms: LivingUniforms
  // Colour this part takes instead of its head's feeding colour (a: how much).
  accent?: Vector4
}

// A copy of a still material whose heads the living ikebana drives.
export function livingMaterial<T extends Material>(
  source: T,
  { uniforms, accent = new Vector4(0, 0, 0, 0) }: LivingMaterialOptions
): T {
  const material = source.clone()
  material.onBeforeCompile = injectLiving(uniforms, accent)
  material.customProgramCacheKey = () => "living-ikebana"
  return material
}
