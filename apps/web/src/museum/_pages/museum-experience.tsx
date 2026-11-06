import { cameraStart } from "@/museum/_lib/museum-layout"
import { useMuseumStore } from "@/museum/_lib/museum-store"
import { SceneEnvironment } from "@/museum/_lib/scene-environment"
import { Ambience } from "@/museum/ambience/ambience"
import { Entrance } from "@/museum/entrance/entrance"
import { EntranceOverlay } from "@/museum/entrance/entrance-overlay"
import { Gallery } from "@/museum/gallery/gallery"
import {
  galleryBounds,
  galleryColliders,
  galleryExit,
} from "@/museum/gallery/gallery-colliders"
import { galleryExhibits } from "@/museum/gallery/gallery-exhibits"
import { Narration } from "@/museum/narration/narration"
import { Player } from "@/museum/player/player"
import { PlayerHud } from "@/museum/player/player-hud"
import { Story } from "@/museum/story/story"
import { Canvas } from "@react-three/fiber"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"

const camera = {
  fov: cameraStart.fov,
  near: 0.05,
  far: 120,
  position: [...cameraStart.position] satisfies [number, number, number],
}

const renderer = { transmissionResolutionScale: 0.5 }

export function MuseumExperience() {
  const phase = useMuseumStore((state) => state.phase)
  const leaveGallery = useMuseumStore((state) => state.leaveGallery)
  const isPlayerActive = phase === "gallery"

  return (
    <div className="inset-0 fixed overflow-hidden bg-background">
      <Canvas camera={camera} dpr={[1, 1.5]} gl={renderer}>
        <color attach="background" args={[sceneTokens.color.sky]} />
        <hemisphereLight
          args={[sceneTokens.color.lightCool, sceneTokens.color.ground, 0.35]}
        />
        <SceneEnvironment />
        <Entrance />
        <Ambience />
        <Gallery isDoorClosed={phase === "entrance"} />
        {isPlayerActive ? (
          <Player
            bounds={galleryBounds}
            colliders={galleryColliders}
            exhibits={galleryExhibits}
            exit={galleryExit}
            onExit={leaveGallery}
          />
        ) : null}
      </Canvas>
      <EntranceOverlay />
      <Story />
      <PlayerHud />
      <Narration />
    </div>
  )
}
