import type { ArtworkLabel } from "@/museum/_lib/exhibit"
import { laceMarginRatio } from "@/museum/gallery/_lib/lace-outline"
import { paleMark } from "@/museum/gallery/_lib/manor-plan"
import { artworkFrame } from "@/museum/gallery/artwork/_lib/artwork-frame"
import { labelSize } from "@/museum/gallery/label/_lib/label-assets"
import { Vector3, type Camera } from "three"

// The thirteenth frame: a lace frame the size of the pale mark by the front
// door, hung where the old one was, with a mirror where a photograph would be.

// The print a lace frame needs around it to come out the mark's size.
const printMargin =
  (Math.min(paleMark.width, paleMark.height) / (1 + 2 * laceMarginRatio)) *
  laceMarginRatio

export const thirteenthFrame = artworkFrame({
  width: paleMark.width - printMargin * 2,
  height: paleMark.height - printMargin * 2,
})

// Clear of the wallpaper, as the other works hang.
const wallOffset = 0.01
const [markX, markY, markZ] = paleMark.position

export const framePlacement = {
  position: [
    markX - Math.sin(paleMark.rotationY) * wallOffset,
    markY,
    markZ + Math.cos(paleMark.rotationY) * wallOffset,
  ] satisfies [number, number, number],
  rotationY: paleMark.rotationY,
}

// Its card, right of the frame as the visitor faces it, at the eye line the
// works' cards share.
const labelGap = 0.14
const labelEyeLine = 1.32
export const labelPlacement: [number, number, number] = [
  thirteenthFrame.lace.width / 2 + labelGap + labelSize.width / 2,
  labelEyeLine - markY,
  0.006,
]

const center = new Vector3(...framePlacement.position)
// Into the room.
const normal = new Vector3(
  Math.sin(paleMark.rotationY),
  0,
  Math.cos(paleMark.rotationY)
)
const forward = new Vector3()

// Close enough, in front of it, and looking at it (cosine of the widest
// angle between the view and the frame's centre).
export function isFacingFrame(camera: Camera, reach: number, cone: number) {
  const toX = center.x - camera.position.x
  const toY = center.y - camera.position.y
  const toZ = center.z - camera.position.z
  const front = -(toX * normal.x + toZ * normal.z)
  if (front < 0.4) {
    return false
  }
  const distance = Math.hypot(toX, toY, toZ)
  if (distance > reach) {
    return false
  }
  camera.getWorldDirection(forward)
  const alignment =
    (toX * forward.x + toY * forward.y + toZ * forward.z) / distance
  return alignment >= cone
}

export const emptyFrameCard = {
  title: "Sans titre",
  lines: ["Le cadre est vide. Il attend quelqu'un."],
} as const

const nightFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

// Tonight, in French: « 6 novembre 2026 ».
export function tonight() {
  return nightFormat.format(new Date())
}

export function keptVisitorCard(night: string) {
  return {
    title: "Vous",
    lines: [`Nuit du ${night}.`, "Collection permanente."],
  } as const
}

export const emptyFrameLabel: ArtworkLabel = {
  id: "thirteenth-frame",
  kind: "arrangement",
  title: emptyFrameCard.title,
  medium: emptyFrameCard.lines.join(" "),
}

export function keptVisitorLabel(night: string): ArtworkLabel {
  const card = keptVisitorCard(night)
  return {
    id: `thirteenth-frame-${night}`,
    kind: "arrangement",
    title: card.title,
    year: card.lines[0],
    medium: card.lines[1],
  }
}
