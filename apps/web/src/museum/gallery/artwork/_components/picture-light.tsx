import {
  hoodAim,
  pictureLight,
  pictureLightGeometry,
  pictureLightMaterials,
} from "@/museum/gallery/artwork/_lib/picture-light"

type PictureLightProps = {
  frameTop: number
  frameWidth: number
  frameHeight: number
  canvasCenterY: number
}

const { geometry: shapes, materials } = {
  geometry: pictureLightGeometry,
  materials: pictureLightMaterials,
}

const barInset = 0.02
const aimDepth = 0.05

export function PictureLight({
  frameTop,
  frameWidth,
  frameHeight,
  canvasCenterY,
}: PictureLightProps) {
  const hoodLength = Math.min(
    pictureLight.maxHood,
    Math.max(pictureLight.minHood, frameWidth * pictureLight.hoodRatio)
  )
  const mountY = frameTop + pictureLight.gap
  const hoodY = mountY + pictureLight.drop
  const hoodZ = pictureLight.reach
  const armLength = Math.hypot(pictureLight.reach, pictureLight.drop)
  const armTilt = Math.atan2(pictureLight.reach, pictureLight.drop)
  const armSpread = hoodLength * 0.32
  const aimY = canvasCenterY + (frameTop - canvasCenterY) * pictureLight.aimLift
  const aim = hoodAim({ y: aimY - hoodY, z: aimDepth - hoodZ })
  const barTilt = Math.atan2(aim.direction.z, aim.direction.y)
  const washCenterY =
    canvasCenterY + (frameTop - canvasCenterY) * pictureLight.washLift

  return (
    <group>
      <mesh
        geometry={shapes.wash}
        material={materials.wash}
        position={[0, washCenterY, 0.004]}
        scale={[
          frameWidth * pictureLight.washWidth,
          frameHeight * pictureLight.washHeight,
          1,
        ]}
      />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * armSpread, mountY, 0]}>
          <mesh
            geometry={shapes.rose}
            material={materials.brass}
            position-z={0.01}
            rotation-x={Math.PI / 2}
          />
          <mesh
            geometry={shapes.arm}
            material={materials.shell}
            position={[0, pictureLight.drop / 2, hoodZ / 2]}
            rotation-x={armTilt}
            scale={[1, armLength, 1]}
          />
          <mesh
            geometry={shapes.knuckle}
            material={materials.brass}
            position={[0, pictureLight.drop, hoodZ]}
          />
        </group>
      ))}
      <group position={[0, hoodY, hoodZ]}>
        <mesh
          geometry={shapes.hood}
          material={materials.shell}
          rotation={[aim.turn, 0, Math.PI / 2]}
          scale={[1, hoodLength, 1]}
        />
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={shapes.cap}
            material={materials.brass}
            position-x={(side * hoodLength) / 2}
            rotation-z={Math.PI / 2}
          />
        ))}
        <mesh
          geometry={shapes.bar}
          material={materials.glow}
          position={[0, aim.direction.y * barInset, aim.direction.z * barInset]}
          rotation-x={barTilt}
          scale={[hoodLength * 0.92, 1, 1]}
        />
      </group>
    </group>
  )
}
