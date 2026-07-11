/**
 * Cloudflare Workers bindings + vars. Kept in one place so the core stays
 * runtime-agnostic: only adapters (cache, token pool) read from `Env`, and a
 * Node/Vercel port re-implements those adapters against its own config.
 */
export interface Env {
  /** Hot cache namespace for rendered cards. */
  CACHE: KVNamespace;

  /** Historical store for snapshots + precomputed AI summaries (optional). */
  DB?: D1Database;

  /** Cloudflare Workers AI binding — only present if the operator adds [ai]. */
  AI?: Ai;

  // --- vars (wrangler.toml [vars]) ---
  CACHE_SECONDS?: string;
  STALE_SECONDS?: string;
  GITHUB_TIMEOUT_MS?: string;
  /**
   * Master switch for the AI developer summary. The feature (and its scheduled
   * precompute) is OFF unless this is exactly "true" AND the selected provider's
   * requirements are met. Every other card works with no AI config at all.
   */
  ENABLE_AI_SUMMARY?: string;
  /** AI provider: "anthropic" | "openai" | "workers-ai". Ignored when disabled. */
  AI_PROVIDER?: string;
  AI_MODEL?: string;

  // --- secrets ---
  /** API key for anthropic/openai providers (scheduled job only; not needed for workers-ai). */
  AI_API_KEY?: string;

  // --- secrets (wrangler secret put) ---
  // GitHub PATs are discovered dynamically as PAT_1, PAT_2, ... so they are
  // not enumerated here; see collectTokens().
  [key: `PAT_${number}`]: string | undefined;
}

/**
 * Collect contiguous PAT_1, PAT_2, ... secrets from the environment. Stops at
 * the first missing index, so tokens must be numbered without gaps. An empty
 * pool is a valid (mis)configuration handled by the caller.
 */
export function collectTokens(env: Record<string, unknown>): string[] {
  const tokens: string[] = [];
  for (let i = 1; ; i++) {
    const val = env[`PAT_${i}`];
    if (typeof val !== 'string' || val.trim().length === 0) break;
    tokens.push(val.trim());
  }
  return tokens;
}

/** Parse an integer var with a fallback, guarding against NaN. */
export function intVar(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}
