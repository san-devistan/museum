import type { MoveInput } from "@/museum/player/_lib/player-motion"

const forwardCodes = ["KeyW", "ArrowUp"] as const
const backwardCodes = ["KeyS", "ArrowDown"] as const
const leftCodes = ["KeyA", "ArrowLeft"] as const
const rightCodes = ["KeyD", "ArrowRight"] as const

const movementCodes: ReadonlySet<string> = new Set([
  ...forwardCodes,
  ...backwardCodes,
  ...leftCodes,
  ...rightCodes,
])

export function isMovementCode(code: string) {
  return movementCodes.has(code)
}

function isAnyPressed(pressed: ReadonlySet<string>, codes: readonly string[]) {
  return codes.some((code) => pressed.has(code))
}

function axis(
  pressed: ReadonlySet<string>,
  positive: readonly string[],
  negative: readonly string[]
) {
  return (
    Number(isAnyPressed(pressed, positive)) -
    Number(isAnyPressed(pressed, negative))
  )
}

export function readMoveInput(pressed: ReadonlySet<string>): MoveInput {
  return {
    forward: axis(pressed, forwardCodes, backwardCodes),
    strafe: axis(pressed, rightCodes, leftCodes),
  }
}
