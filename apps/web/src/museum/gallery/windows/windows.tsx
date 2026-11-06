import { surfaceMaterial } from "@/museum/_lib/surface-materials"
import { ironMaterial } from "@/museum/gallery/chandelier/_lib/chandelier-assets"
import {
  buildBowGeometry,
  buildCurtainGeometry,
} from "@/museum/gallery/windows/_lib/curtain-geometry"
import { buildWindowGeometry } from "@/museum/gallery/windows/_lib/window-geometry"
import type { ManorWindowSpec } from "@/museum/gallery/windows/_lib/window-layout"
import { windowMaterials } from "@/museum/gallery/windows/_lib/window-materials"
import { rainTexture } from "@/museum/gallery/windows/_lib/window-textures"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo } from "react"

type WindowsProps = {
  windows: readonly ManorWindowSpec[]
  isStill: boolean
}

const rainSpeed = 0.32

// Tall arched casements set into the walls: night sky behind leaded glass,
// rain running down it, sheer lace curtains tied back with satin bows.
export function ManorWindows({ windows, isStill }: WindowsProps) {
  const parts = useMemo(
    () => ({
      ...buildWindowGeometry(windows),
      curtains: buildCurtainGeometry(windows),
      bows: buildBowGeometry(windows),
    }),
    [windows]
  )
  const materials = windowMaterials()

  useEffect(
    () => () => {
      for (const part of Object.values(parts)) {
        part.dispose()
      }
    },
    [parts]
  )

  useFrame((_, delta) => {
    if (isStill) {
      return
    }
    const rain = rainTexture()
    rain.offset.y = (rain.offset.y + Math.min(delta, 0.1) * rainSpeed) % 1
  })

  return (
    <group>
      <mesh geometry={parts.wood} material={surfaceMaterial("wood")} />
      <mesh geometry={parts.iron} material={ironMaterial} />
      <mesh geometry={parts.moonlitGlass} material={materials.moonlitGlass} />
      <mesh geometry={parts.shadedGlass} material={materials.shadedGlass} />
      <mesh geometry={parts.rain} material={materials.rain} renderOrder={1} />
      <mesh geometry={parts.bows} material={materials.satin} />
      <mesh
        geometry={parts.curtains}
        material={materials.curtain}
        renderOrder={2}
      />
    </group>
  )
}
