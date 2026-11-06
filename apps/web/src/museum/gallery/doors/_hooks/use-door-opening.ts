import { doorBlocker } from "@/museum/gallery/_lib/gallery-layout"
import type { DoorSpot } from "@/museum/gallery/_lib/manor-plan"
import {
  playDoorCreak,
  preloadDoorCreak,
} from "@/museum/gallery/doors/_lib/door-creak"
import {
  openLeafCollider,
  type DoorLeaf,
} from "@/museum/gallery/doors/_lib/door-leaves"
import {
  setDoorwayOpen,
  useIsDoorUnlocked,
} from "@/museum/gallery/doors/_lib/door-locks"
import {
  doorOpeningLength,
  doorPose,
  swingStart,
  type DoorPose,
} from "@/museum/gallery/doors/_lib/door-motion"
import { setDoorwayColliders } from "@/museum/gallery/gallery-colliders"
import { useFrame } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useRef } from "react"

// Past this much of its swing, a door no longer blocks the way: its open
// leaves do instead.
const passableSwing = 0.35

// Drives one locked door: shut until its lock is met, then the opening
// played once (ribbon, seam, swing and creak), then open for good. A door
// unlocked already when the manor loads is simply open. `apply` poses the
// door's meshes and is called on every frame the pose changes.
export function useDoorOpening(
  door: DoorSpot,
  leaves: readonly DoorLeaf[],
  isStill: boolean,
  apply: (pose: DoorPose) => void
) {
  const isUnlocked = useIsDoorUnlocked(door)
  // Seconds since the lock was met; null while shut.
  const elapsedRef = useRef<number | null>(isUnlocked ? Infinity : null)
  const poseRef = useRef<DoorPose>({ ribbon: 0, seam: 0, swing: 0 })
  const applyRef = useRef(apply)
  const stateRef = useRef({ isOpen: false, isPassable: false })

  useEffect(() => {
    applyRef.current = apply
  }, [apply])

  useEffect(() => {
    preloadDoorCreak()
  }, [])

  useLayoutEffect(() => {
    const state = stateRef.current
    if (isUnlocked) {
      elapsedRef.current ??= 0
    } else {
      elapsedRef.current = null
      state.isOpen = false
      state.isPassable = false
      setDoorwayOpen(door.id, false)
      setDoorwayColliders(door.id, [doorBlocker(door)])
    }
    const elapsed = elapsedRef.current ?? 0
    applyRef.current(doorPose(door.kind, elapsed, isStill, poseRef.current))
  }, [door, isStill, isUnlocked])

  useFrame(({ camera }, delta) => {
    const elapsed = elapsedRef.current
    if (elapsed === null) {
      return
    }
    const state = stateRef.current
    const isSettled = elapsed === Infinity
    if (isSettled && state.isPassable) {
      return
    }
    const before = elapsed
    const now = isSettled ? Infinity : elapsed + Math.min(delta, 0.1)
    elapsedRef.current = now >= doorOpeningLength(door.kind) ? Infinity : now
    const pose = doorPose(door.kind, now, isStill, poseRef.current)
    applyRef.current(pose)
    const start = swingStart(door.kind, isStill)
    if (!state.isOpen && now >= start) {
      state.isOpen = true
      setDoorwayOpen(door.id, true)
      if (!isSettled && before < start) {
        const [x, , z] = door.position
        playDoorCreak(Math.hypot(camera.position.x - x, camera.position.z - z))
      }
    }
    if (!state.isPassable && (pose.swing >= passableSwing || isSettled)) {
      state.isPassable = true
      setDoorwayColliders(
        door.id,
        leaves.map((leaf) => openLeafCollider(door, leaf))
      )
    }
  })
}
