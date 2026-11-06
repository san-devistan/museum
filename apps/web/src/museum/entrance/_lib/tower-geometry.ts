import {
  windowOpening,
  windowStone,
} from "@/museum/entrance/_lib/facade-geometry"
import { mergeParts } from "@/museum/entrance/_lib/geometry-parts"
import { facadeZ } from "@/museum/entrance/_lib/manor-layout"
import {
  stringCourse,
  tower,
  type PaneGlow,
} from "@/museum/entrance/_lib/manor-upper-layout"
import { paneGeometry } from "@/museum/entrance/_lib/pane-geometry"
import {
  CylinderGeometry,
  LatheGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from "three"

const sides = 40

/** Rescales a revolved surface's 0..1 UVs to metres for tiled materials. */
function meterUvs(geometry: BufferGeometry, width: number, height: number) {
  const uv = geometry.getAttribute("uv")
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) * width, uv.getY(index) * height)
  }
  uv.needsUpdate = true
  return geometry
}

function drum(radius: number, bottom: number, top: number, isOpen = true) {
  const height = top - bottom
  const geometry = new CylinderGeometry(
    radius,
    radius,
    height,
    sides,
    1,
    isOpen
  )
  return meterUvs(geometry, Math.PI * 2 * radius, height).translate(
    tower.x,
    bottom + height / 2,
    tower.z
  )
}

/** Turns a piece built facing +z at the facade onto the tower's face. */
function onTowerFace(geometry: BufferGeometry, outward: number) {
  const { facing, radius } = tower
  return geometry
    .rotateY(facing)
    .translate(
      tower.x + Math.sin(facing) * (radius + outward),
      0,
      tower.z + Math.cos(facing) * (radius + outward)
    )
}

function towerStone() {
  const { radius, bottom, top } = tower
  return [drum(radius, bottom, top), drum(radius + 0.07, bottom, 0.34, false)]
}

function towerLimestone() {
  const { radius, top, corbel } = tower
  const bands = tower.bands.map((bandBottom) =>
    drum(radius + 0.1, bandBottom, bandBottom + 0.24, false)
  )
  const course = drum(
    radius + 0.07,
    stringCourse.top,
    stringCourse.dripTop,
    false
  )
  const corbelRing = drum(radius + corbel.out, top, top + corbel.height, false)
  const corbelStep = drum(
    radius + corbel.out * 0.5,
    top - 0.16,
    top + 0.02,
    false
  )
  const surrounds = tower.windows.map(({ spec }) =>
    onTowerFace(mergeParts(windowStone(0, spec)).translate(0, 0, -facadeZ), 0)
  )
  return [...bands, course, corbelRing, corbelStep, ...surrounds]
}

/** A witch's hat: concave flanks rising from a small bell-cast flare. */
function coneProfile() {
  const base = tower.radius + tower.roofOut
  const steps = 14
  return Array.from({ length: steps + 1 }, (_, index) => {
    const along = index / steps
    const radius = base * (1 - along) ** 1.25 + (index === steps ? 0.015 : 0)
    return new Vector2(radius, tower.roofHeight * along)
  })
}

function towerRoof() {
  const base = tower.radius + tower.roofOut
  const slant = Math.hypot(base, tower.roofHeight)
  const lathe = new LatheGeometry(coneProfile(), sides)
  return meterUvs(lathe, Math.PI * 2 * base, slant).translate(
    tower.x,
    tower.top + tower.corbel.height,
    tower.z
  )
}

/** The lead roll round the hat's eave; its finial comes with the others. */
function towerLead() {
  const eave = tower.top + tower.corbel.height
  return [
    new TorusGeometry(tower.radius + tower.roofOut - 0.02, 0.05, 6, sides)
      .rotateX(Math.PI / 2)
      .translate(tower.x, eave + 0.02, tower.z),
  ]
}

const towerGlows: Record<"dark" | "candle", PaneGlow> = {
  dark: { mode: "dark" },
  candle: { mode: "candle", candleU: 0.55, strength: 0.5, phase: 2.9 },
}

function towerPanes() {
  return tower.windows.map(({ spec, glow }) =>
    onTowerFace(paneGeometry(windowOpening(0, spec), towerGlows[glow]), 0.02)
  )
}

/** The west corner tower, split by the material each piece is drawn with. */
export function towerParts() {
  return {
    stone: towerStone(),
    limestone: towerLimestone(),
    slate: [towerRoof()],
    lead: towerLead(),
    panes: towerPanes(),
  }
}
