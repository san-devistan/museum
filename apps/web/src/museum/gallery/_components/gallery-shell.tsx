import { meteredBox } from "@/museum/_lib/metered-box"
import {
  surfaceMaterial as texturedMaterial,
  type Surface,
} from "@/museum/_lib/surface-materials"
import {
  facadeMaterials,
  surfaceMaterial,
  unitBox,
} from "@/museum/gallery/_lib/gallery-assets"
import type { GallerySolid } from "@/museum/gallery/_lib/gallery-layout"

type GalleryShellProps = {
  solids: readonly GallerySolid[]
  texturedSurfaces: ReadonlySet<Surface>
}

type SolidProps = {
  solid: GallerySolid
  texturedSurfaces: ReadonlySet<Surface>
}

function solidMaterial(
  solid: GallerySolid,
  texturedSurfaces: ReadonlySet<Surface>
) {
  const material =
    solid.surface && texturedSurfaces.has(solid.surface)
      ? texturedMaterial(solid.surface)
      : surfaceMaterial(solid.color)
  return solid.facadeFace
    ? facadeMaterials(material, solid.facadeFace)
    : material
}

function TexturedSolid({ solid, texturedSurfaces }: SolidProps) {
  return (
    <mesh
      geometry={meteredBox(solid.size)}
      material={solidMaterial(solid, texturedSurfaces)}
      position={solid.center}
    />
  )
}

function PlainSolid({ solid, texturedSurfaces }: SolidProps) {
  return (
    <mesh
      geometry={unitBox}
      material={solidMaterial(solid, texturedSurfaces)}
      position={solid.center}
      scale={solid.size}
    />
  )
}

// One room's boxes: plain colours until their surface's textures are made.
export function GalleryShell({ solids, texturedSurfaces }: GalleryShellProps) {
  return solids.map((solid) =>
    solid.surface ? (
      <TexturedSolid
        key={solid.id}
        solid={solid}
        texturedSurfaces={texturedSurfaces}
      />
    ) : (
      <PlainSolid
        key={solid.id}
        solid={solid}
        texturedSurfaces={texturedSurfaces}
      />
    )
  )
}
