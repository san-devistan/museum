import { manorTime } from "@/museum/gallery/_lib/manor-clock"
import {
  buildVeilGeometry,
  type VeilSpec,
} from "@/museum/gallery/tulle/_lib/tulle-geometry"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import { useEffect, useMemo } from "react"
import { Color, DoubleSide, ShaderMaterial, Vector2 } from "three"

type TulleVeilsProps = {
  veils: readonly VeilSpec[]
  // Along world x, where the tulle goes from candle warm to frost.
  coolsAlongX: readonly [from: number, to: number]
}

const vertexShader = /* glsl */ `
attribute vec3 sway;
uniform float manorTime;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec3 drift = sway * (sin(manorTime * 0.55 + position.x * 1.3 + position.z * 0.9) * 0.05
    + sin(manorTime * 1.3 + position.y * 2.1) * 0.015);
  vec4 world = modelMatrix * vec4(position + drift, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 warm;
uniform vec3 cold;
uniform vec2 coolsAlongX;
uniform float opacity;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  float cool = smoothstep(coolsAlongX.x, coolsAlongX.y, vWorld.x);
  float crest = 0.5 + 0.5 * sin(vUv.x * 3.2 * 6.2831);
  float hem = 1.0 - smoothstep(0.86, 1.0, vUv.y) * 0.6;
  float weave = 0.85 + 0.15 * sin(vUv.x * 61.0 + vUv.y * 7.0);
  vec3 color = mix(warm, cold, cool) * (0.7 + 0.5 * crest);
  gl_FragColor = vec4(color, opacity * (0.55 + 0.45 * crest) * hem * weave);
  #include <colorspace_fragment>
}
`

function createTulleMaterial(coolsAlongX: readonly [number, number]) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      manorTime,
      warm: {
        value: new Color(sceneTokens.props.tulleWhite).multiplyScalar(0.3),
      },
      cold: {
        value: new Color(sceneTokens.props.tulleFrost).multiplyScalar(0.34),
      },
      coolsAlongX: { value: new Vector2(...coolsAlongX) },
      opacity: { value: 0.32 },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  })
}

// Sheer tulle: along the walls and parted across the way, drifting on the
// manor clock (still when motion is reduced), warm near the candles and
// frost blue further on.
export function TulleVeils({ veils, coolsAlongX }: TulleVeilsProps) {
  const geometry = useMemo(() => buildVeilGeometry(veils), [veils])
  // Kept by value: a new material on every render would drop its compiled
  // shader, and walking into the corridor would stall to compile it again.
  const [coolFrom, coolTo] = coolsAlongX
  const material = useMemo(
    () => createTulleMaterial([coolFrom, coolTo]),
    [coolFrom, coolTo]
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  return <mesh geometry={geometry} material={material} renderOrder={2} />
}
