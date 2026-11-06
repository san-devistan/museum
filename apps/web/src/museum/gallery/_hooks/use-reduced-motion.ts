import { useMediaQuery } from "usehooks-ts"

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"

export function useReducedMotion() {
  return useMediaQuery(reducedMotionQuery)
}
