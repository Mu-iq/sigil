import type { TokenPool } from '../../github/token-pool.js';
import { type Theme, resolveTheme } from '../../themes/index.js';
import { paramErrorResponse, renderCardResponse, type CardDeps } from '../pipeline.js';
import { fetchUserStats } from './fetch.js';
import { parseStatsParams, statsCacheKey, type StatsParams } from './params.js';
import { renderStatsCard } from './render.js';
import { transformStats } from './transform.js';

export interface StatsDeps extends CardDeps {
  pool: TokenPool;
  timeoutMs: number;
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

/** Handle GET /api/stats. Never returns a broken image (see renderCardResponse). */
export async function handleStats(request: Request, deps: StatsDeps): Promise<Response> {
  let params: StatsParams;
  try {
    const url = new URL(request.url);
    params = parseStatsParams(url.searchParams);
  } catch (err) {
    return paramErrorResponse(err);
  }
  const theme = resolveTheme(params.theme, params.overrides);
  const key = statsCacheKey(params);
  return renderCardResponse(request, deps, key, theme, () =>
    buildStatsSvg(params, theme, deps),
  );
}
