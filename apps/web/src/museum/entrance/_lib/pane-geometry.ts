import { fitUvs } from "@/museum/entrance/_lib/geometry-parts"
import { polygonShape, type Point2 } from "@/museum/entrance/_lib/manor-arches"
import type { PaneGlow } from "@/museum/entrance/_lib/manor-upper-layout"
import { BufferGeometry, Float32BufferAttribute, ShapeGeometry } from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

/** [candle across the pane, strength, flicker phase, follows the walk]. */
function glowVector(glow: PaneGlow): readonly number[] {
  if (glow.mode === "candle") {
    return [glow.candleU, glow.strength, glow.phase, 0]
  }
  if (glow.mode === "wander") {
    return [0, glow.strength, 0, 1]
  }
  return [0.5, 0, 0, 0]
}

function repeated(values: readonly number[], count: number) {
  return Array.from({ length: count }, () => values).flat()
}

/**
 * A flat window pane in its opening's outline, UVs spanning the opening,
 * tagged with how its room is lit and its size in metres for the shader.
 */
export function paneGeometry(outline: readonly Point2[], glow: PaneGlow) {
  const xs = outline.map(([x]) => x)
  const ys = outline.map(([, y]) => y)
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
  const geometry = fitUvs(new ShapeGeometry(polygonShape(outline), 1), bounds)
  const count = geometry.getAttribute("position").count
  geometry.setAttribute(
    "paneGlow",
    new Float32BufferAttribute(repeated(glowVector(glow), count), 4)
  )
  geometry.setAttribute(
    "paneSize",
    new Float32BufferAttribute(
      repeated([bounds.maxX - bounds.minX, bounds.maxY - bounds.minY], count),
      2
    )
  )
  return geometry
}

export function mergePanes(panes: readonly BufferGeometry[]) {
  return mergeGeometries([...panes]) ?? new BufferGeometry()
}
