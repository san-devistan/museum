let lockTarget: HTMLElement | null = null

export function setPointerLockTarget(target: HTMLElement) {
  lockTarget = target

  return () => {
    if (lockTarget === target) {
      lockTarget = null
    }
  }
}

export function requestPlayerPointerLock() {
  const target = lockTarget ?? document.querySelector("canvas")
  if (!target || document.pointerLockElement === target) {
    return
  }

  void Promise.resolve(target.requestPointerLock()).catch(() => undefined)
}
