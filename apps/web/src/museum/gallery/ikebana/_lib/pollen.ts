import { createRandom } from "@/museum/gallery/ikebana/_lib/ikebana-random"
import { feedingColors } from "@/museum/gallery/ikebana/_lib/living-tuning"
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  ShaderMaterial,
  Sphere,
  Vector3,
} from "three"

// Pollen motes drifting up around a feeding ikebana, moved on the GPU.

const moteCount = 44

const vertexShader = /* glsl */ `
uniform float time;
uniform float strength;
uniform float pointScale;
attribute vec4 drift;
varying float vAlpha;

void main() {
  float life = fract(time * drift.y + drift.x);
  float swirl = time * 0.55 + drift.x * 6.2831;
  vec3 point = position;
  point.y += life * 0.3;
  point.x += sin(swirl) * drift.z;
  point.z += cos(swirl * 1.3) * drift.z;
  vec4 view = modelViewMatrix * vec4(point, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = drift.w * pointScale / max(0.05, -view.z);
  vAlpha = strength * smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.7, 1.0, life));
}
`

const fragmentShader = /* glsl */ `
uniform vec3 color;
varying float vAlpha;

void main() {
  float reach = length(gl_PointCoord - 0.5);
  float soft = 1.0 - smoothstep(0.12, 0.5, reach);
  gl_FragColor = vec4(color, vAlpha * soft);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

function createPollenGeometry(seed: number) {
  const random = createRandom(seed)
  const positions: number[] = []
  const drift: number[] = []
  for (let index = 0; index < moteCount; index += 1) {
    const angle = random.range(0, Math.PI * 2)
    const reach = random.range(0.04, 0.34)
    positions.push(
      Math.sin(angle) * reach,
      random.range(0.3, 0.95),
      Math.cos(angle) * reach
    )
    drift.push(
      random.next(),
      random.range(0.05, 0.11),
      random.range(0.02, 0.06),
      random.range(0.004, 0.009)
    )
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("drift", new Float32BufferAttribute(drift, 4))
  geometry.boundingSphere = new Sphere(new Vector3(0, 0.75, 0), 0.7)
  return geometry
}

export type Pollen = {
  geometry: BufferGeometry
  material: ShaderMaterial
  uniforms: {
    time: { value: number }
    strength: { value: number }
    pointScale: { value: number }
    color: { value: Color }
  }
  dispose: () => void
}

export function createPollen(seed: number): Pollen {
  const uniforms = {
    time: { value: 0 },
    strength: { value: 0 },
    pointScale: { value: 600 },
    color: { value: new Color(feedingColors.pollen) },
  }
  const geometry = createPollenGeometry(seed)
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  return {
    geometry,
    material,
    uniforms,
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}
