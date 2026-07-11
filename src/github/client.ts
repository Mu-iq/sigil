import { GitHubError, NoTokensError } from './errors.js';
import type { TokenPool } from './token-pool.js';

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ type?: string; message: string }>;
}

interface ClientOptions {
  timeoutMs: number;
  /** Max distinct tokens to try before giving up on a transient failure. */
  maxAttempts?: number;
}

/**
 * Execute a GraphQL query through the token pool. Rotates to the next token on
 * rate-limit or auth failure and retries transient upstream errors. Bounds each
 * network call with an AbortController so a hung upstream can't exceed budget.
 *
 * Tokens are never logged. Callers get a typed GitHubError on failure and must
 * fall back to cache/fallback card — never propagate a broken image.
 */
export async function graphql<T>(
  pool: TokenPool,
  query: string,
  variables: Record<string, unknown>,
  { timeoutMs, maxAttempts }: ClientOptions,
): Promise<T> {
  if (pool.size === 0) throw new NoTokensError();
  const attempts = Math.min(maxAttempts ?? pool.size, Math.max(pool.size, 1));

  let lastError: GitHubError = new GitHubError('unknown upstream failure', 'upstream');

  for (let attempt = 0; attempt < attempts; attempt++) {
    const state = pool.next();
    if (!state) throw new NoTokensError();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `bearer ${state.token}`,
          'Content-Type': 'application/json',
          // GitHub requires a UA; identifies the service, contains no secrets.
          'User-Agent': 'sigil-github-stats',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      // Surface rate-limit headers back to the pool regardless of status.
      const remaining = num(res.headers.get('x-ratelimit-remaining'));
      const reset = num(res.headers.get('x-ratelimit-reset'));
      pool.report(state.token, remaining, reset === null ? null : reset * 1000);

      if (res.status === 401 || res.status === 403) {
        lastError = new GitHubError(
          `auth/rate-limit (HTTP ${res.status})`,
          remaining === 0 ? 'rate_limited' : 'auth',
        );
        continue; // try next token
      }
      if (res.status >= 500) {
        lastError = new GitHubError(`upstream HTTP ${res.status}`, 'upstream');
        continue;
      }
      if (!res.ok) {
        throw new GitHubError(`unexpected HTTP ${res.status}`, 'upstream');
      }

      const body = (await res.json()) as GraphQLResponse<T>;
      if (body.errors && body.errors.length > 0) {
        const rateLimited = body.errors.some((e) => e.type === 'RATE_LIMITED');
        const notFound = body.errors.some((e) => e.type === 'NOT_FOUND');
        if (notFound) throw new GitHubError('user not found', 'not_found');
        if (rateLimited) {
          lastError = new GitHubError('rate limited', 'rate_limited');
          continue;
        }
        throw new GitHubError(body.errors[0]!.message, 'upstream');
      }
      if (!body.data) throw new GitHubError('empty GraphQL response', 'upstream');
      return body.data;
    } catch (err) {
      if (err instanceof GitHubError) {
        if (err.kind === 'not_found') throw err; // no point retrying
        lastError = err;
        continue;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new GitHubError('github request timed out', 'timeout');
        continue;
      }
      lastError = new GitHubError('network failure', 'upstream');
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function num(raw: string | null): number | null {
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
