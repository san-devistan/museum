import { StaticInstances } from "@/museum/entrance/_components/static-instances"
import {
  candleFlicker,
  reducedMotionQuery,
} from "@/museum/entrance/_lib/candle-flicker"
import { facadeGeometry } from "@/museum/entrance/_lib/facade-geometry"
import { mistLayers } from "@/museum/entrance/_lib/manor-layout"
import {
  curtainSway,
  facadeStoneMaterial,
  leafMaterial,
  limestoneMaterial,
  pearlMaterial,
  roseMaterial,
  vineMaterial,
} from "@/museum/entrance/_lib/manor-materials"
import {
  pearlGeometry,
  pearlInstances,
} from "@/museum/entrance/_lib/pearl-geometry"
import {
  leafGeometry,
  leaves,
  roseGeometry,
  roseInstances,
} from "@/museum/entrance/_lib/rose-geometry"
import { vineGeometry } from "@/museum/entrance/_lib/vine-geometry"
import {
  curtainMaterial,
  fanlightMaterial,
  mistMaterials,
  windowGlassMaterial,
} from "@/museum/entrance/_lib/window-materials"
import { useFrame } from "@react-three/fiber"
import { useMediaQuery } from "usehooks-ts"

const windowGlow = { curtain: 0.62, fanlight: 0.75, phase: 3.1 }

const mistSheets = mistLayers.map((layer, index) => ({
  layer,
  material: mistMaterials[index],
  shift: index * 0.37,
}))

function stepFacade(time: number) {
  curtainSway.value = time
  const glow = candleFlicker(time * 0.6, windowGlow.phase)
  curtainMaterial.color.setScalar(windowGlow.curtain * (0.8 + 0.2 * glow))
  fanlightMaterial.color.setScalar(windowGlow.fanlight * (0.75 + 0.25 * glow))
  for (const { layer, material, shift } of mistSheets) {
    if (material?.map) {
      material.map.offset.x = shift + time * layer.drift
    }
  }
}

/** Haunted-manor stone front: ashlar, Tudor portal, lancet windows, mist. */
export function ManorFacade() {
  const reducedMotion = useMediaQuery(reducedMotionQuery)

  useFrame(({ clock }) => {
    stepFacade(reducedMotion ? 0 : clock.elapsedTime)
  })

  return (
    <group>
      <mesh geometry={facadeGeometry.skin} material={facadeStoneMaterial} />
      <mesh geometry={facadeGeometry.plinth} material={facadeStoneMaterial} />
      <mesh geometry={facadeGeometry.stonework} material={limestoneMaterial} />
      <mesh geometry={facadeGeometry.fanlight} material={fanlightMaterial} />
      <mesh geometry={facadeGeometry.curtains} material={curtainMaterial} />
      <mesh
        geometry={facadeGeometry.windowGlass}
        material={windowGlassMaterial}
      />
      <mesh geometry={vineGeometry} material={vineMaterial} />
      <StaticInstances
        geometry={leafGeometry}
        instances={leaves}
        material={leafMaterial}
      />
      <StaticInstances
        geometry={roseGeometry}
        instances={roseInstances}
        material={roseMaterial}
      />
      <StaticInstances
        geometry={pearlGeometry}
        instances={pearlInstances}
        material={pearlMaterial}
      />
      {mistSheets.map(({ layer, material }) => (
        <mesh key={layer.id} material={material} position={layer.center}>
          <planeGeometry args={[layer.size[0], layer.size[1]]} />
        </mesh>
      ))}
    </group>
  )
}
