import { restingSatinMaterial } from "@/museum/entrance/_lib/satin-material"
import { thresholdRibbonGeometry } from "@/museum/entrance/_lib/threshold-ribbon"
import { useStoryStore } from "@/museum/story/_lib/story-store"

// The ribbon that tied the doors, lying untied on the doorstep once midnight
// has struck.
export function ThresholdRibbon() {
  const isMidnight = useStoryStore((state) => state.midnight)

  return (
    <mesh
      geometry={thresholdRibbonGeometry}
      material={restingSatinMaterial}
      visible={isMidnight}
    />
  )
}
