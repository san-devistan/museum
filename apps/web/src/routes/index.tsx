import { ClientOnly, createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

const MuseumExperience = lazy(async () => {
  const module = await import("@/museum/_pages/museum-experience")
  return { default: module.MuseumExperience }
})

export const Route = createFileRoute("/")({ component: MuseumRoute })

function MuseumLoading() {
  return (
    <div className="inset-0 text-sm fixed flex items-center justify-center bg-background text-muted-foreground">
      Ouverture de la galerie…
    </div>
  )
}

function MuseumRoute() {
  return (
    <ClientOnly fallback={<MuseumLoading />}>
      <Suspense fallback={<MuseumLoading />}>
        <MuseumExperience />
      </Suspense>
    </ClientOnly>
  )
}
