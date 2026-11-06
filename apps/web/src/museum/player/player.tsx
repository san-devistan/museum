import type { ExhibitSpot } from "@/museum/_lib/exhibit"
import { playerRadius, type Collider } from "@/museum/_lib/museum-layout"
import { useMuseumStore } from "@/museum/_lib/museum-store"
import { useExhibitFocus } from "@/museum/player/_hooks/use-exhibit-focus"
import { usePlayerControls } from "@/museum/player/_hooks/use-player-controls"
import { readMoveInput } from "@/museum/player/_lib/movement-keys"
import {
  isInside,
  type CollisionWorld,
} from "@/museum/player/_lib/player-collision"
import {
  playerTuning,
  type MoveInput,
} from "@/museum/player/_lib/player-motion"
import {
  applyRigToCamera,
  createRigFromCamera,
  releaseCamera,
  stepRig,
  type PlayerRig,
} from "@/museum/player/_lib/player-rig"
import { resetPlayerSession } from "@/museum/player/_lib/player-session"
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import { useMediaQuery } from "usehooks-ts"

type PlayerProps = {
  bounds: Collider
  colliders: readonly Collider[]
  exhibits: readonly ExhibitSpot[]
  exit: Collider
  onExit: () => void
}

const idleInput: MoveInput = { forward: 0, strafe: 0 }
const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

export function Player({
  bounds,
  colliders,
  exhibits,
  exit,
  onExit,
}: PlayerProps) {
  const rigRef = useRef<PlayerRig | null>(null)
  const hasExitedRef = useRef(false)
  const pressedRef = usePlayerControls(rigRef)
  const camera = useThree((state) => state.camera)
  const reducedMotion = useMediaQuery(reducedMotionQuery)
  const world = useMemo<CollisionWorld>(
    () => ({ colliders, bounds, radius: playerRadius }),
    [bounds, colliders]
  )

  useFrame((state, delta) => {
    if (hasExitedRef.current) {
      return
    }
    rigRef.current ??= createRigFromCamera(state.camera)
    const rig = rigRef.current
    const input = useMuseumStore.getState().isPaused
      ? idleInput
      : readMoveInput(pressedRef.current)

    stepRig(rig, input, Math.min(delta, playerTuning.maxFrameDelta), world)
    applyRigToCamera(rig, state.camera, reducedMotion)

    if (isInside(rig.motion.position, exit)) {
      hasExitedRef.current = true
      releaseCamera(state.camera)
      onExit()
    }
  })

  useExhibitFocus(exhibits)

  useEffect(() => resetPlayerSession, [])

  useEffect(
    () => () => {
      releaseCamera(camera)
    },
    [camera]
  )

  return null
}
