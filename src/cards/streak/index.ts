import type { TokenPool } from '../../github/token-pool.js';
import { resolveTheme, type Theme } from '../../themes/index.js';
import { todayInTimeZone } from '../../util/date.js';
import { paramErrorResponse, renderCardResponse, type CardDeps } from '../pipeline.js';
import { fetchUserStreak } from './fetch.js';
import { parseStreakParams, streakCacheKey, type StreakParams } from './params.js';
import { renderStreakCard } from './render.js';
import { transformStreak } from './transform.js';

export interface StreakDeps extends CardDeps {
  pool: TokenPool;
  timeoutMs: number;
}

async function buildStreakSvg(
  params: StreakParams,
  theme: Theme,
  deps: StreakDeps,
): Promise<string> {
  const data = await fetchUserStreak(deps.pool, params.username, deps.timeoutMs);
  const today = todayInTimeZone(params.timeZone);
  const model = transformStreak(data, today);
  return renderStreakCard(model, theme, {
    hideBorder: params.hideBorder,
    borderRadius: params.borderRadius,
  });
}

/** Handle GET /api/streak. Never returns a broken image. */
export async function handleStreak(
  request: Request,
  deps: StreakDeps,
): Promise<Response> {
  let params: StreakParams;
  try {
    params = parseStreakParams(new URL(request.url).searchParams);
  } catch (err) {
    return paramErrorResponse(err);
  }
  const theme = resolveTheme(params.theme, params.overrides);
  const key = streakCacheKey(params);
  return renderCardResponse(request, deps, key, theme, () =>
    buildStreakSvg(params, theme, deps),
  );
}
