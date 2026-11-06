import {
  lathe,
  mergeParts,
  ribbonStrip,
  type Profile,
} from "@/museum/gallery/props/_lib/prop-geometry"
import { propSurfaces } from "@/museum/gallery/props/_lib/prop-spots"
import { turnedLeg } from "@/museum/gallery/props/_lib/turned-wood"
import {
  BoxGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

const top = propSurfaces.perfumeConsoleTop
const slab = 0.03
const apron = { height: 0.09, width: 1.0, depth: 0.32 }
const legHeight = top - slab - apron.height

const tray = { x: 0.2, z: 0.02, height: 0.008 }

// Where the bottle stands and the scent rises from, on the console.
export const bottleSpot = new Vector3(tray.x, top + tray.height, tray.z)

// The bottle is drawn a little larger than life so it reads from the room.
const bottleScale = 1.3

// Places a part drawn at the bottle's foot onto the tray, at bottle scale.
function onTray(geometry: BufferGeometry) {
  return geometry
    .scale(bottleScale, bottleScale, bottleScale)
    .translate(bottleSpot.x, bottleSpot.y, bottleSpot.z)
}

// Top of the pearl stopper above the tray.
export const bottleHeight = 0.147 * bottleScale

export function buildConsoleWood() {
  const legs = [-1, 1].flatMap((sideX) =>
    [-1, 1].map((sideZ) =>
      turnedLeg(legHeight, 0.026).translate(sideX * 0.47, 0, sideZ * 0.13)
    )
  )
  return mergeParts([
    new RoundedBoxGeometry(1.1, slab, 0.42, 2, 0.008).translate(
      0,
      top - slab / 2,
      0
    ),
    new BoxGeometry(apron.width, apron.height, apron.depth).translate(
      0,
      legHeight + apron.height / 2,
      0
    ),
    new BoxGeometry(0.42, 0.062, 0.012).translate(
      0,
      legHeight + apron.height / 2,
      apron.depth / 2 + 0.006
    ),
    new BoxGeometry(0.95, 0.018, 0.27).translate(0, 0.15, 0),
    ...legs,
  ])
}

// A faceted crystal boule with a short neck and a lip for the stopper.
const bottleProfile: Profile = [
  [0, 0],
  [0.03, 0],
  [0.042, 0.012],
  [0.048, 0.038],
  [0.045, 0.064],
  [0.031, 0.082],
  [0.012, 0.09],
  [0.011, 0.104],
  [0.0155, 0.106],
  [0.0155, 0.112],
  [0.009, 0.114],
  [0, 0.114],
]

const liquidProfile: Profile = [
  [0, 0.005],
  [0.027, 0.005],
  [0.038, 0.015],
  [0.043, 0.038],
  [0.0435, 0.05],
  [0, 0.05],
]

function faceted(geometry: BufferGeometry) {
  const flat = geometry.toNonIndexed()
  geometry.dispose()
  flat.computeVertexNormals()
  return flat
}

export function buildBottle() {
  return onTray(faceted(lathe(bottleProfile, 10)))
}

export function buildPerfume() {
  return onTray(lathe(liquidProfile, 10))
}

// The pearl stopper and the drawer's pearl knob.
export function buildPearls() {
  return mergeParts([
    onTray(new SphereGeometry(0.019, 18, 12).translate(0, 0.128, 0)),
    new SphereGeometry(0.011, 12, 8).translate(
      0,
      legHeight + apron.height / 2,
      apron.depth / 2 + 0.018
    ),
  ])
}

// The oval silver tray under the bottle and the collar on its neck.
export function buildSilver() {
  const trayProfile: Profile = [
    [0, 0],
    [0.11, 0],
    [0.12, 0.006],
    [0.124, tray.height],
    [0.118, tray.height],
    [0, tray.height * 0.6],
  ]
  return mergeParts([
    lathe(trayProfile, 32).scale(1, 1, 0.68).translate(tray.x, top, tray.z),
    onTray(
      new TorusGeometry(0.0125, 0.0028, 6, 16)
        .rotateX(Math.PI / 2)
        .translate(0, 0.096, 0)
    ),
  ])
}

const up = new Vector3(0, 1, 0)
const out = new Vector3(0, 0, 1)
const over = new Vector3(0, 1, 1).normalize()

// A blush ribbon loose on the console, slipping over the front edge.
export function buildConsoleRibbon() {
  const y = top + 0.0035
  const points = [
    new Vector3(-0.34, y, -0.06),
    new Vector3(-0.2, y, 0.03),
    new Vector3(-0.06, y, -0.04),
    new Vector3(0.03, y, 0.1),
    new Vector3(0.08, y, 0.18),
    new Vector3(0.095, top - 0.004, 0.216),
    new Vector3(0.1, top - 0.06, 0.222),
    new Vector3(0.11, top - 0.16, 0.221),
    new Vector3(0.105, top - 0.24, 0.218),
  ]
  const normals = [up, up, up, up, up, over, out, out, out]
  return ribbonStrip({ points, normals, width: 0.032, segments: 90 })
}
