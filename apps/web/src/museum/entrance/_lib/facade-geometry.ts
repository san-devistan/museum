import {
  extrude,
  fitUvs,
  mergeParts,
  slab,
} from "@/museum/entrance/_lib/geometry-parts"
import {
  archCurve,
  archedOpening,
  archRingShape,
  polygonPath,
  polygonShape,
  reversed,
  shift,
  type Point2,
} from "@/museum/entrance/_lib/manor-arches"
import {
  facadeSkin,
  facadeZ,
  fanlight,
  manorWindow,
  manorWindows,
  plinth,
  portal,
  portalTop,
} from "@/museum/entrance/_lib/manor-layout"
import type { LancetSpec } from "@/museum/entrance/_lib/manor-upper-layout"
import {
  PlaneGeometry,
  ShapeGeometry,
  TorusGeometry,
  type BufferGeometry,
} from "three"

const z0 = facadeZ

export function windowOpening(
  centerX: number,
  spec: LancetSpec = manorWindow
): Point2[] {
  return archedOpening({
    center: [centerX, spec.springY],
    arch: spec.arch,
    halfSpan: spec.halfSpan,
    sill: spec.sill,
  })
}

/** The stone skin over the gallery's front wall, notched for the door. */
function buildSkin() {
  const { minX, maxX, minY, maxY } = facadeSkin
  const shape = polygonShape([
    [minX, minY],
    [-portal.doorHalf, minY],
    [-portal.doorHalf, portal.springY],
    [portal.doorHalf, portal.springY],
    [portal.doorHalf, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ])
  for (const window of manorWindows) {
    shape.holes.push(polygonPath(windowOpening(window.centerX)))
  }
  return new ShapeGeometry(shape, 1).translate(0, 0, facadeSkin.z)
}

function mirrored(build: (side: 1 | -1) => BufferGeometry[]) {
  return [...build(-1), ...build(1)]
}

/** Projecting base course along the foot of the wall, either side. */
function plinthRun(side: 1 | -1) {
  const edge = side > 0 ? facadeSkin.maxX : facadeSkin.minX
  const [from, to] = between(side * portal.labelHalf, edge)
  return [
    slab([from, -0.05, z0], [to, plinth.top, z0 + plinth.depth]),
    slab([from, plinth.top, z0], [to, plinth.capTop, z0 + plinth.capDepth]),
  ]
}

function between(a: number, b: number) {
  return [Math.min(a, b), Math.max(a, b)] as const
}

function portalSide(side: 1 | -1) {
  const [ringMin, ringMax] = between(
    side * portal.doorHalf,
    side * portal.ringHalf
  )
  const [frameMin, frameMax] = between(
    side * portal.ringHalf,
    side * portal.frameHalf
  )
  const [baseMin, baseMax] = between(
    side * portal.doorHalf,
    side * portal.labelHalf
  )
  const extrados = shift(portal.arch(portal.ringHalf), [0, portal.springY])
  const spandrel = polygonShape([
    [side * portal.ringHalf, portal.labelBottom],
    ...reversed(extrados).map(([x, y]) => [side * -x, y] as const),
  ])
  return [
    slab([ringMin, 0, z0], [ringMax, portal.springY, z0 + portal.ringDepth]),
    slab(
      [frameMin, 0, z0],
      [frameMax, portal.labelBottom, z0 + portal.frameDepth]
    ),
    slab([baseMin, -0.05, z0], [baseMax, portal.plinthHeight, z0 + 0.2]),
    extrude(spandrel, { z: z0, depth: portal.spandrelDepth }),
    new TorusGeometry(0.036, 0.008, 6, 28).translate(
      side * portal.rosetteX,
      portal.rosetteY,
      z0 + portal.spandrelDepth
    ),
  ]
}

function portalStone() {
  const { labelHalf, labelBottom, labelDepth } = portal
  return [
    ...mirrored(portalSide),
    extrude(
      archRingShape({
        center: [0, portal.springY],
        arch: portal.arch,
        inner: portal.doorHalf,
        outer: portal.ringHalf,
      }),
      { z: z0, depth: portal.ringDepth, bevel: 0.006 }
    ),
    slab(
      [-portal.doorHalf, portal.springY, z0],
      [portal.doorHalf, portal.transomTop, z0 + portal.transomDepth]
    ),
    slab(
      [-labelHalf, labelBottom, z0],
      [labelHalf, portalTop, z0 + labelDepth]
    ),
    slab(
      [-labelHalf - 0.02, portalTop - 0.035, z0],
      [labelHalf + 0.02, portalTop + 0.008, z0 + labelDepth + 0.02]
    ),
    slab(
      [-portal.doorHalf, -0.05, z0],
      [portal.doorHalf, 0.012, z0 + portal.sillDepth]
    ),
  ]
}

/** A lancet's stone surround: sill block, jambs, ring and hood mould. */
export function windowStone(centerX: number, spec: LancetSpec = manorWindow) {
  const { springY, sill, sillBlock, ringDepth, hoodDepth } = spec
  const ring = (inner: number, outer: number, depth: number) =>
    extrude(
      archRingShape({
        center: [centerX, springY],
        arch: spec.arch,
        inner,
        outer,
      }),
      { z: z0, depth, bevel: 0.005 }
    )
  return [
    slab(
      [centerX - sillBlock.halfWidth, sill - sillBlock.height, z0],
      [centerX + sillBlock.halfWidth, sill, z0 + sillBlock.depth]
    ),
    ...[-1, 1].flatMap((side) => {
      const jamb = between(
        centerX + side * spec.halfSpan,
        centerX + side * spec.ringHalf
      )
      const stop = between(
        centerX + side * (spec.hoodInner - 0.03),
        centerX + side * (spec.hoodOuter + 0.03)
      )
      return [
        slab([jamb[0], sill, z0], [jamb[1], springY, z0 + ringDepth]),
        slab(
          [stop[0], springY - 0.1, z0],
          [stop[1], springY + 0.01, z0 + hoodDepth]
        ),
      ]
    }),
    ring(spec.halfSpan, spec.ringHalf, ringDepth),
    ring(spec.hoodInner, spec.hoodOuter, hoodDepth),
  ]
}

function buildStonework() {
  return mergeParts([
    ...portalStone(),
    ...manorWindows.flatMap((window) => windowStone(window.centerX)),
  ])
}

function buildFanlight() {
  const curve = shift(archCurve(portal.arch(portal.doorHalf)), [
    0,
    portal.springY,
  ])
  const geometry = new ShapeGeometry(polygonShape(curve), 1)
  return fitUvs(geometry, {
    minX: -portal.doorHalf,
    maxX: portal.doorHalf,
    minY: fanlight.bottom,
    maxY: fanlight.top,
  }).translate(0, 0, fanlight.z)
}

export function curtainBounds(centerX: number) {
  const { curtain } = manorWindow
  return {
    minX: centerX - curtain.halfWidth,
    maxX: centerX + curtain.halfWidth,
    minY: curtain.bottom,
    maxY: curtain.top,
  }
}

function buildCurtains() {
  const { curtain, layers } = manorWindow
  return mergeParts(
    manorWindows.map((window) =>
      new PlaneGeometry(
        curtain.halfWidth * 2,
        curtain.top - curtain.bottom,
        8,
        18
      ).translate(
        window.centerX,
        (curtain.top + curtain.bottom) / 2,
        layers.curtain
      )
    )
  )
}

function buildWindowGlass() {
  return mergeParts(
    manorWindows.map((window) =>
      fitUvs(
        new ShapeGeometry(polygonShape(windowOpening(window.centerX)), 1),
        curtainBounds(window.centerX)
      ).translate(0, 0, manorWindow.layers.glass)
    )
  )
}

export const facadeGeometry = {
  skin: buildSkin(),
  plinth: mergeParts(mirrored(plinthRun)),
  stonework: buildStonework(),
  fanlight: buildFanlight(),
  curtains: buildCurtains(),
  windowGlass: buildWindowGlass(),
}
