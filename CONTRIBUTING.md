# Contributing to sigil

Thanks for your interest! sigil is a TypeScript service on Cloudflare Workers
that renders SVG stat cards for GitHub profiles.

## Getting started

```bash
pnpm install
pnpm dev          # local instance (wrangler dev)
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit (+ action)
pnpm lint         # eslint + prettier check
```

For local dev, copy `.dev.vars.example` to `.dev.vars` and add a GitHub token.

## Ground rules

- **Never return a broken image.** Every response on every code path must be
  valid SVG at HTTP 200 — on upstream failure, serve stale/fallback. New paths
  must uphold this.
- **Layers stay separated:** `fetch` (I/O) → `transform` (pure, unit-tested) →
  `render` (SVG). Put logic/math in `transform` and test it.
- **Escape all user-derived text** before embedding it in SVG.
- **One theme system.** Cards read colors from the resolved `theme` object; no
  card hardcodes its own colors.
- Keep it green: types, lint, and tests must pass. Add a test with any bug fix.

## Pull requests

Small, focused PRs are easiest to review. Describe what changed and why, and
update docs when a change is user-facing. Snapshots are updated deliberately
(`pnpm test -- -u`) — review the diff, don't regenerate blindly.
