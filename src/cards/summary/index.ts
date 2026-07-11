import { resolveTheme, type Theme } from '../../themes/index.js';
import type { SnapshotStore } from '../../snapshots/store.js';
import { paramErrorResponse, renderCardResponse, type CardDeps } from '../pipeline.js';
import { parseSummaryParams, summaryCacheKey, type SummaryParams } from './params.js';
import { renderSummaryCard } from './render.js';

export interface SummaryDeps extends CardDeps {
  /** Historical store (holds precomputed summaries), or null without D1. */
  store: SnapshotStore | null;
}

async function buildSummarySvg(
  params: SummaryParams,
  theme: Theme,
  deps: SummaryDeps,
): Promise<string> {
  const stored = deps.store ? await deps.store.getSummary(params.username) : null;
  return renderSummaryCard(stored?.summary ?? null, theme, {
    title: params.title ?? `${params.username}'s Dev Summary`,
    hideBorder: params.hideBorder,
    borderRadius: params.borderRadius,
  });
}

/**
 * Handle GET /api/summary. Served entirely from the precomputed store — the AI
 * provider is NEVER called on the request path. Never returns a broken image.
 */
export async function handleSummary(
  request: Request,
  deps: SummaryDeps,
): Promise<Response> {
  let params: SummaryParams;
  try {
    params = parseSummaryParams(new URL(request.url).searchParams);
  } catch (err) {
    return paramErrorResponse(err);
  }
  const theme = resolveTheme(params.theme, params.overrides);
  const key = summaryCacheKey(params);
  return renderCardResponse(request, deps, key, theme, () =>
    buildSummarySvg(params, theme, deps),
  );
}
