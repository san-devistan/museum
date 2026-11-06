// One shared clock for the manor's slow animations (fog drift, flicker,
// curtains, dust). Shader materials hold this uniform by reference, so a
// single update per frame drives all of them. It stops under reduced motion.
export const manorTime = { value: 0 }

export function advanceManorClock(delta: number) {
  manorTime.value += Math.min(delta, 0.1)
}
