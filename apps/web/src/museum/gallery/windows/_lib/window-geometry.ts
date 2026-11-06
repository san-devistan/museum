import {
  glassCrown,
  manorWindow,
  type ManorWindowSpec,
} from "@/museum/gallery/windows/_lib/window-layout"
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  Path,
  Shape,
  ShapeGeometry,
  SphereGeometry,
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

const { glassWidth, sill, springing, architrave, depth } = manorWindow
const half = glassWidth / 2

function archOutline<T extends Path>(target: T, grow: number, bottom: number) {
  const radius = half + grow
  target.moveTo(-radius, bottom)
  target.lineTo(-radius, springing)
  target.absarc(0, springing, radius, Math.PI, 0, true)
  target.lineTo(radius, bottom)
  target.lineTo(-radius, bottom)
  return target
}

function archRing(outer: number, inner: number, extrude: number) {
  const shape = archOutline(new Shape(), outer, sill - 0.04)
  shape.holes.push(archOutline(new Path(), inner, sill).clone())
  return new ExtrudeGeometry(shape, {
    depth: extrude,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 28,
  })
}

function glassGeometry(z: number) {
  const geometry = new ShapeGeometry(archOutline(new Shape(), 0, sill), 28)
  const position = geometry.getAttribute("position")
  const uv = geometry.getAttribute("uv")
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(
      index,
      (position.getX(index) + half) / glassWidth,
      (position.getY(index) - sill) / (glassCrown - sill)
    )
  }
  return geometry.translate(0, 0, z)
}

function keystone() {
  const shape = new Shape()
  shape.moveTo(-0.05, 0)
  shape.lineTo(0.05, 0)
  shape.lineTo(0.075, 0.19)
  shape.lineTo(-0.075, 0.19)
  shape.closePath()
  return new ExtrudeGeometry(shape, {
    depth: depth + 0.03,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
  }).translate(0, glassCrown - 0.04, 0)
}

function woodParts() {
  const sillWidth = glassWidth + architrave * 2 + 0.14
  return [
    archRing(architrave, 0.035, depth - 0.03),
    archRing(0.035, 0, depth),
    keystone(),
    new BoxGeometry(sillWidth, 0.05, 0.17).translate(0, sill - 0.025, 0.085),
    new BoxGeometry(sillWidth - 0.1, 0.1, 0.035).translate(
      0,
      sill - 0.1,
      0.0175
    ),
    new BoxGeometry(0.035, glassCrown - sill, 0.035).translate(
      0,
      (glassCrown + sill) / 2,
      0.02
    ),
    new BoxGeometry(glassWidth, 0.035, 0.035).translate(0, springing, 0.02),
  ]
}

function ironParts() {
  const rodLength = manorWindow.curtainReach * 2 + 0.16
  const { curtainRodY, curtainZ } = manorWindow
  return [
    new CylinderGeometry(0.011, 0.011, rodLength, 10)
      .rotateZ(Math.PI / 2)
      .translate(0, curtainRodY, curtainZ),
    ...[-1, 1].map((side) =>
      new SphereGeometry(0.028, 12, 8)
        .scale(1.3, 1, 1)
        .translate((side * rodLength) / 2, curtainRodY, curtainZ)
    ),
    ...[-1, 1].map((side) =>
      new CylinderGeometry(0.008, 0.008, curtainZ, 8)
        .rotateX(Math.PI / 2)
        .translate(side * (rodLength / 2 - 0.08), curtainRodY, curtainZ / 2)
    ),
  ]
}

function unindexed(geometry: BufferGeometry) {
  if (!geometry.index) {
    return geometry
  }
  const flat = geometry.toNonIndexed()
  geometry.dispose()
  return flat
}

export function windowMatrix(spec: ManorWindowSpec) {
  return new Matrix4()
    .makeRotationY(spec.rotationY)
    .setPosition(...spec.position)
}

function placed(
  build: () => BufferGeometry[],
  windows: readonly ManorWindowSpec[]
) {
  const parts = windows.flatMap((spec) => {
    const matrix = windowMatrix(spec)
    return build().map((part) => unindexed(part).applyMatrix4(matrix))
  })
  if (parts.length === 0) {
    // A room whose windows are all moonlit (or all shaded) has none of
    // the other kind.
    return new BufferGeometry()
  }
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  return merged
}

export function buildWindowGeometry(windows: readonly ManorWindowSpec[]) {
  const moonlit = windows.filter((spec) => spec.isMoonlit)
  const shaded = windows.filter((spec) => !spec.isMoonlit)
  return {
    wood: placed(woodParts, windows),
    iron: placed(ironParts, windows),
    moonlitGlass: placed(() => [glassGeometry(0.004)], moonlit),
    shadedGlass: placed(() => [glassGeometry(0.004)], shaded),
    rain: placed(() => [glassGeometry(0.01)], windows),
  }
}
