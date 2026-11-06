import {
  manorRooms,
  neighboursOf,
  roomAt,
  type RoomId,
} from "@/museum/gallery/_lib/manor-plan"
import { create } from "zustand"

// Which room of the manor the visitor is in. It only changes once they are
// fully inside another room, so standing in a doorway keeps the last one.
// Outside, the Vestibule is where they are about to be.
type ManorPresence = {
  roomId: RoomId
}

export const useManorPresence = create<ManorPresence>()(() => ({
  roomId: "vestibule",
}))

export function updateManorPresence(x: number, z: number) {
  const roomId = roomAt(x, z)
  if (roomId && roomId !== useManorPresence.getState().roomId) {
    useManorPresence.setState({ roomId })
  }
}

// The room itself and the rooms one doorway away: what renders and is lit.
export const nearbyRooms = new Map<RoomId, ReadonlySet<RoomId>>(
  manorRooms.map((room) => [
    room.id,
    new Set<RoomId>([room.id, ...neighboursOf(room.id)]),
  ])
)

export function isNearby(current: RoomId, room: RoomId) {
  return nearbyRooms.get(current)?.has(room) ?? false
}
