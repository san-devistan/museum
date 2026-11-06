import { surfaceMaterial } from "@/museum/_lib/surface-materials"
import { GalleryArtwork } from "@/museum/gallery/_components/gallery-artwork"
import { ManorIkebana } from "@/museum/gallery/_components/plinth-ikebana"
import { artworks } from "@/museum/gallery/_lib/gallery-artworks"
import { benchSpecs } from "@/museum/gallery/_lib/gallery-layout"
import {
  moonDirection,
  type RoomDressing,
} from "@/museum/gallery/_lib/manor-dressing"
import {
  chandelierSpots,
  ikebanaSpots,
  manorPropSpots,
  type RoomId,
} from "@/museum/gallery/_lib/manor-plan"
import { BenchDetails } from "@/museum/gallery/bench/bench-details"
import { Candles } from "@/museum/gallery/candles/candles"
import { CarpetPile } from "@/museum/gallery/carpet/carpet"
import { Chandelier } from "@/museum/gallery/chandelier/chandelier"
import { Cobwebs } from "@/museum/gallery/cobwebs/cobwebs"
import { WallDecay } from "@/museum/gallery/decay/wall-decay"
import { FloorFog } from "@/museum/gallery/fog/floor-fog"
import { Moonlight } from "@/museum/gallery/moonlight/moonlight"
import { Mouldings } from "@/museum/gallery/mouldings/mouldings"
import { ManorProps } from "@/museum/gallery/props/manor-props"
import { Remnants } from "@/museum/gallery/remnants/remnants"
import { MadameSilhouette } from "@/museum/gallery/silhouette/madame-silhouette"
import { DedansFrost } from "@/museum/gallery/transformations/dedans-frost"
import { EnvolFeathers } from "@/museum/gallery/transformations/envol-feathers"
import { TulleVeils } from "@/museum/gallery/tulle/tulle-veils"
import { ManorWindows } from "@/museum/gallery/windows/windows"
import type { ReactNode } from "react"

// One thing a room shows, mounted on its own frame after the shell so a
// room fills in without a long stall.
export type RoomPiece = {
  id: string
  render: (isStill: boolean) => ReactNode
}

function exhibitPieces({ room }: RoomDressing): RoomPiece[] {
  const props = manorPropSpots.filter((spot) => spot.room === room.id)
  return [
    ...artworks
      .filter((artwork) => artwork.room === room.id)
      .map((artwork) => ({
        id: artwork.id,
        render: (isStill: boolean) => (
          <GalleryArtwork artwork={artwork} isStill={isStill} />
        ),
      })),
    ...ikebanaSpots
      .filter((spot) => spot.room === room.id)
      .map((spot) => ({
        id: `ikebana-${spot.role}`,
        render: () => <ManorIkebana spot={spot} />,
      })),
    ...(props.length > 0
      ? [{ id: "props", render: () => <ManorProps spots={props} /> }]
      : []),
  ]
}

function fixturePieces(dressing: RoomDressing): RoomPiece[] {
  const { room, carpet } = dressing
  const benches = benchSpecs.filter((bench) => bench.room === room.id)
  return [
    {
      id: "mouldings",
      render: () => (
        <>
          <Mouldings
            bounds={room.bounds}
            doorways={dressing.doorways}
            hasUpperMouldings={room.look.ceilingSteps.length === 0}
            roses={dressing.roses}
          />
          {benches.length > 0 ? <BenchDetails benches={benches} /> : null}
        </>
      ),
    },
    ...(carpet
      ? [
          {
            id: "carpet",
            render: () => (
              <CarpetPile
                patch={carpet}
                surface={
                  room.look.floor === "frostCarpet" ? "frostCarpet" : "carpet"
                }
                hasBacking={room.look.floor === "checker"}
              />
            ),
          },
        ]
      : []),
    ...chandelierSpots
      .filter((spot) => spot.room === room.id)
      .map((spot) => ({
        id: spot.id,
        render: (isStill: boolean) => (
          <Chandelier
            hasLight={false}
            isStill={isStill}
            isWebbed
            position={spot.position}
            scale={spot.scale}
          />
        ),
      })),
  ]
}

function lightPieces(dressing: RoomDressing): RoomPiece[] {
  const { room, windows } = dressing
  return [
    ...(windows.length > 0
      ? [
          {
            id: "windows",
            render: (isStill: boolean) => (
              <ManorWindows windows={windows} isStill={isStill} />
            ),
          },
        ]
      : []),
    {
      id: "candles",
      render: (isStill: boolean) => (
        <Candles
          set={dressing.candles}
          bounds={room.bounds}
          isStill={isStill}
        />
      ),
    },
    ...(dressing.hasMoonlight
      ? [
          {
            id: "moonlight",
            render: (isStill: boolean) => (
              <Moonlight
                windows={windows}
                direction={moonDirection}
                isStill={isStill}
              />
            ),
          },
        ]
      : []),
  ]
}

function atmospherePieces(dressing: RoomDressing): RoomPiece[] {
  const { room } = dressing
  const hasRemnants = dressing.petals.length + dressing.feathers.length > 0
  return [
    { id: "fog", render: () => <FloorFog bounds={room.bounds} /> },
    ...(dressing.hasCobwebs
      ? [
          {
            id: "cobwebs",
            render: () => (
              <Cobwebs bounds={room.bounds} windows={dressing.windows} />
            ),
          },
        ]
      : []),
    {
      id: "decay",
      render: () => (
        <WallDecay
          patches={dressing.decay}
          peels={dressing.peels}
          paper={surfaceMaterial(room.look.wallpaper)}
        />
      ),
    },
    ...(hasRemnants
      ? [
          {
            id: "remnants",
            render: () => (
              <Remnants trails={dressing.petals} feathers={dressing.feathers} />
            ),
          },
        ]
      : []),
    ...(dressing.veils.length > 0
      ? [
          {
            id: "tulle",
            render: () => (
              <TulleVeils
                veils={dressing.veils}
                coolsAlongX={[room.bounds.minX + 3, room.bounds.maxX - 2]}
              />
            ),
          },
        ]
      : []),
  ]
}

// What the story changes in a room: the feathers once L'Envol is awake,
// Madame glimpsed in the corridor, the frost and pearls of Le Dedans.
const storyPieces: Partial<Record<RoomId, RoomPiece>> = {
  salon: {
    id: "envol-feathers",
    render: (isStill) => <EnvolFeathers isStill={isStill} />,
  },
  couloir: {
    id: "silhouette",
    render: (isStill) => <MadameSilhouette isStill={isStill} />,
  },
  boudoir: {
    id: "dedans-frost",
    render: (isStill) => <DedansFrost isStill={isStill} />,
  },
}

// Everything a room shows besides its shell, the photos first.
export function roomPieces(dressing: RoomDressing): RoomPiece[] {
  const story = storyPieces[dressing.room.id]
  return [
    ...exhibitPieces(dressing),
    ...fixturePieces(dressing),
    ...lightPieces(dressing),
    ...atmospherePieces(dressing),
    ...(story ? [story] : []),
  ]
}
