# Web App

TanStack Start app (Router + Query). It owns routes, loaders, and screen
composition; data and logic come from `@workspace/backend`.

It runs on Cloudflare Workers (`wrangler.jsonc`), in dev too: the server code
runs in `workerd`, so it uses Web APIs and `nodejs_compat`, not a Node server.
`pnpm run deploy` builds it into `dist/` and deploys it with Wrangler;
`public/_headers` sets the static assets' caching. The Worker's entry is
`src/server.ts`: TanStack Start, plus the MP3s served in byte ranges (static
assets answer a `Range` request with the whole file, and Chrome then can't seek
the audio, so the narration couldn't resume), so `/assets/*.mp3` runs the
Worker first.

## UI

Screens are built from `@workspace/ui`. When something is missing, it usually
belongs in `packages/ui` rather than in the app.

## Effect

Effect makes errors, dependencies, and side effects explicit in types. Use it
where those matter, such as backend calls, server functions, retries, and
concurrent work; keep plain UI code plain. Before writing Effect code, read
`node_modules/effect/AGENTS.md`.
