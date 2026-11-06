import { benchFrame } from "@/museum/gallery/_lib/room-solids"
import { ribbonStrip } from "@/museum/gallery/props/_lib/prop-geometry"
import { propMaterials } from "@/museum/gallery/props/_lib/prop-materials"
import { Vector3 } from "three"

const seatTop =
  benchFrame.legHeight + benchFrame.apronHeight + benchFrame.cushionHeight
const apronTop = benchFrame.legHeight + benchFrame.apronHeight
// Half the bench's depth (its 0.6 m apron) and of its inset cushion.
const apronFront = 0.3
const cushionFront = apronFront - benchFrame.cushionInset

const up = new Vector3(0, 1, 0)
const out = new Vector3(0, 0, 1)
const bend = new Vector3(0, 1, 1).normalize()

// Laid in loose curves along the cushion, over its front edge and the
// apron, down to a curl on the carpet.
function benchRibbon() {
  const y = seatTop + 0.006
  const route: readonly (readonly [Vector3, Vector3])[] = [
    [new Vector3(-0.86, y, -0.03), up],
    [new Vector3(-0.62, y, 0.07), up],
    [new Vector3(-0.38, y, -0.06), up],
    [new Vector3(-0.12, y, 0.05), up],
    [new Vector3(0.12, y, -0.03), up],
    [new Vector3(0.32, y, 0.09), up],
    [new Vector3(0.44, y, 0.2), up],
    [new Vector3(0.48, seatTop - 0.004, cushionFront + 0.004), bend],
    [new Vector3(0.5, seatTop - 0.04, cushionFront + 0.008), out],
    [new Vector3(0.508, apronTop + 0.012, apronFront + 0.004), bend],
    [new Vector3(0.514, apronTop - 0.03, apronFront + 0.007), out],
    [new Vector3(0.52, benchFrame.legHeight - 0.02, apronFront + 0.01), out],
    [new Vector3(0.525, 0.16, apronFront + 0.015), out],
    [new Vector3(0.53, 0.04, apronFront + 0.035), bend],
    [new Vector3(0.55, 0.005, apronFront + 0.11), up],
    [new Vector3(0.6, 0.005, apronFront + 0.17), up],
    [new Vector3(0.68, 0.005, apronFront + 0.16), up],
  ]
  return ribbonStrip({
    points: route.map(([point]) => point),
    normals: route.map(([, normal]) => normal),
    width: 0.045,
    segments: 200,
  })
}

let geometry: ReturnType<typeof benchRibbon> | null = null

function ribbonGeometry() {
  geometry ??= benchRibbon()
  return geometry
}

// Her long white satin ribbon, left across the bench. The spot is the
// bench's centre on the floor, turned with it; the ribbon falls off its
// front (+z) side.
export function BenchRibbon() {
  return <mesh geometry={ribbonGeometry()} material={propMaterials().satin} />
}
