export function cssFontFamily(className: string) {
  const probe = document.createElement("span")
  probe.className = className
  document.body.append(probe)
  const family = getComputedStyle(probe).fontFamily
  probe.remove()
  return family
}

export async function loadFontFamilies(
  families: readonly string[],
  sample: string
) {
  await Promise.all(
    families.map((family) => document.fonts.load(`32px ${family}`, sample))
  )
}
