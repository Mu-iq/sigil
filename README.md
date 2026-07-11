# sigil

Dynamically generated, always-reliable **SVG stat cards** for your GitHub
profile README — stats, streaks, languages, activity, trends, and more, with one
consistent theme system. Self-hostable on the edge (Cloudflare Workers).

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Mu-iq/sigil)

Eight card types — **stats, top-languages, streak, activity, trends, wrapped**,
and an opt-in **AI developer summary** — all sharing one theme system, a token
pool, edge caching, and the never-broken-image guarantee.

**Build your card by clicking** — the
[visual configurator](https://sigil-configurator.pages.dev) gives a live
preview, theme picker, and copy-ready snippets ([source](configurator/)). Two
ways to ship: a [self-hosted Worker](docs/self-hosting.md) or a
[GitHub Action](action/) that commits static SVGs (cards that can never break).

## Live examples

Rendered live from a demo instance — one theme (`github_dark`) and one
`card_width` across every card, so they line up as a single dashboard:

<p align="center">
  <img src="https://sigil.muzamiltariq77s.workers.dev/api/stats?username=Mu-iq&theme=github_dark&card_width=450" alt="stats card" width="46%" />
  <img src="https://sigil.muzamiltariq77s.workers.dev/api/languages?username=Mu-iq&layout=donut&weight=count&theme=github_dark&card_width=450" alt="top languages card" width="46%" />
</p>
<p align="center">
  <img src="https://sigil.muzamiltariq77s.workers.dev/api/streak?username=Mu-iq&theme=github_dark&card_width=450" alt="streak card" width="46%" />
  <img src="https://sigil.muzamiltariq77s.workers.dev/api/activity?username=Mu-iq&theme=github_dark&card_width=450&days=60" alt="activity graph" width="46%" />
</p>

_(A shared demo instance — please self-host for your own profile so your rate
limit stays yours.)_

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

### How it compares

|                                               |     sigil      |  github-readme-stats   | streak-stats | activity-graph |
| --------------------------------------------- | :------------: | :--------------------: | :----------: | :------------: |
| Stats / languages / streak / activity         | ✅ one service |           ✅           | streak only  | activity only  |
| Never a broken image (valid SVG on failure)   |       ✅       | ⚠️ broken img on error |      ⚠️      |       ⚠️       |
| Paginated stars & languages (no 100-repo cap) |       ✅       |       ⚠️ partial       |      –       |       –        |
| Timezone-aware, multi-year streaks            |       ✅       |           –            | ⚠️ tz-naive  |       –        |
| Historical **trend** cards                    |       ✅       |           ❌           |      ❌      |       ❌       |
| **Wrapped** / Year-in-Review                  |       ✅       |           ❌           |      ❌      |       ❌       |
| **AI** developer summary                      |   ✅ opt-in    |           ❌           |      ❌      |       ❌       |
| One theme system across all cards             |       ✅       |        per-tool        |   per-tool   |    per-tool    |
| Token pool + edge cache + SWR                 |       ✅       |      single token      | single token |  single token  |
| Visual configurator                           |       ✅       |       community        |      ❌      |       ❌       |
| Static-SVG GitHub Action mode                 |       ✅       |           ❌           |      ❌      |       ❌       |

_Framed factually; the competing tools are good and inspired this one. The
GitHub API limits (per-token rate, own-repo language bytes) are real and apply
to everyone — sigil is built to handle them, not to pretend they don't exist._

---

## Quick start (hosted usage)

Add this to your profile `README.md` (replace `username`):

```md
![My GitHub stats](https://<your-instance>.workers.dev/api/stats?username=Mu-iq&theme=default)
```

There is no shared public instance yet — self-host your own in a couple of
minutes (below). This keeps your rate limit yours and your private stats
private.

### Shared parameters (every card)

These work on **all** card endpoints:

| Param           | Default   | Description                                                                                                                                            |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `username`      | _(req'd)_ | GitHub login to render.                                                                                                                                |
| `theme`         | `default` | Built-in theme name (see [Themes](#themes)) or custom colors.                                                                                          |
| `card_width`    | per-card  | Fixed card width in px, clamped 300–900. Set the **same** value on every card so they line up in a README grid (e.g. `card_width=450` for a 2×2 grid). |
| `hide_border`   | `false`   | Hide the card border.                                                                                                                                  |
| `border_radius` | `8`       | Corner radius (0–24).                                                                                                                                  |

The per-card options below are in addition to these.

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

| Param             | Default   | Description                                                                                                                                        |
| ----------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `username`        | _(req'd)_ | GitHub login to render.                                                                                                                            |
| `theme`           | `default` | Built-in theme name (see [Themes](#themes)).                                                                                                       |
| `layout`          | `normal`  | `normal` (bars), `compact` (stacked bar + legend), or `donut` (ring).                                                                              |
| `weight`          | `count`   | `count` = repos each language appears in (default; avoids one huge file skewing everything); `bytes` = raw code size; `hybrid` = blend of the two. |
| `langs_count`     | `6`       | Max languages before the rest collapse into "Other" (1–12).                                                                                        |
| `hide`            | –         | Comma list of language names to hide (e.g. `hide=html,css`).                                                                                       |
| `exclude_repo`    | –         | Comma list of repo names to exclude from the aggregate.                                                                                            |
| `include_private` | `false`   | Include private repos' languages (needs a token that can see them).\*\*                                                                            |
| `hide_border`     | `false`   | Hide the card border.                                                                                                                              |
| `border_radius`   | `8`       | Corner radius (0–24).                                                                                                                              |
| `title`           | –         | Custom card title (max 60 chars).                                                                                                                  |

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

### Signature cards (snapshots + AI)

sigil also offers cards **no other tool has**, powered by a scheduled snapshot
pipeline (Cloudflare D1 + cron):

- **`/api/trends`** — a metric (stars, commits, contributions, followers…)
  charted over time from historical snapshots.
- **`/api/wrapped`** — a shareable Year-in-Review (`year` param): total
  contributions, busiest month, best day, longest streak, signature language.
- **`/api/summary`** — an AI-generated one-to-two sentence developer blurb,
  **precomputed on the schedule** (never on the request path).

These are optional and self-hosted: see
[docs/snapshots-and-ai.md](docs/snapshots-and-ai.md) for D1 setup and the cron.

> **The AI summary is opt-in and OFF by default.** The core service and every
> other card work with **zero AI configuration** — no key, no cost, no
> dependency. Turn it on with `ENABLE_AI_SUMMARY = "true"` plus a provider.
> Providers are pluggable: **Cloudflare Workers AI** (recommended — no external
> key, runs on your own Cloudflare account), Anthropic, or OpenAI. While off,
> `/api/summary` just renders a clean "not enabled" card.

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
wrangler kv namespace create CACHE

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

## Contributing

Issues and PRs welcome. Local dev: `pnpm install`, `pnpm dev`, `pnpm test`. A
change should keep types (`pnpm typecheck`), lint (`pnpm lint`), and tests
(`pnpm test`) green, and must preserve the never-broken-image invariant on every
new path. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE).
