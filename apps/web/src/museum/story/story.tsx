import { ContactCard } from "@/museum/story/_components/contact-card"
import { MirrorCard } from "@/museum/story/_components/mirror-card"
import { NightCurtain } from "@/museum/story/_components/night-curtain"
import { useVisitTracking } from "@/museum/story/_hooks/use-visit-tracking"
import { useWakeChime } from "@/museum/story/_hooks/use-wake-chime"
import { useWakeOnGaze } from "@/museum/story/_hooks/use-wake-on-gaze"
import { StoryHud } from "@/museum/story/story-hud"

// The game layer of « Minuit chez Dolla Shashin »: images wake under the
// visitor's gaze, pearls count them, and the visit is remembered. The voice
// lines it queues are played by the narration. After midnight: the
// thirteenth frame's card, the artist's last card, and the black curtain of
// the blackout and of ending B.
export function Story() {
  useVisitTracking()
  useWakeOnGaze()
  useWakeChime()

  return (
    <>
      <StoryHud />
      <MirrorCard />
      <ContactCard />
      <NightCurtain />
    </>
  )
}
