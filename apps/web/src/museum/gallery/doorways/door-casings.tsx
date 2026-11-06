import { surfaceMaterial } from "@/museum/_lib/surface-materials"
import {
  doorSpots,
  partition,
  type DoorSpot,
} from "@/museum/gallery/_lib/manor-plan"
import { BoxGeometry, Matrix4, Vector3 } from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"

const lining = { width: 0.04, overhang: 0.01 }
const architrave = { width: 0.11, depth: 0.03 }
const wallDepth = partition * 2
const axisY = new Vector3(0, 1, 0)

type Box = readonly [size: Vector3, center: Vector3]

// Dark wood around an open doorway: linings in the reveal and an
// architrave on both faces, in the door's own frame (+z faces rooms[0]).
function casingBoxes(door: DoorSpot): Box[] {
  const half = door.width / 2
  const liningDepth = wallDepth + lining.overhang * 2
  const faceZ = wallDepth / 2 + architrave.depth / 2
  const jambs = [-1, 1].flatMap((side): Box[] => [
    [
      new Vector3(lining.width, door.height, liningDepth),
      new Vector3(side * (half - lining.width / 2), door.height / 2, 0),
    ],
    ...[-1, 1].map(
      (face): Box => [
        new Vector3(
          architrave.width,
          door.height + architrave.width,
          architrave.depth
        ),
        new Vector3(
          side * (half + architrave.width / 2),
          (door.height + architrave.width) / 2,
          face * faceZ
        ),
      ]
    ),
  ])
  const heads = [-1, 1].map(
    (face): Box => [
      new Vector3(
        door.width + architrave.width * 2,
        architrave.width,
        architrave.depth
      ),
      new Vector3(0, door.height + architrave.width / 2, face * faceZ),
    ]
  )
  return [
    ...jambs,
    ...heads,
    [
      new Vector3(door.width, lining.width, liningDepth),
      new Vector3(0, door.height - lining.width / 2, 0),
    ],
  ]
}

function buildCasings() {
  const parts = doorSpots
    .filter((door) => door.kind === "archway" || door.kind === "ribbon")
    .flatMap((door) => {
      const matrix = new Matrix4()
        .makeRotationAxis(axisY, door.rotationY)
        .setPosition(...door.position)
      return casingBoxes(door).map(([size, center]) =>
        new BoxGeometry(size.x, size.y, size.z)
          .translate(center.x, center.y, center.z)
          .applyMatrix4(matrix)
      )
    })
  const merged = mergeGeometries(parts)
  for (const part of parts) {
    part.dispose()
  }
  return merged
}

const casings = buildCasings()

// The manor's doorways framed in wood; the hidden panel and the wallpaper
// door get none, they stay hidden.
export function DoorCasings() {
  return <mesh geometry={casings} material={surfaceMaterial("wood")} />
}
