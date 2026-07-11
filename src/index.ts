import { Hono } from 'hono';
import { handleActivity } from './cards/activity/index.js';
import { handleLanguages } from './cards/languages/index.js';
import { handleStats } from './cards/stats/index.js';
import { handleStreak } from './cards/streak/index.js';
import { KvCardCache } from './cache/kv.js';
import { collectTokens, intVar, type Env } from './env.js';
import { TokenPool } from './github/token-pool.js';
import { renderFallbackCard } from './render/fallback.js';
import { svgResponse } from './render/response.js';

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => {
  const tokens = collectTokens(c.env as unknown as Record<string, unknown>);
  return c.json({
    ok: true,
    service: 'sigil',
    version: '0.2.0',
    tokensConfigured: tokens.length,
    time: new Date().toISOString(),
  });
});

app.get('/api/stats', async (c) => {
  const deps = buildCardDeps(c.env, (p) => c.executionCtx.waitUntil(p));
  return handleStats(c.req.raw, deps);
});

app.get('/api/languages', async (c) => {
  const deps = buildCardDeps(c.env, (p) => c.executionCtx.waitUntil(p));
  return handleLanguages(c.req.raw, deps);
});

app.get('/api/streak', async (c) => {
  const deps = buildCardDeps(c.env, (p) => c.executionCtx.waitUntil(p));
  return handleStreak(c.req.raw, deps);
});

app.get('/api/activity', async (c) => {
  const deps = buildCardDeps(c.env, (p) => c.executionCtx.waitUntil(p));
  return handleActivity(c.req.raw, deps);
});

app.get('/', (c) =>
  c.json({
    service: 'sigil',
    docs: 'https://github.com/Mu-iq/sigil',
    endpoints: [
      '/health',
      '/api/stats?username=<login>',
      '/api/languages?username=<login>',
      '/api/streak?username=<login>',
      '/api/activity?username=<login>',
    ],
  }),
);

// Absolute last-resort guard: even an unexpected framework-level error returns
// a valid SVG (the never-broken-image invariant), never a 500 broken image.
app.onError((_err, c) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/api/')) {
    const svg = renderFallbackCard('Something went wrong.');
    return svgResponse({ svg, etag: 'W/"fallback"' }, { maxAge: 60 });
  }
  return c.json({ ok: false, error: 'internal error' }, 500);
});

/** Build the shared per-request card dependencies (pool + cache + config). */
function buildCardDeps(env: Env, waitUntil: (p: Promise<unknown>) => void) {
  const tokens = collectTokens(env as unknown as Record<string, unknown>);
  return {
    pool: new TokenPool(tokens),
    cache: new KvCardCache(env.CARD_CACHE),
    cacheSeconds: intVar(env.CACHE_SECONDS, 21600),
    staleSeconds: intVar(env.STALE_SECONDS, 86400),
    timeoutMs: intVar(env.GITHUB_TIMEOUT_MS, 8000),
    waitUntil,
  };
}

export default app;
