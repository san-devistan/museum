// Which moment of a chapter's change to show, from the seconds since the
// chapter woke: null hides it, Infinity is its end state (reached, or shown
// at once under reduced motion).
export function chapterPose(
  elapsed: number | null,
  length: number,
  isStill: boolean
): number | null {
  if (elapsed === null) {
    return null
  }
  if (isStill || elapsed >= length) {
    return Infinity
  }
  return elapsed
}
