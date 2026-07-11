import type { TokenPool } from '../../github/token-pool.js';
import { resolveTheme, type Theme } from '../../themes/index.js';
import { paramErrorResponse, renderCardResponse, type CardDeps } from '../pipeline.js';
import { fetchWrappedData } from './fetch.js';
import { parseWrappedParams, wrappedCacheKey, type WrappedParams } from './params.js';
import { renderWrappedCard } from './render.js';
import { transformWrapped } from './transform.js';

export interface WrappedDeps extends CardDeps {
  pool: TokenPool;
  timeoutMs: number;
}

async function buildWrappedSvg(
  params: WrappedParams,
  theme: Theme,
  deps: WrappedDeps,
): Promise<string> {
  const data = await fetchWrappedData(
    deps.pool,
    params.username,
    params.year,
    deps.timeoutMs,
  );
  const model = transformWrapped(data);
  return renderWrappedCard(model, theme, {
    login: params.username,
    hideBorder: params.hideBorder,
    borderRadius: params.borderRadius,
    width: params.cardWidth,
  });
}

/** Handle GET /api/wrapped. Never returns a broken image. */
export async function handleWrapped(
  request: Request,
  deps: WrappedDeps,
): Promise<Response> {
  let params: WrappedParams;
  try {
    params = parseWrappedParams(new URL(request.url).searchParams);
  } catch (err) {
    return paramErrorResponse(err);
  }
  const theme = resolveTheme(params.theme, params.overrides);
  const key = wrappedCacheKey(params);
  return renderCardResponse(request, deps, key, theme, () =>
    buildWrappedSvg(params, theme, deps),
  );
}
