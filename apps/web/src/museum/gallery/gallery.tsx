import { useSceneWarmup, useStagedReveal } from "@/museum/_lib/scene-warmup"
import type { Surface } from "@/museum/_lib/surface-materials"
import {
  ManorRoom,
  type RoomGroups,
} from "@/museum/gallery/_components/manor-room"
import {
  roomPieces,
  type RoomPiece,
} from "@/museum/gallery/_components/room-pieces"
import { useReducedMotion } from "@/museum/gallery/_hooks/use-reduced-motion"
import { doorBlocker, manorSolids } from "@/museum/gallery/_lib/gallery-layout"
import { advanceManorClock } from "@/museum/gallery/_lib/manor-clock"
import {
  roomDressings,
  type RoomDressing,
} from "@/museum/gallery/_lib/manor-dressing"
import {
  doorSpots,
  manorRooms,
  type RoomId,
} from "@/museum/gallery/_lib/manor-plan"
import {
  isNearby,
  updateManorPresence,
  useManorPresence,
} from "@/museum/gallery/_lib/manor-presence"
import { ManorFill } from "@/museum/gallery/candles/manor-fill"
import { isDoorwayOpen } from "@/museum/gallery/doors/_lib/door-locks"
import { ManorDoors } from "@/museum/gallery/doors/manor-doors"
import { DoorCasings } from "@/museum/gallery/doorways/door-casings"
import { Midnight } from "@/museum/gallery/midnight/midnight"
import { useFrame } from "@react-three/fiber"
import { useCallback, useMemo, useState } from "react"
import {
  Box3,
  Frustum,
  Matrix4,
  Vector3,
  type Camera,
  type Object3D,
} from "three"

type GalleryProps = {
  isDoorClosed: boolean
}

type RoomEntry = {
  id: RoomId
  dressing: RoomDressing
  pieces: readonly RoomPiece[]
  // Index of its first piece among every room's pieces.
  firstStage: number
}

// Textures are painted one surface per frame, before any room fills in.
const shellSurfaces: readonly Surface[] = [
  "wallpaper",
  "checker",
  "carpet",
  "wood",
  "cushion",
  "stone",
  "wallpaperVeil",
  "wallpaperFrost",
  "frostCarpet",
  "wallpaperWine",
]

function buildRoomEntries() {
  const entries: RoomEntry[] = []
  let firstStage = 0
  for (const room of manorRooms) {
    const dressing = roomDressings.get(room.id)
    if (dressing) {
      const pieces = roomPieces(dressing)
      entries.push({ id: room.id, dressing, pieces, firstStage })
      firstStage += pieces.length
    }
  }
  return entries
}

const roomEntries: readonly RoomEntry[] = buildRoomEntries()

const pieceCount = roomEntries.reduce(
  (count, entry) => count + entry.pieces.length,
  0
)
const stageCount = shellSurfaces.length + pieceCount

// The openings between two rooms, as boxes: a neighbour only draws while
// one of them is open and in view (lights stay on, so no shader ever
// recompiles).
const portals = doorSpots.map((door) => {
  const opening = doorBlocker(door)
  return {
    id: door.id,
    rooms: door.rooms,
    box: new Box3(
      new Vector3(opening.minX, 0, opening.minZ),
      new Vector3(opening.maxX, door.height, opening.maxZ)
    ),
  }
})

const frustum = new Frustum()
const viewProjection = new Matrix4()

function isPortalInView(current: RoomId, room: RoomId) {
  return portals.some(
    (portal) =>
      portal.rooms.includes(current) &&
      portal.rooms.includes(room) &&
      isDoorwayOpen(portal.id) &&
      frustum.intersectsBox(portal.box)
  )
}

function updateFrustum(camera: Camera) {
  camera.updateMatrixWorld()
  viewProjection.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  )
  frustum.setFromProjectionMatrix(viewProjection)
}

function setVisible(object: Object3D | null, isVisible: boolean) {
  if (object && object.visible !== isVisible) {
    object.visible = isVisible
  }
}

// Madame's manor: five rooms, of which only the one you are in and its
// neighbours render and are lit.
export function Gallery({ isDoorClosed }: GalleryProps) {
  const revealed = useStagedReveal(stageCount, !isDoorClosed)
  const isStill = useReducedMotion()
  const surfaceCount = Math.min(revealed, shellSurfaces.length)
  const texturedSurfaces = useMemo(
    () => new Set(shellSurfaces.slice(0, surfaceCount)),
    [surfaceCount]
  )
  const pieceStage = Math.max(0, revealed - shellSurfaces.length)
  const isRevealed = revealed === stageCount
  // Filled by each room's group refs; read and toggled every frame.
  const [roomGroups] = useState(
    () =>
      new Map<RoomId, RoomGroups>(
        roomEntries.map((entry) => [
          entry.id,
          { shell: null, content: null, lights: null },
        ])
      )
  )
  // Shows every room until the next frame hides the far ones again, so the
  // warmup compiles every room's shaders once, with today's light count, and
  // walking into a room never stalls on a new shader.
  const revealRooms = useCallback(() => {
    for (const groups of roomGroups.values()) {
      setVisible(groups.shell, true)
      setVisible(groups.content, true)
    }
  }, [roomGroups])

  useSceneWarmup(isRevealed, revealRooms)

  useFrame(({ camera }, delta) => {
    if (!isStill && !isDoorClosed) {
      advanceManorClock(delta)
    }
    updateManorPresence(camera.position.x, camera.position.z)
    const current = useManorPresence.getState().roomId
    updateFrustum(camera)
    for (const [id, groups] of roomGroups) {
      const isNear = isNearby(current, id)
      const isSeen = isNear && (id === current || isPortalInView(current, id))
      setVisible(groups.shell, isSeen)
      setVisible(groups.content, isSeen && !isDoorClosed)
      setVisible(groups.lights, isNear)
    }
  })

  return (
    <group>
      <ManorFill isLit={!isDoorClosed} />
      <DoorCasings />
      <group visible={!isDoorClosed}>
        <ManorDoors isStill={isStill} texturedSurfaces={texturedSurfaces} />
      </group>
      <Midnight />
      {roomEntries.map((entry) => {
        const groups = roomGroups.get(entry.id)
        return (
          <ManorRoom
            key={entry.id}
            dressing={entry.dressing}
            solids={manorSolids.get(entry.id) ?? []}
            pieces={entry.pieces.slice(
              0,
              Math.max(0, pieceStage - entry.firstStage)
            )}
            texturedSurfaces={texturedSurfaces}
            isLit={!isDoorClosed}
            isStill={isStill}
            isInitiallyNear={isNearby("vestibule", entry.id)}
            shellRef={(group) => {
              if (groups) {
                groups.shell = group
              }
            }}
            contentRef={(group) => {
              if (groups) {
                groups.content = group
              }
            }}
            lightsRef={(group) => {
              if (groups) {
                groups.lights = group
              }
            }}
          />
        )
      })}
    </group>
  )
}
