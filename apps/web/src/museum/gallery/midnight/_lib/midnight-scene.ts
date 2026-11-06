import { create } from "zustand"

// What midnight shows beyond the 3D scene: a black curtain over the screen
// (the blackout, the fade of ending B), and whether the visitor is looking at
// the thirteenth frame (its card). Not saved: a reload lands after midnight.

export type CurtainFade = "cut" | "soft" | "slow"

// "dim" leaves the room barely there: what still glows in the dark (pearls,
// lace) fades with it.
export type Curtain = "clear" | "dim" | "black"

type MidnightScene = {
  curtain: Curtain
  curtainFade: CurtainFade
  // The midnight sequence is playing: blackout, chimes, the tune.
  isStriking: boolean
  // Ending B is playing: the chandelier dims, the doors close, the fade.
  isKeeping: boolean
  isMirrorInView: boolean
}

export const useMidnightScene = create<MidnightScene>()(() => ({
  curtain: "clear",
  curtainFade: "soft",
  isStriking: false,
  isKeeping: false,
  isMirrorInView: false,
}))

export function setCurtain(curtain: Curtain, curtainFade: CurtainFade) {
  useMidnightScene.setState({ curtain, curtainFade })
}

export function setMirrorInView(isMirrorInView: boolean) {
  if (useMidnightScene.getState().isMirrorInView !== isMirrorInView) {
    useMidnightScene.setState({ isMirrorInView })
  }
}
