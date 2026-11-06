import { useEffect, useState, type RefObject } from "react"

function overflows(element: HTMLElement) {
  return element.scrollHeight - element.clientHeight > 1
}

export function useWheelScroll(
  ref: RefObject<HTMLElement | null>,
  isActive: boolean
) {
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const element = ref.current
    const observer = new ResizeObserver(() => {
      setCanScroll(element ? overflows(element) : false)
    })
    if (element) {
      observer.observe(element)
    }
    return () => {
      observer.disconnect()
    }
  }, [ref])

  useEffect(() => {
    const target = isActive ? window : null
    const onWheel = (event: WheelEvent) => {
      ref.current?.scrollBy({ top: event.deltaY })
    }
    target?.addEventListener("wheel", onWheel, { passive: true })
    return () => {
      target?.removeEventListener("wheel", onWheel)
    }
  }, [isActive, ref])

  return canScroll
}
