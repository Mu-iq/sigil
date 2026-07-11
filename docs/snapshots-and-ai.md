# Historical snapshots, trends & the AI summary

These are sigil's signature, differentiating features. They're **optional** — the
core cards work without them — but they unlock cards no other tool offers.

## How it works

A scheduled job (Workers Cron Trigger, every 6h by default) runs `scheduled()`:

1. Lists **tracked users** — anyone whose card was requested in the last 30 days
   (recorded in KV under a `track:` prefix, off the request path via
   `waitUntil`, so it never slows a render).
2. For each user, fetches current stats and writes a **snapshot** row to D1
   (`snapshots(username, captured_at, stars, commits, contributions, followers,
metrics_json)`).
3. If an AI provider is configured, generates a short **developer summary** and
   stores it in D1 (`summaries`).

Trend and summary cards then read from D1 — the AI provider is **never** called
on the request path (cost + latency).

## 1. Enable historical snapshots (D1)

```bash
wrangler d1 create sigil
# paste the printed database_id into wrangler.toml under [[d1_databases]]
wrangler d1 migrations apply DB --local     # for local dev
wrangler d1 migrations apply DB --remote    # for production
```

The cron trigger is already declared in `wrangler.toml` (`crons = ["0 */6 * * *"]`).
Without D1 configured, `scheduled()` is a no-op and the trend/summary cards show
a friendly "collecting data" / "not available yet" state (still valid SVG).

Trend cards need at least two snapshots on different days before they draw a
line — so a fresh instance shows the collecting state for the first day or two.

### Trend card (`/api/trends`)

| Param    | Default         | Description                                                        |
| -------- | --------------- | ------------------------------------------------------------------ |
| `metric` | `contributions` | `stars`, `commits`, `contributions`, `followers`, `prs`, `issues`. |
| `days`   | `90`            | Look-back window (7–730).                                          |

Standard `theme` / `hide_border` / `border_radius` / `title` params also apply.

## 2. Enable the AI developer summary (optional, OFF by default)

> The AI summary is **entirely opt-in**. The core service and every other card
> work with **no AI configuration at all**. Nothing AI-related runs — no cron
> work, no cost, no external dependency — unless you turn it on. When off,
> `/api/summary` returns a clean "AI summary is not enabled for this instance"
> card (never an error, never a broken image).

The summary is a one-to-two sentence, flattering-but-honest blurb derived from
public signals (stats + top languages). It's generated on the schedule and
served from store — **never called on the request path**.

It activates only when **both** are true: `ENABLE_AI_SUMMARY = "true"` **and**
the selected provider is configured.

### Option A — Cloudflare Workers AI (recommended, no external key)

The cheapest path: it runs on your own Cloudflare account, so there's **no
external API key** and no third-party dependency.

```toml
# wrangler.toml
[vars]
ENABLE_AI_SUMMARY = "true"
AI_PROVIDER = "workers-ai"
AI_MODEL = "@cf/meta/llama-3.1-8b-instruct"   # any Workers AI text model

# Uncomment the Workers AI binding:
[ai]
binding = "AI"
```

That's it — no secret to set.

### Option B — Anthropic or OpenAI (external key)

```toml
# wrangler.toml [vars]
ENABLE_AI_SUMMARY = "true"
AI_PROVIDER = "anthropic"          # or "openai"
AI_MODEL = "claude-haiku-4-5"      # or "claude-opus-4-8" for higher quality
```

```bash
wrangler secret put AI_API_KEY     # required for anthropic / openai
```

**Providers are pluggable** — `workers-ai`, `anthropic` (Claude Messages API),
and `openai` (Chat Completions) are built in behind a small `AiProvider`
interface; add more in [`src/ai/provider.ts`](../src/ai/provider.ts).

**Cost implications.** One short completion per tracked user per cron run
(≤ ~160 output tokens). At the default 6-hour cadence that's 4 calls/user/day.
Workers AI is billed on your Cloudflare plan (free-tier allowances apply);
Anthropic Haiku is fractions of a cent per user per day; a frontier model is
higher. To reduce cost: raise the cron interval, pick a cheaper `AI_MODEL`, or
set `ENABLE_AI_SUMMARY = "false"` to disable entirely.

**Safety.** The prompt instructs the model to stay factual and public-safe; the
output is length-capped, control-char stripped, and XML-escaped before render.
A provider refusal or failure simply leaves the previous summary in place.

### Summary card (`/api/summary`)

```md
![Dev summary](https://<your-instance>.workers.dev/api/summary?username=Mu-iq&theme=tokyonight)
```

Standard `theme` / `hide_border` / `border_radius` / `title` params apply. Until
a summary has been generated, the card shows a neutral waiting message.

## 3. Wrapped / Year-in-Review (`/api/wrapped`)

Wrapped is derived live (it doesn't require snapshots): total contributions,
active days, busiest month, best day, longest streak, and signature language for
a given `year`.

| Param  | Default      | Description                       |
| ------ | ------------ | --------------------------------- |
| `year` | current year | Year to summarize (2008–current). |

## Controlling who gets snapshotted

Only users whose cards are actually requested get tracked, and tracking entries
expire after 30 days of inactivity — so the job never fans out to the whole
world. Reduce `MAX_USERS_PER_RUN` in
[`src/cron/scheduled.ts`](../src/cron/scheduled.ts) to cap work per run further.
