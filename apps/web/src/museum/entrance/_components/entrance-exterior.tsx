import { ManorCrown } from "@/museum/entrance/_components/manor-crown"
import { ManorFacade } from "@/museum/entrance/_components/manor-facade"
import {
  LanternLights,
  ManorLanterns,
} from "@/museum/entrance/_components/manor-lanterns"
import { NightSky } from "@/museum/entrance/_components/night-sky"
import { SceneSolids } from "@/museum/entrance/_components/scene-solids"
import {
  exteriorSolids,
  moonlight,
  ribbonSpot,
} from "@/museum/entrance/_lib/entrance-layout"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"
import type { Ref } from "react"
import type { Group } from "three"

type EntranceExteriorProps = {
  lightsRef: Ref<Group>
}

const ribbonSpotData = { baseIntensity: ribbonSpot.intensity }
const moonlightData = { baseIntensity: moonlight.intensity }

export function EntranceExterior({ lightsRef }: EntranceExteriorProps) {
  return (
    <group>
      <SceneSolids solids={exteriorSolids} />
      <NightSky />
      <ManorFacade />
      <ManorCrown />
      <ManorLanterns />
      <group ref={lightsRef}>
        <LanternLights />
        <pointLight
          color={sceneTokens.color.lightCool}
          decay={ribbonSpot.decay}
          distance={ribbonSpot.distance}
          intensity={ribbonSpot.intensity}
          position={ribbonSpot.position}
          userData={ribbonSpotData}
        />
        <directionalLight
          color={sceneTokens.manor.moonlight}
          intensity={moonlight.intensity}
          position={moonlight.position}
          userData={moonlightData}
        />
      </group>
    </group>
  )
}
