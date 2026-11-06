import { meteredBox } from "@/museum/_lib/metered-box"
import { mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import { partition, type DoorSpot } from "@/museum/gallery/_lib/manor-plan"
import type { DoorLeaf } from "@/museum/gallery/doors/_lib/door-leaves"
import {
  baseProfile,
  chairRailProfile,
  fieldProfile,
} from "@/museum/gallery/mouldings/_lib/moulding-profiles"
import {
  sweepAlongWalls,
  type ProfilePoint,
} from "@/museum/gallery/mouldings/_lib/wall-sweep"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import {
  AdditiveBlending,
  Color,
  PlaneGeometry,
  ShaderMaterial,
  type BufferGeometry,
} from "three"

// A jib door: a slab of each room's wall, with the dado's skirting, field
// and chair rail running across it, so it reads as wall until it swings.

export type HiddenLeaf = {
  // The face toward the room you come from, and the one behind.
  front: BufferGeometry
  back: BufferGeometry
  carved: BufferGeometry
  field: BufferGeometry
}

function sweepAcross(
  leaf: DoorLeaf,
  profile: readonly ProfilePoint[],
  faceZ: number,
  direction: 1 | -1
) {
  const from = direction === 1 ? 0 : leaf.width
  const to = direction === 1 ? leaf.width : 0
  return sweepAlongWalls(
    {
      isClosed: false,
      points: [
        [from, faceZ],
        [to, faceZ],
      ],
    },
    profile
  ).translate(0, -leaf.hinge[1], 0)
}

export function hiddenLeafGeometry(leaf: DoorLeaf): HiddenLeaf {
  const half = leaf.depth / 2
  const slab = (z: number) =>
    meteredBox([leaf.width, leaf.height, half])
      .clone()
      .translate(leaf.width / 2, leaf.height / 2, z)
  const faces = [
    [leaf.depth, 1],
    [0, -1],
  ] as const
  return {
    front: slab(half * 1.5),
    back: slab(half * 0.5),
    carved: mergeParts(
      faces.flatMap(([z, direction]) => [
        sweepAcross(leaf, baseProfile, z, direction),
        sweepAcross(leaf, chairRailProfile, z, direction),
      ])
    ),
    field: mergeParts(
      faces.map(([z, direction]) =>
        sweepAcross(leaf, fieldProfile, z, direction)
      )
    ),
  }
}

// Just over a carpet's pile.
const floorGlowY = 0.022

// Light from the room behind showing round a shut door: a hairline down
// both sides and over the top, and a pool on the floor under it. In the
// door's frame; uv.x runs across each line, 0.5 on the gap itself.
export function seamGeometry(door: DoorSpot): BufferGeometry {
  const half = door.width / 2
  const z = partition + 0.003
  const line = 0.16
  const sides = [-1, 1].map((side) =>
    new PlaneGeometry(line, door.height).translate(
      side * half,
      door.height / 2,
      z
    )
  )
  const top = new PlaneGeometry(line, door.width + line)
    .rotateZ(Math.PI / 2)
    .translate(0, door.height, z)
  // Only the half of a line that lies on the floor in front of the door.
  const pool = new PlaneGeometry(0.5, door.width)
    .rotateZ(Math.PI / 2)
    .rotateX(-Math.PI / 2)
    .translate(0, floorGlowY, partition + 0.25)
  const uv = pool.getAttribute("uv")
  for (let index = 0; index < uv.count; index += 1) {
    uv.setX(index, 1 - uv.getX(index) * 0.5)
  }
  return mergeParts([...sides, top, pool])
}

const seamVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const seamFragmentShader = /* glsl */ `
uniform vec3 light;
uniform float seam;
varying vec2 vUv;

void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.0, 0.07, across);
  float spill = exp(-across * 5.0) * 0.45;
  float glow = (core + spill) * (1.0 - smoothstep(0.75, 1.0, across));
  float ends = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.94, 1.0, vUv.y));
  gl_FragColor = vec4(light * glow * ends * seam, 1.0);
}
`

export function createSeamMaterial(seam: { value: number }) {
  return new ShaderMaterial({
    vertexShader: seamVertexShader,
    fragmentShader: seamFragmentShader,
    uniforms: {
      seam,
      light: {
        value: new Color(sceneTokens.manor.candleLight)
          .lerp(new Color(sceneTokens.palette.blush), 0.35)
          .multiplyScalar(2.4),
      },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  })
}
