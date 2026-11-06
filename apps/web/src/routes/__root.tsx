import { ThemeProvider } from "@/components/theme-provider"
import type { QueryClient } from "@tanstack/react-query"
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import cormorantGaramondFont from "@workspace/ui/fonts/cormorant-garamond.woff2?url"
import dottedScriptFont from "@workspace/ui/fonts/dotted-script.woff2?url"
import loraFont from "@workspace/ui/fonts/lora.woff2?url"
import appCss from "@workspace/ui/globals.css?url"
import { sceneTokens } from "@workspace/ui/lib/scene-tokens"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Dollashashin's Gallery",
      },
      {
        name: "description",
        content: "Step through the door and wander an immersive 3D gallery.",
      },
      {
        name: "theme-color",
        content: sceneTokens.color.sky,
      },
    ],
    links: [
      ...[dottedScriptFont, loraFont, cormorantGaramondFont].map((href) => ({
        rel: "preload",
        href,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous" as const,
      })),
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="p-4 pt-16 container mx-auto">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
