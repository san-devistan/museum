import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import { mirrorMistChunk } from "@/museum/gallery/midnight/_lib/mirror-mist"
import { mirrorTexture } from "@/museum/gallery/props/vanity/_lib/mirror-texture"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  Color,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  type IUniform,
} from "three"
import { Reflector } from "three/addons/objects/Reflector.js"

// The thirteenth frame's mirror: old silvering that reflects the room but not
// the visitor, who has no body. The reflection is a second render of the
// scene, so it only runs while the mirror is unveiled and in view; otherwise
// a still, foxed glass stands in for it.

// Small: the glass is foxed and dim, and this keeps the second render cheap.
const reflection = { width: 512, height: 704 }

// The vanity's foxing map, as a multiplier: its plain silver reads as 1.
const silverLuma = (() => {
  const { r, g, b } = new Color(sceneTokens.props.mirror)
  return (r + g + b) / 3
})()

const vertexShader = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec2 vPlane;

#include <common>
#include <logdepthbuf_pars_vertex>

void main() {
  vUv = textureMatrix * vec4(position, 1.0);
  vPlane = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`

const fragmentShader = /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform sampler2D foxing;
uniform float silverLuma;
uniform float hold;
uniform float manorTime;
varying vec4 vUv;
varying vec2 vPlane;

#include <logdepthbuf_pars_fragment>
${mirrorMistChunk}

void main() {
  #include <logdepthbuf_fragment>
  vec3 room = texture2DProj(tDiffuse, vUv).rgb;
  vec3 aged = texture2D(foxing, vPlane).rgb;
  float silver = clamp(dot(aged, vec3(0.3333)) / silverLuma, 0.0, 1.15);
  // The longer you stay, the more the mist closes in.
  vec3 seen = mistOver(room * color * silver, vPlane, hold, manorTime);
  gl_FragColor = vec4(seen, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export type Mirror = {
  reflector: Reflector
  // The reflector's own material: its uniforms hold the last reflection.
  surface: ShaderMaterial
  glass: MeshStandardMaterial
  geometry: PlaneGeometry
  hold: IUniform<number>
  dispose: () => void
}

export function createMirror(width: number, height: number): Mirror {
  const geometry = new PlaneGeometry(width, height)
  const foxing = mirrorTexture()
  const hold: IUniform<number> = { value: 0 }
  const reflector = new Reflector(geometry, {
    textureWidth: reflection.width,
    textureHeight: reflection.height,
    clipBias: 0.003,
    multisample: 0,
    shader: {
      name: "ThirteenthMirror",
      uniforms: {
        color: { value: null },
        tDiffuse: { value: null },
        textureMatrix: { value: null },
        foxing: { value: null },
        silverLuma: { value: silverLuma },
        hold: { value: 0 },
        manorTime: { value: 0 },
      },
      vertexShader,
      fragmentShader,
    },
    // A slightly warm, dim silver.
    color: new Color(sceneTokens.props.pearl).multiplyScalar(0.82),
  })
  const { material } = reflector
  if (!(material instanceof ShaderMaterial)) {
    throw new TypeError("The reflector's material is not a shader")
  }
  // Set after the reflector clones its shader's uniforms, so these stay shared.
  material.uniforms.foxing = { value: foxing }
  material.uniforms.hold = hold
  material.uniforms.manorTime = manorTime
  reflector.visible = false
  const glass = new MeshStandardMaterial({
    map: foxing,
    metalness: 0.6,
    roughness: 0.32,
  })
  return {
    reflector,
    surface: material,
    glass,
    geometry,
    hold,
    dispose: () => {
      reflector.dispose()
      glass.dispose()
      geometry.dispose()
    },
  }
}
