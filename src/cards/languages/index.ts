import type { TokenPool } from '../../github/token-pool.js';
import { resolveTheme, type Theme } from '../../themes/index.js';
import { paramErrorResponse, renderCardResponse, type CardDeps } from '../pipeline.js';
import { fetchUserLanguages } from './fetch.js';
import {
  languagesCacheKey,
  parseLanguagesParams,
  type LanguagesParams,
} from './params.js';
import { renderLanguagesCard } from './render.js';
import { transformLanguages } from './transform.js';

export interface LanguagesDeps extends CardDeps {
  pool: TokenPool;
  timeoutMs: number;
}

async function buildLanguagesSvg(
  params: LanguagesParams,
  theme: Theme,
  deps: LanguagesDeps,
): Promise<string> {
  const data = await fetchUserLanguages(
    deps.pool,
    params.username,
    { includePrivate: params.includePrivate },
    deps.timeoutMs,
  );
  const model = transformLanguages(data, {
    weight: params.weight,
    langsCount: params.langsCount,
    excludeRepos: params.excludeRepos,
    hideLanguages: params.hideLanguages,
  });
  return renderLanguagesCard(model, theme, {
    layout: params.layout,
    title: params.title ?? `${params.username}'s Top Languages`,
    hideBorder: params.hideBorder,
    borderRadius: params.borderRadius,
    width: params.cardWidth,
    langColors: params.langColors,
  });
}

/** Handle GET /api/languages. Never returns a broken image. */
export async function handleLanguages(
  request: Request,
  deps: LanguagesDeps,
): Promise<Response> {
  let params: LanguagesParams;
  try {
    params = parseLanguagesParams(new URL(request.url).searchParams);
  } catch (err) {
    return paramErrorResponse(err);
  }
  const theme = resolveTheme(params.theme, params.overrides);
  const key = languagesCacheKey(params);
  return renderCardResponse(request, deps, key, theme, () =>
    buildLanguagesSvg(params, theme, deps),
  );
}
