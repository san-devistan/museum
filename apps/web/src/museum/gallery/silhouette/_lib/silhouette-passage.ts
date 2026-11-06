import { roomOf } from "@/museum/gallery/_lib/manor-plan"
import { MathUtils, Vector3, type Object3D } from "three"

// Her one crossing of the Couloir des Voiles: the first time the visitor is
// halfway down it and looking ahead, she slips across behind the last veil,
// toward the panel at the dead end, and is gone.

const couloir = roomOf("couloir").bounds

export const passage = {
  // Seconds from first sight to gone.
  duration: 1.5,
  from: new Vector3(4.92, 0, -9.62),
  to: new Vector3(4.98, 0, -10.6),
  // Facing the dead end, turned toward where she goes.
  turn: Math.PI / 2 + 0.5,
  halfway: (couloir.minX + couloir.maxX) / 2,
  // How squarely the visitor must look down the corridor (+x).
  lookingAhead: 0.55,
}

export function isInCouloir(x: number, z: number) {
  return (
    x >= couloir.minX &&
    x <= couloir.maxX &&
    z >= couloir.minZ &&
    z <= couloir.maxZ
  )
}

// How present she is (0 to 1) and how far along her way, at `time`.
export function passagePose(time: number, isStill: boolean) {
  const { duration } = passage
  if (isStill) {
    const presence =
      MathUtils.smoothstep(time, 0, 0.4) *
      (1 - MathUtils.smoothstep(time, 0.9, duration))
    return { presence, along: 1 }
  }
  const presence =
    MathUtils.smoothstep(time, 0, 0.25) *
    (1 - MathUtils.smoothstep(time, 0.85, duration))
  const along = MathUtils.smootherstep(time, 0, duration)
  return { presence, along }
}

// Places her for `time` seconds into her passage.
export function posePassage(
  figure: Object3D,
  presence: { value: number },
  time: number,
  isStill: boolean
) {
  const pose = passagePose(time, isStill)
  presence.value = pose.presence
  figure.position.lerpVectors(passage.from, passage.to, pose.along)
}
