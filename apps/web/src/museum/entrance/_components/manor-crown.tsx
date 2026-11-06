import { reducedMotionQuery } from "@/museum/entrance/_lib/candle-flicker"
import { crownGeometry } from "@/museum/entrance/_lib/crown-geometry"
import {
  facadeStoneMaterial,
  limestoneMaterial,
} from "@/museum/entrance/_lib/manor-materials"
import { candleWalk } from "@/museum/entrance/_lib/manor-upper-layout"
import {
  crestingMaterial,
  leadMaterial,
  paneMaterial,
  paneUniforms,
  slateMaterial,
} from "@/museum/entrance/_lib/roof-materials"
import { useFrame } from "@react-three/fiber"
import { MathUtils } from "three"
import { useMediaQuery } from "usehooks-ts"

/** Reduced motion: Madame's candle stands still, a third of the way across. */
const stillCandle = { u: 0.32, light: 0.7 }

/** Someone walks past the window with a candle, then the room goes dark. */
function stepCandleWalk(time: number) {
  const since = time - candleWalk.firstPass
  const local = MathUtils.euclideanModulo(since, candleWalk.period)
  const progress = since < 0 ? 0 : local / candleWalk.duration
  if (progress <= 0 || progress >= 1) {
    paneUniforms.wanderLight.value = 0
    return
  }
  const fade =
    MathUtils.smoothstep(progress, 0, 0.12) *
    (1 - MathUtils.smoothstep(progress, 0.88, 1))
  paneUniforms.wanderU.value = MathUtils.lerp(
    candleWalk.from,
    candleWalk.to,
    progress
  )
  paneUniforms.wanderLight.value = fade
}

/** The bedroom storey, slate roof, chimneys and west tower above the door. */
export function ManorCrown() {
  const reducedMotion = useMediaQuery(reducedMotionQuery)

  useFrame(({ clock }) => {
    if (reducedMotion) {
      paneUniforms.paneTime.value = 0
      paneUniforms.wanderU.value = stillCandle.u
      paneUniforms.wanderLight.value = stillCandle.light
      return
    }
    paneUniforms.paneTime.value = clock.elapsedTime
    stepCandleWalk(clock.elapsedTime)
  })

  return (
    <group>
      <mesh geometry={crownGeometry.stone} material={facadeStoneMaterial} />
      <mesh geometry={crownGeometry.limestone} material={limestoneMaterial} />
      <mesh geometry={crownGeometry.slate} material={slateMaterial} />
      <mesh geometry={crownGeometry.lead} material={leadMaterial} />
      <mesh geometry={crownGeometry.panes} material={paneMaterial} />
      <mesh geometry={crownGeometry.cresting} material={crestingMaterial} />
    </group>
  )
}
