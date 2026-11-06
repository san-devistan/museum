import type { Streak } from "@/museum/entrance/_lib/facade-weathering"
import {
  lanterns,
  manorWindow,
  manorWindows,
  portal,
} from "@/museum/entrance/_lib/manor-layout"
import type { Crack } from "@/museum/entrance/_lib/stone-painter"

const rainFromCornice: readonly Streak[] = [
  { x: -3.3, y: 4.8, width: 0.5, length: 2.1, tone: "grime" },
  { x: -2.05, y: 4.8, width: 0.35, length: 1.4, tone: "grime" },
  { x: -0.7, y: 4.8, width: 0.6, length: 1.1, tone: "grime" },
  { x: 0.55, y: 4.8, width: 0.4, length: 1.3, tone: "grime" },
  { x: 2.0, y: 4.8, width: 0.55, length: 2.4, tone: "grime" },
  { x: 3.25, y: 4.8, width: 0.4, length: 1.6, tone: "grime" },
]

const windowRuns: readonly Streak[] = manorWindows.flatMap((window) => [
  {
    x: window.centerX,
    y: manorWindow.sill - manorWindow.sillBlock.height,
    width: 0.7,
    length: 0.62,
    tone: "grime",
  },
  ...[-1, 1].map(
    (side): Streak => ({
      x: window.centerX + side * manorWindow.hoodOuter,
      y: manorWindow.springY - 0.06,
      width: 0.09,
      length: 1.25,
      tone: "grime",
    })
  ),
])

/** Rust bleeding down the stone from each lantern's wall plate. */
const lanternRuns: readonly Streak[] = lanterns.map(({ center }) => ({
  x: center[0],
  y: center[1] + 0.32,
  width: 0.07,
  length: 1.35,
  tone: "rust",
}))

const portalRuns: readonly Streak[] = [-1, 1].map((side) => ({
  x: side * (portal.labelHalf + 0.02),
  y: portal.labelBottom,
  width: 0.1,
  length: 1.7,
  tone: "grime",
}))

export const facadeStreaks: readonly Streak[] = [
  ...rainFromCornice,
  ...windowRuns,
  ...lanternRuns,
  ...portalRuns,
]

export const facadeCracks: readonly Crack[] = [
  { x: -1.3, y: 3.28, angle: 2.2, length: 0.95 },
  { x: 1.27, y: 2.2, angle: -0.3, length: 0.35 },
  { x: 2.08, y: 0.9, angle: -1.9, length: 0.55 },
  { x: -3.12, y: 3.05, angle: 2.4, length: 0.7 },
  { x: 2.2, y: 4.1, angle: -2.5, length: 0.85 },
  { x: -0.45, y: 4.35, angle: -1.2, length: 0.6 },
]
