# Self-hosting sigil

sigil runs on the Cloudflare Workers free tier. This guide takes you from zero
to a deployed instance rendering your real stats.

## 1. Prerequisites

- A free [Cloudflare account](https://dash.cloudflare.com/sign-up).
- Node 20+ and `pnpm` (`npm i -g pnpm`).
- At least one **GitHub Personal Access Token** (see scopes below).

## 2. GitHub token scopes

Create a token at <https://github.com/settings/tokens>.

- **Public stats only:** a classic token with `read:user`, or a fine-grained
  token with read access to your public data, is enough.
- **Private contribution counts (`count_private=true`):** the token must belong
  to the user being rendered and include `repo` (classic) or the equivalent
  fine-grained repository read scopes. GitHub only exposes restricted
  contributions to the owning user's own token.

Add more tokens (`PAT_2`, `PAT_3`, …) to spread load. sigil rotates across all
configured tokens and skips ones it believes are rate-limited, so more tokens =
more headroom against the ~5,000 GraphQL points/hour **per token** limit.

Tokens are **secrets** — never commit them. They live only in Wrangler secrets
(prod) or `.dev.vars` (local, git-ignored), and are redacted from all logs.

## 3. Create the KV namespace

The hot cache stores each rendered card (SVG + ETag + timestamp).

```bash
wrangler kv namespace create CARD_CACHE
wrangler kv namespace create CARD_CACHE --preview
```

Copy the printed `id` and `preview_id` into `wrangler.toml` under the
`[[kv_namespaces]]` block, replacing the `REPLACE_WITH_...` placeholders.

## 4. Set your tokens

```bash
wrangler secret put PAT_1
# paste the token when prompted
wrangler secret put PAT_2   # optional
```

## 5. Configuration vars

Non-secret tuning lives in `wrangler.toml [vars]`:

| Var                 | Default | Meaning                                                       |
| ------------------- | ------- | ------------------------------------------------------------- |
| `CACHE_SECONDS`     | `21600` | How long a rendered card is considered fresh (6h).            |
| `STALE_SECONDS`     | `86400` | How long a stale card may be served while it refreshes (24h). |
| `GITHUB_TIMEOUT_MS` | `8000`  | Per-request budget for a GitHub call before falling back.     |

## 6. Deploy

```bash
pnpm install
pnpm deploy
```

Wrangler prints your `https://sigil.<subdomain>.workers.dev` URL. Verify:

```bash
curl https://sigil.<subdomain>.workers.dev/health
# {"ok":true,"service":"sigil","tokensConfigured":1,...}
```

Then drop the card into your README:

```md
![My GitHub stats](https://sigil.<subdomain>.workers.dev/api/stats?username=YOURNAME)
```

## 7. Local development

```bash
cp .dev.vars.example .dev.vars   # then edit in a real PAT_1
pnpm dev                          # serves on http://127.0.0.1:8787
```

`wrangler dev` uses a local KV simulation, so you don't need the real namespace
id to develop. With no token configured, `/api/stats` still returns a valid
"temporarily unavailable" SVG (HTTP 200) — the never-broken-image guarantee.

## Troubleshooting

- **Card shows "missing a valid GitHub token":** no `PAT_1` secret is set (prod)
  or `.dev.vars` is missing (local).
- **Card shows "rate limit reached":** add more tokens; the cache normally keeps
  you well under the limit, so this usually means an uncached burst.
- **Private commits show as 0 with `count_private=true`:** the token isn't the
  rendered user's own token, or lacks `repo` scope.
