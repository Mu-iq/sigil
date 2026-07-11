import type { CardCache } from '../cache/kv.js';
import { GitHubError } from '../github/errors.js';
import { ParamError } from './params-error.js';
import { renderFallbackCard } from '../render/fallback.js';
import { etagMatches, notModified, svgResponse } from '../render/response.js';
import { resolveTheme, type Theme } from '../themes/index.js';

/** Shared request-path dependencies for any card endpoint. */
export interface CardDeps {
  cache: CardCache;
  cacheSeconds: number;
  staleSeconds: number;
  /** Register background work (Workers ctx.waitUntil). */
  waitUntil: (p: Promise<unknown>) => void;
}

/**
 * Run the full never-broken-image request lifecycle for a card:
 * fresh-cache → stale-while-revalidate → live render → fallback on any error.
 * Every path returns valid SVG at HTTP 200 (or a 304 for a matching ETag).
 *
 * `build` performs fetch → transform → render and may throw; `theme` is used to
 * style the fallback card so even failures stay on-brand.
 */
export async function renderCardResponse(
  request: Request,
  deps: CardDeps,
  key: string,
  theme: Theme,
  build: () => Promise<string>,
): Promise<Response> {
  try {
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
      deps.waitUntil(revalidate(deps, key, build));
      return svgResponse(entry, { maxAge: 60 });
    }

    const svg = await build();
    const stored = await deps.cache.put(key, svg);
    if (etagMatches(request, stored)) return notModified(stored.etag);
    return svgResponse(stored, { maxAge: deps.cacheSeconds });
  } catch (err) {
    const svg = renderFallbackCard(fallbackMessage(err), theme);
    return svgResponse({ svg, etag: 'W/"fallback"' }, { maxAge: 60 });
  }
}

/** Handle a thrown error before we even have a key/theme (e.g. bad params). */
export function paramErrorResponse(err: unknown): Response {
  const svg = renderFallbackCard(fallbackMessage(err), resolveTheme('default'));
  return svgResponse({ svg, etag: 'W/"fallback"' }, { maxAge: 60 });
}

async function revalidate(
  deps: CardDeps,
  key: string,
  build: () => Promise<string>,
): Promise<void> {
  try {
    const svg = await build();
    await deps.cache.put(key, svg);
  } catch {
    // Intentionally ignored: stale card is already on the user's profile.
  }
}

export function fallbackMessage(err: unknown): string {
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
