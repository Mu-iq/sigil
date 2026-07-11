import type { TokenPool } from '../../github/token-pool.js';
import { resolveTheme, type Theme } from '../../themes/index.js';
import { paramErrorResponse, renderCardResponse, type CardDeps } from '../pipeline.js';
import { fetchUserActivity } from './fetch.js';
import { activityCacheKey, parseActivityParams, type ActivityParams } from './params.js';
import { renderActivityCard } from './render.js';
import { transformActivity } from './transform.js';

export interface ActivityDeps extends CardDeps {
  pool: TokenPool;
  timeoutMs: number;
}

async function buildActivitySvg(
  params: ActivityParams,
  theme: Theme,
  deps: ActivityDeps,
): Promise<string> {
  const data = await fetchUserActivity(
    deps.pool,
    params.username,
    params.days,
    deps.timeoutMs,
  );
  const model = transformActivity(data);
  return renderActivityCard(model, theme, {
    title: params.title ?? `${params.username}'s Contribution Activity`,
    hideBorder: params.hideBorder,
    borderRadius: params.borderRadius,
    width: params.cardWidth,
  });
}

/** Handle GET /api/activity. Never returns a broken image. */
export async function handleActivity(
  request: Request,
  deps: ActivityDeps,
): Promise<Response> {
  let params: ActivityParams;
  try {
    params = parseActivityParams(new URL(request.url).searchParams);
  } catch (err) {
    return paramErrorResponse(err);
  }
  const theme = resolveTheme(params.theme, params.overrides);
  const key = activityCacheKey(params);
  return renderCardResponse(request, deps, key, theme, () =>
    buildActivitySvg(params, theme, deps),
  );
}
