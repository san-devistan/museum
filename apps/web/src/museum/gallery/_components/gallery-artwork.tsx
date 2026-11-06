import type { ArtworkSpec } from "@/museum/gallery/_lib/gallery-artworks"
import { photoMaterial } from "@/museum/gallery/_lib/gallery-assets"
import { ArtworkVeil } from "@/museum/gallery/artwork/_components/artwork-veil"
import { PictureLight } from "@/museum/gallery/artwork/_components/picture-light"
import { artworkFrame } from "@/museum/gallery/artwork/_lib/artwork-frame"
import { laceFrameGeometry } from "@/museum/gallery/artwork/_lib/lace-frame"
import { laceFrameMaterials } from "@/museum/gallery/artwork/_lib/lace-frame-materials"
import { stretchedCanvas } from "@/museum/gallery/artwork/_lib/stretched-canvas"
import { paintingLabelOffset } from "@/museum/gallery/label/_lib/label-placement"
import { WallLabel } from "@/museum/gallery/label/wall-label"

type GalleryArtworkProps = {
  artwork: ArtworkSpec
  isStill: boolean
}

export function GalleryArtwork({ artwork, isStill }: GalleryArtworkProps) {
  const { lace, canvas, canvasZ } = artworkFrame(artwork)
  const label = paintingLabelOffset(artwork)

  return (
    <group position={artwork.position} rotation={artwork.rotation}>
      <mesh
        geometry={stretchedCanvas(canvas.width, canvas.height)}
        material={photoMaterial(artwork)}
        position-z={canvasZ}
      />
      <mesh
        geometry={laceFrameGeometry(lace)}
        material={laceFrameMaterials({
          id: artwork.id,
          seed: artwork.seed,
          width: lace.width,
          height: lace.height,
        })}
      />
      <ArtworkVeil artwork={artwork} isStill={isStill} />
      <PictureLight
        canvasCenterY={0}
        frameHeight={lace.height}
        frameTop={lace.height / 2}
        frameWidth={lace.width}
      />
      <WallLabel
        label={artwork}
        position={label.position}
        rotation={label.rotation}
      />
    </group>
  )
}
