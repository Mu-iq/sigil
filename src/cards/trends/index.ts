import { resolveTheme, type Theme } from '../../themes/index.js';
import type { SnapshotStore } from '../../snapshots/store.js';
import { toDailySeries } from '../../snapshots/trends.js';
import { paramErrorResponse, renderCardResponse, type CardDeps } from '../pipeline.js';
import {
  METRIC_LABELS,
  parseTrendsParams,
  trendsCacheKey,
  type TrendsParams,
} from './params.js';
import { renderTrendsCard } from './render.js';

export interface TrendsDeps extends CardDeps {
  /** Historical store, or null when D1 isn't configured. */
  store: SnapshotStore | null;
}

async function buildTrendsSvg(
  params: TrendsParams,
  theme: Theme,
  deps: TrendsDeps,
): Promise<string> {
  const options = {
    title: params.title ?? `${params.username}'s ${METRIC_LABELS[params.metric]} Trend`,
    metricLabel: METRIC_LABELS[params.metric],
    hideBorder: params.hideBorder,
    borderRadius: params.borderRadius,
    width: params.cardWidth,
  };

  // No store -> render the "collecting" state (empty series). Still valid SVG.
  if (!deps.store) return renderTrendsCard([], theme, options);

  const sinceIso = new Date(Date.now() - params.rangeDays * 86400000).toISOString();
  const snapshots = await deps.store.getSnapshots(params.username, sinceIso);
  const series = toDailySeries(snapshots, params.metric);
  return renderTrendsCard(series, theme, options);
}

/** Handle GET /api/trends. Never returns a broken image. */
export async function handleTrends(
  request: Request,
  deps: TrendsDeps,
): Promise<Response> {
  let params: TrendsParams;
  try {
    params = parseTrendsParams(new URL(request.url).searchParams);
  } catch (err) {
    return paramErrorResponse(err);
  }
  const theme = resolveTheme(params.theme, params.overrides);
  const key = trendsCacheKey(params);
  return renderCardResponse(request, deps, key, theme, () =>
    buildTrendsSvg(params, theme, deps),
  );
}
