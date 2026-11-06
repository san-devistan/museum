import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import type { Config as RouterPluginConfig } from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig, type Rollup } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

const ignoredRollupWarningCodes = new Set([
  "EMPTY_BUNDLE",
  "MODULE_LEVEL_DIRECTIVE",
])

const handleRollupWarning: Rollup.WarningHandlerWithDefault = (
  warning,
  warn
) => {
  if (ignoredRollupWarningCodes.has(warning.code ?? "")) {
    return
  }

  warn(warning)
}

const routerConfig = {
  routeFileIgnorePattern: "\\.js$",
} satisfies Partial<RouterPluginConfig>

const museumDependencies = [
  "three",
  "three/addons/environments/RoomEnvironment.js",
  "three/addons/utils/BufferGeometryUtils.js",
  "@react-three/fiber",
  "@react-three/drei",
  "zustand",
]

// portless puts the dev server behind an HTTPS/2 proxy that keeps dropping the
// HMR WebSocket, which reloads the page. Connect HMR straight to Vite instead;
// portless passes the port it picked in PORT.
const directHmrPort = Number(process.env.PORT) || undefined

const config = defineConfig({
  server: {
    hmr: directHmrPort
      ? { protocol: "ws", host: "127.0.0.1", clientPort: directHmrPort }
      : undefined,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  optimizeDeps: {
    include: museumDependencies,
  },
  build: {
    rollupOptions: {
      onwarn: handleRollupWarning,
    },
  },
  plugins: [
    // Builds the server for Cloudflare Workers (wrangler.jsonc) and runs it in workerd in dev.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      router: routerConfig,
    }),
    viteReact(),
  ],
})

export default config
