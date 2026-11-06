import { entranceDoor } from "@/museum/_lib/museum-layout"
import { ribbon } from "@/museum/entrance/_lib/ribbon-layout"
import { satinTone } from "@/museum/entrance/_lib/satin-material"
import { sweepSatin, type StationFn } from "@/museum/entrance/_lib/satin-sweep"
import { CatmullRomCurve3, MathUtils, Vector3 } from "three"

// After midnight the white ribbon is untied for good: it lies loose along
// the threshold stone, right of the door's middle (the entrance button sits
// at the bottom centre), rolls over the sill's edge and trails down the
// step onto the carpet, one edge curling up.

const { lerp, smoothstep } = MathUtils

// The portal's sill (facade-geometry): its top and depth past the facade,
// and the carpet's top below it.
const sill = { top: 0.012, depth: 0.09 }
const carpetTop = -0.034

const thickness = ribbon.thickness * 0.7
const onSill = sill.top + thickness / 2 + 0.0004
const onCarpet = carpetTop + thickness / 2 + 0.0004
const front = entranceDoor.outerZ
const edge = front + sill.depth

type Rest = {
  at: readonly [x: number, y: number, z: number]
  /** Lies flat (up), rolls over the sill's edge, or hangs down its face. */
  facing: "up" | "edge" | "out"
}

const facings = {
  up: new Vector3(0, 1, 0),
  edge: new Vector3(0, 1, 1).normalize(),
  out: new Vector3(0, 0, 1),
}

const x = (offset: number) => entranceDoor.centerX + offset

const rests: readonly Rest[] = [
  { at: [x(0.34), onSill, front + 0.022], facing: "up" },
  { at: [x(0.44), onSill, front + 0.05], facing: "up" },
  { at: [x(0.55), onSill, front + 0.028], facing: "up" },
  { at: [x(0.65), onSill, front + 0.055], facing: "up" },
  { at: [x(0.71), onSill, edge - 0.012], facing: "up" },
  { at: [x(0.722), onSill - 0.002, edge + 0.0015], facing: "edge" },
  { at: [x(0.728), onSill - 0.014, edge + 0.0032], facing: "out" },
  { at: [x(0.734), onCarpet + 0.014, edge + 0.0034], facing: "out" },
  { at: [x(0.74), onCarpet + 0.002, edge + 0.016], facing: "edge" },
  { at: [x(0.745), onCarpet, edge + 0.05], facing: "up" },
  { at: [x(0.68), onCarpet, edge + 0.13], facing: "up" },
  { at: [x(0.7), onCarpet, edge + 0.21], facing: "up" },
  { at: [x(0.79), onCarpet, edge + 0.26], facing: "up" },
  { at: [x(0.86), onCarpet, edge + 0.33], facing: "up" },
]

const curve = new CatmullRomCurve3(
  rests.map(({ at }) => new Vector3(...at)),
  false,
  "centripetal"
)

const lastRest = rests.length - 1

/** The rest index where the ribbon starts and stops hanging down the step. */
const drape = { from: 4.5, to: 9 }

/** Where, on the carpet, one edge of the ribbon curls up. */
const curl = { from: 10, peak: 11, to: 12, angle: 0.55 }

function facingAt(place: number, target: Vector3) {
  const index = Math.min(Math.floor(place), lastRest - 1)
  const from = facings[rests[index]?.facing ?? "up"]
  const to = facings[rests[index + 1]?.facing ?? "up"]
  return target
    .copy(from)
    .lerp(to, place - index)
    .normalize()
}

const station: StationFn = (s, result) => {
  const place = s * lastRest
  curve.getPoint(s, result.position)
  facingAt(place, result.facing)
  const curling =
    smoothstep(place, curl.from, curl.peak) *
    (1 - smoothstep(place, curl.peak, curl.to))
  result.twist = curl.angle * curling
  result.width = ribbon.width
  // Fabric settling: soft waves that only ever lift it, and the curled
  // edge lifting the middle off the carpet.
  const wave = 0.0018 * (0.5 + 0.5 * Math.sin(s * 47))
  const lift = Math.sin(result.twist) * (ribbon.width / 2)
  result.position.y += (wave + lift) * result.facing.y
  result.cup = 0.0018
  result.pleat = 0.0008
  const draped =
    smoothstep(place, drape.from, drape.from + 1) *
    (1 - smoothstep(place, drape.to - 1, drape.to))
  result.shade = lerp(0.06, 0.32, draped)
  result.backShade = 0.4
}

export const thresholdRibbonGeometry = sweepSatin(
  [{ station, segments: 160, notch: 0.03, notchStart: 0.03 }],
  { thickness, tone: satinTone, uvWidth: ribbon.width }
)
