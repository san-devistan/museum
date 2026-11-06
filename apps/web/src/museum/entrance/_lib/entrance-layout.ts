import { entranceDoor, eyeHeight } from "@/museum/_lib/museum-layout"
import type { SceneColor } from "@workspace/ui/lib/scene-tokens"
import { MathUtils, PerspectiveCamera, Vector3 } from "three"

export type Point = [x: number, y: number, z: number]

export type SolidShape = "box" | "cylinder"

export type SceneSolid = {
  id: string
  shape: SolidShape
  color: SceneColor
  center: Point
  size: Point
}

type SolidSpec = Omit<SceneSolid, "shape">

function box(spec: SolidSpec): SceneSolid {
  return { ...spec, shape: "box" }
}

const doorLeftX = entranceDoor.centerX - entranceDoor.width / 2
const doorRightX = entranceDoor.centerX + entranceDoor.width / 2
const leafCenterZ = (entranceDoor.innerZ + entranceDoor.outerZ) / 2

const leafClearance = 0.006
const leafBottom = 0.005
export const leafThickness = 0.08
const leafWidth = entranceDoor.width / 2 - leafClearance * 1.5
const leafHeight = entranceDoor.height - leafBottom - leafClearance
const hingeZ = leafCenterZ - leafThickness / 2

export type LeafSide = "left" | "right"

export type LeafSpec = {
  side: LeafSide
  sign: 1 | -1
  hinge: Point
  openAngle: number
  center: Point
  size: Point
}

function leaf(side: LeafSide): LeafSpec {
  const sign = side === "left" ? 1 : -1
  const hingeX = side === "left" ? doorLeftX : doorRightX
  return {
    side,
    sign,
    hinge: [hingeX, 0, hingeZ],
    openAngle: sign * MathUtils.degToRad(96),
    center: [
      sign * (leafClearance + leafWidth / 2),
      leafBottom + leafHeight / 2,
      leafThickness / 2,
    ],
    size: [leafWidth, leafHeight, leafThickness],
  }
}

export const doorLeaves: readonly LeafSpec[] = [leaf("left"), leaf("right")]

export const doorHover = { glow: 0.18, damping: 12 }

/** The sign is framed from just above the portal's label mould. */
const signAnchorY = entranceDoor.height + 0.24
const signAnchorDepth = 0.05

const facadeZ = entranceDoor.outerZ

export const exteriorSolids: readonly SceneSolid[] = [
  box({
    id: "ground",
    color: "ground",
    center: [0, -0.1, -10],
    size: [100, 0.1, 100],
  }),
  box({
    id: "carpet",
    color: "carpet",
    center: [entranceDoor.centerX, -0.042, facadeZ + 4.5],
    size: [entranceDoor.width + 0.2, 0.016, 9],
  }),
]

export const ribbonSpot = {
  position: [entranceDoor.centerX, 3.2, facadeZ + 1.6] satisfies Point,
  intensity: 1.6,
  distance: 4,
  decay: 2,
}

export const moonlight = {
  position: [-4, 7, 6] satisfies Point,
  intensity: 0.95,
}

// The close framing the neon sign was hung for, kept when the start camera
// moved back to show the whole front.
const signFraming = {
  position: [0, eyeHeight, 3.6] satisfies Point,
  lookAt: [0, 1.85, 0] satisfies Point,
  fov: 70,
}

function startViewCamera() {
  const camera = new PerspectiveCamera(signFraming.fov, 1)
  camera.position.set(...signFraming.position)
  camera.lookAt(...signFraming.lookAt)
  camera.updateMatrixWorld()
  return camera
}

function midwayToViewTop(lower: Vector3, planeZ: number) {
  const camera = startViewCamera()
  const lowerNdcY = lower.clone().project(camera).y
  const ray = new Vector3(0, (lowerNdcY + 1) / 2, 1)
    .unproject(camera)
    .sub(camera.position)
  return camera.position.y + (ray.y * (planeZ - camera.position.z)) / ray.z
}

const signZ = facadeZ + 0.02
const signAnchor = new Vector3(
  entranceDoor.centerX,
  signAnchorY,
  entranceDoor.outerZ + signAnchorDepth
)

export const entranceSign = {
  width: 3.8,
  center: [
    entranceDoor.centerX,
    midwayToViewTop(signAnchor, signZ),
    signZ,
  ] satisfies Point,
}

export const doorFaceZ = hingeZ + leafThickness
