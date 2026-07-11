import type { CardCache } from '../../cache/kv.js';
import { GitHubError } from '../../github/errors.js';
import type { TokenPool } from '../../github/token-pool.js';
import { renderFallbackCard } from '../../render/fallback.js';
import { etagMatches, notModified, svgResponse } from '../../render/response.js';
import { resolveTheme, type Theme } from '../../themes/index.js';
import { fetchUserStats } from './fetch.js';
import {
  ParamError,
  parseStatsParams,
  statsCacheKey,
  type StatsParams,
} from './params.js';
import { renderStatsCard } from './render.js';
import { transformStats } from './transform.js';

export interface StatsDeps {
  pool: TokenPool;
  cache: CardCache;
  cacheSeconds: number;
  staleSeconds: number;
  timeoutMs: number;
  /** Register background work (Workers ctx.waitUntil). */
  waitUntil: (p: Promise<unknown>) => void;
}

/** Produce the stats SVG end-to-end: fetch -> transform -> render. */
async function buildStatsSvg(
  params: StatsParams,
  theme: Theme,
  deps: StatsDeps,
): Promise<string> {
  const raw = await fetchUserStats(
    deps.pool,
    params.username,
    { countPrivate: params.countPrivate },
    deps.timeoutMs,
  );
  const model = transformStats(raw, {
    title: params.title,
    show: params.show,
    hide: params.hide,
    showIcons: params.showIcons,
    hideRank: params.hideRank,
  });
  return renderStatsCard(model, theme, {
    hideBorder: params.hideBorder,
    borderRadius: params.borderRadius,
  });
}

/**
 * Handle GET /api/stats. Wrapped so EVERY path returns valid SVG at HTTP 200:
 * fresh cache, stale-while-revalidate, live render, or fallback on any error.
 * The one thing we never do is return a broken image.
 */
export async function handleStats(request: Request, deps: StatsDeps): Promise<Response> {
  let theme: Theme = resolveTheme('default');
  try {
    const url = new URL(request.url);
    const params = parseStatsParams(url.searchParams);
    theme = resolveTheme(params.theme, params.overrides);
    const key = statsCacheKey(params);

    const { entry, freshness } = await deps.cache.get(
      key,
      deps.cacheSeconds,
      deps.staleSeconds,
    );

    if (entry && freshness === 'fresh') {
      if (etagMatches(request, entry)) return notModified(entry.etag);
      return svgResponse(entry, { maxAge: deps.cacheSeconds });
    }

    if (entry && freshness === 'stale') {
      // Serve stale immediately, revalidate in the background.
      deps.waitUntil(revalidate(params, theme, key, deps));
      return svgResponse(entry, { maxAge: 60 });
    }

    // Miss: render live, cache, respond.
    const svg = await buildStatsSvg(params, theme, deps);
    const stored = await deps.cache.put(key, svg);
    if (etagMatches(request, stored)) return notModified(stored.etag);
    return svgResponse(stored, { maxAge: deps.cacheSeconds });
  } catch (err) {
    return errorResponse(err, theme);
  }
}

/** Background refresh; failures are swallowed (we already served stale). */
async function revalidate(
  params: StatsParams,
  theme: Theme,
  key: string,
  deps: StatsDeps,
): Promise<void> {
  try {
    const svg = await buildStatsSvg(params, theme, deps);
    await deps.cache.put(key, svg);
  } catch {
    // Intentionally ignored: stale card is already on the user's profile.
  }
}

/** Map any error to a fallback card. Always 200, always valid SVG. */
function errorResponse(err: unknown, theme: Theme): Response {
  const message = fallbackMessage(err);
  const svg = renderFallbackCard(message, theme);
  return svgResponse({ svg, etag: 'W/"fallback"' }, { maxAge: 60, status: 200 });
}

function fallbackMessage(err: unknown): string {
  if (err instanceof ParamError) return err.message;
  if (err instanceof GitHubError) {
    switch (err.kind) {
      case 'not_found':
        return 'That GitHub user could not be found.';
      case 'rate_limited':
        return 'GitHub rate limit reached — showing again shortly.';
      case 'timeout':
        return 'GitHub took too long to respond.';
      case 'auth':
        return 'Service is missing a valid GitHub token.';
      default:
        return 'Could not reach GitHub right now.';
    }
  }
  return 'Something went wrong rendering this card.';
}
