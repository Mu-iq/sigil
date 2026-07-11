# sigil

Dynamically generated, always-reliable **SVG stat cards** for your GitHub
profile README — stats, streaks, languages, activity, trends, and more, with one
consistent theme system. Self-hostable on the edge (Cloudflare Workers).

> **Status: M2 (done).** Stats, top-languages, streak (tz-aware), and activity
> cards; the theme library; token pool; KV caching; and the never-broken-image
> fallback are all in place and runnable. Trends, wrapped, AI summary, and the
> visual configurator land in M3–M4 — see [Roadmap](#roadmap).

---

## Why sigil

Most profile-card tools are fragmented across three services, share a global
rate limit that constantly breaks, and — worst of all — render a **broken-image
icon** on your profile when they fail. sigil is built against exactly those
failure modes:

- **Never a broken image.** Every response is valid SVG at HTTP 200 — even on
  upstream error, timeout, or a missing token. On failure it serves the last
  good cached card, or a clean "temporarily unavailable" card. Never a broken
  `<img>`.
- **Reliable by design.** Multi-token rotation + edge KV cache +
  stale-while-revalidate mean self-hosters effectively never hit GitHub's
  ~5,000 points/hour/token limit.
- **Correct numbers.** Star totals and language stats **paginate all repos**
  instead of stopping at the first 100.
- **One consistent design** across every card type.

---

## Quick start (hosted usage)

Add this to your profile `README.md` (replace `username`):

```md
![My GitHub stats](https://<your-instance>.workers.dev/api/stats?username=Mu-iq&theme=default)
```

There is no shared public instance yet — self-host your own in a couple of
minutes (below). This keeps your rate limit yours and your private stats
private.

### Stats card options

| Param           | Default   | Description                                                                       |
| --------------- | --------- | --------------------------------------------------------------------------------- |
| `username`      | _(req'd)_ | GitHub login to render.                                                           |
| `theme`         | `default` | Built-in theme name (see [Themes](#themes)).                                      |
| `show`          | _(all)_   | Comma list to show, in order: `stars,commits,prs,issues,contributions,followers`. |
| `hide`          | –         | Comma list of the same keys to hide.                                              |
| `show_icons`    | `true`    | Show the per-stat icons.                                                          |
| `count_private` | `false`   | Include private (restricted) contributions in the commit total.\*                 |
| `hide_rank`     | `false`   | Hide the rank/percentile ring.                                                    |
| `hide_border`   | `false`   | Hide the card border.                                                             |
| `border_radius` | `8`       | Corner radius (0–24).                                                             |
| `title`         | –         | Custom card title (max 60 chars).                                                 |

\* Private counts require a token that can see them (see self-hosting).

### Top languages card (`/api/languages`)

Paginates **all** your owned non-fork repos (no 100-repo cap) and aggregates
language bytes across them.

```md
![Top languages](https://<your-instance>.workers.dev/api/languages?username=Mu-iq&layout=donut&theme=tokyonight)
```

| Param             | Default   | Description                                                             |
| ----------------- | --------- | ----------------------------------------------------------------------- |
| `username`        | _(req'd)_ | GitHub login to render.                                                 |
| `theme`           | `default` | Built-in theme name (see [Themes](#themes)).                            |
| `layout`          | `normal`  | `normal` (bars), `compact` (stacked bar + legend), or `donut` (ring).   |
| `weight`          | `size`    | `size` weights by bytes; `count` weights by number of repos.            |
| `langs_count`     | `6`       | Max languages before the rest collapse into "Other" (1–12).             |
| `hide`            | –         | Comma list of language names to hide (e.g. `hide=html,css`).            |
| `exclude_repo`    | –         | Comma list of repo names to exclude from the aggregate.                 |
| `include_private` | `false`   | Include private repos' languages (needs a token that can see them).\*\* |
| `hide_border`     | `false`   | Hide the card border.                                                   |
| `border_radius`   | `8`       | Corner radius (0–24).                                                   |
| `title`           | –         | Custom card title (max 60 chars).                                       |

\*\* Language stats reflect the bytes in _your own_ repos, not contributions to
others — a GitHub API limitation shared by every tool in this category.

### Streak card (`/api/streak`)

Current streak, longest streak, and total contributions — with **timezone-aware**
day boundaries and full multi-year history (not clipped to the last 12 months).

```md
![Streak](https://<your-instance>.workers.dev/api/streak?username=Mu-iq&tz=America/New_York&theme=dracula)
```

| Param           | Default   | Description                                                                    |
| --------------- | --------- | ------------------------------------------------------------------------------ |
| `username`      | _(req'd)_ | GitHub login to render.                                                        |
| `theme`         | `default` | Built-in theme name (see [Themes](#themes)).                                   |
| `tz`            | `UTC`     | IANA timezone for day boundaries (e.g. `America/New_York`). Alias: `timezone`. |
| `hide_border`   | `false`   | Hide the card border.                                                          |
| `border_radius` | `8`       | Corner radius (0–24).                                                          |

### Activity graph (`/api/activity`)

A hand-rendered area/line chart of daily contributions over a selectable window.

```md
![Activity](https://<your-instance>.workers.dev/api/activity?username=Mu-iq&days=60&theme=tokyonight)
```

| Param           | Default   | Description                                  |
| --------------- | --------- | -------------------------------------------- |
| `username`      | _(req'd)_ | GitHub login to render.                      |
| `theme`         | `default` | Built-in theme name (see [Themes](#themes)). |
| `days`          | `30`      | Window size in days (7–365).                 |
| `hide_border`   | `false`   | Hide the card border.                        |
| `border_radius` | `8`       | Corner radius (0–24).                        |
| `title`         | –         | Custom card title (max 60 chars).            |

### Themes

Built-in: `default`, `dark`, `light`, `github_dark`, `tokyonight`, `dracula`,
`gruvbox`, `catppuccin`, `radical`. One theme applies consistently across every
card.

**Custom theming** (all validated as hex; invalid values are ignored):
`title_color`, `text_color`, `muted_color`, `icon_color`, `border_color`,
`accent_color`, and `bg_color` — which accepts a solid hex, `transparent`, or a
gradient `angle,stopA,stopB` (e.g. `bg_color=35,0d1117,161b22`).

---

## Self-hosting

You need a free [Cloudflare](https://dash.cloudflare.com) account and at least
one GitHub Personal Access Token. Full walkthrough:
[docs/self-hosting.md](docs/self-hosting.md). Short version:

```bash
pnpm install

# 1. Create the KV namespace and paste its id into wrangler.toml
wrangler kv namespace create CARD_CACHE

# 2. Add one or more GitHub tokens as secrets (rotation across all of them)
wrangler secret put PAT_1
# wrangler secret put PAT_2   # optional, more tokens = more headroom

# 3. Deploy
pnpm deploy
```

For local development, copy `.dev.vars.example` to `.dev.vars`, drop in a token,
and run `pnpm dev`.

---

## How it works

A README image is fetched by **GitHub's Camo proxy**, not the viewer's browser.
That drives the core constraints:

- Output is a **single self-contained SVG** — no JS, no external image/CSS/font
  references (Camo strips them).
- The viewer's light/dark GitHub theme **cannot** be detected server-side; use a
  `transparent` background plus the documented `#gh-dark-mode-only` /
  `<picture>` pattern (coming in the docs as themes expand).

The request path: normalize params → check KV (serve fresh instantly; serve
stale + revalidate in the background) → else fetch GitHub GraphQL through the
token pool → compute derived metrics → render SVG → cache → respond. Every
handler is wrapped so any error still returns valid SVG.

### Layers

```
fetch (GitHub I/O)  →  transform (pure, tested)  →  render (SVG)
```

Business logic and math live in `transform` and are unit-tested; `fetch` and
`render` stay thin. Platform bindings (KV, env) sit behind small adapters so a
Vercel/Node port stays cheap.

---

## Limitations (honest)

- **Commits** currently reflect GitHub's ~last-year contribution window
  (`totalCommitContributions`). An all-time `include_all_commits` mode arrives
  in M2.
- **Language stats** reflect the bytes in _your own_ repos, not your
  contributions to others — a GitHub API limitation shared by every tool in this
  category.
- Rank/percentile is a documented **heuristic** (see
  [`src/cards/stats/rank.ts`](src/cards/stats/rank.ts)), not a claim about
  GitHub's true global distribution.

---

## Development

```bash
pnpm install
pnpm dev          # wrangler dev — local instance on :8787
pnpm test         # vitest (unit + SVG snapshot tests)
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint + prettier check
pnpm deploy       # wrangler deploy
```

The stack: TypeScript (strict) · Hono on Cloudflare Workers · KV hot cache ·
GitHub GraphQL v4 · Vitest. See [CLAUDE.md](../CLAUDE.md) for the engineering
invariants every change must uphold (chiefly: never return a broken image).

---

## Roadmap

- **M1 — MVP (done):** `/health`, `/api/stats`, theming foundation, token pool,
  KV cache + stale-while-revalidate, never-broken-image fallback.
- **M2 — Core cards + theming (done):** languages (paginated, 3 layouts),
  streak (tz-aware, multi-year), activity graph; expanded theme library +
  custom params; shared never-broken-image pipeline.
- **M3 — Signature features:** D1 historical snapshots + cron; trend cards;
  "Year in Review / Wrapped"; precomputed AI developer summary.
- **M4 — Adoption:** visual configurator with live preview + copy snippets;
  GitHub Action deploy mode (commits static SVGs); polished docs + one-click
  deploy.

---

## License

MIT.
