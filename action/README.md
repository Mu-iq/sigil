# sigil — GitHub Action deploy mode

Render your sigil cards as **static `.svg` files committed to your profile repo**
on a schedule. This is the second of sigil's two deploy modes (the other is a
[self-hosted Worker](../docs/self-hosting.md)).

**Why use it:** there's no live service at render time, so the cards **can never
break** — no rate limits, no downtime, no cold starts. The trade-off is refresh
cadence: cards update on the workflow schedule, not on every profile view.

## Setup

1. Copy [`example-workflow.yml`](example-workflow.yml) to
   `.github/workflows/sigil.yml` in your `<username>/<username>` profile repo (or
   any repo), and adjust the env vars.
2. It renders on a schedule and commits the SVGs. Reference them in your README:

   ```md
   ![Stats](sigil/stats.svg)
   ![Top languages](sigil/languages.svg)
   ```

## Configuration (env vars)

| Var                | Default                     | Description                                              |
| ------------------ | --------------------------- | -------------------------------------------------------- |
| `SIGIL_USERNAME`   | _(required)_                | GitHub login to render.                                  |
| `GITHUB_TOKEN`     | _(required)_                | Token; `GH_TOKEN` / `PAT_1` also accepted. Use a PAT with `repo` for private stats. |
| `SIGIL_CARDS`      | `stats,languages,streak,activity` | Comma list: `stats`, `languages`, `streak`, `activity`, `wrapped`. |
| `SIGIL_THEME`      | `default`                   | Any built-in theme name.                                 |
| `SIGIL_OUT`        | `sigil-cards`               | Output directory for the `.svg` files.                   |
| `SIGIL_TZ`         | `UTC`                       | Timezone for the streak card's day boundaries.           |
| `SIGIL_LANG_LAYOUT`| `compact`                   | Languages layout: `normal`, `compact`, `donut`.          |
| `SIGIL_TIMEOUT_MS` | `10000`                     | Per-GitHub-call timeout.                                 |

Only live-data cards are available in Action mode. `trends` and `summary` require
the snapshot/AI pipeline and are Worker-only.

## Run locally

```bash
pnpm install
SIGIL_USERNAME=Mu-iq GH_TOKEN=ghp_xxx SIGIL_THEME=dracula npx tsx action/render.ts
# writes sigil-cards/*.svg
```

## Never-broken-image guarantee

If any card fails to render (bad token, GitHub hiccup), the Action writes a valid
"could not render" fallback SVG for that card rather than a partial or empty file
— the same invariant the live Worker upholds.
