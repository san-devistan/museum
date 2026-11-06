# Repository Guide

A pnpm monorepo for `museum`. Follow the patterns already here before
introducing new ones.

## How It Fits Together

- `packages/ui`: the design system, source of truth for tokens and web
  components.
- `packages/backend`: the Convex backend, home of data, business logic, and
  provider integrations added as Convex components.
- `apps/web`: TanStack Start app that uses `packages/ui` components and tokens
  plus `packages/backend`.
- `scripts`: repo tooling such as the quality gate.

Logic belongs in the backend; the web app focuses on presentation. Design
starts in `packages/ui` and flows to the web app. Each workspace has its own
`AGENTS.md` with the details.

## Local Development

The web dev server keeps a stable URL: `https://museum.localhost`.

Logs live in the attached Zellij session whose name contains `museum`.

## Providers and Tools

External services (Convex, Cloudflare, Stripe, Better Auth, shadcn) are reached
through their MCP when configured (see `.codex/config.toml`), otherwise through
their CLI if installed. Check what is available rather than assuming it. If the
MCP or CLI is available but not authenticated, authenticate it before using it.

## Module Layout

Group files by domain or workflow first, not by role (no top-level
`components/`, `hooks/`, `utils/` piles). Inside a domain folder, split by role
only once it has enough files:

- `_components/`: private UI
- `_hooks/`: private hooks
- `_lib/`: state, actions, adapters, domain logic
- `_pages/`: route or screen compositions
- `_types/`: shared types large enough for their own file
- `_utils/`: last resort for small reused pure helpers; prefer named domain
  files

## Quality Gate

Run `pnpm fix` before handing off. Fix what your change caused by fixing the
implementation, not by dodging rules or editing the gate config unless really
needed, and mention anything unrelated that still fails.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.

<!-- END:turborepo-agent-rules -->
