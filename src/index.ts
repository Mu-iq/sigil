import { Hono, type Context } from 'hono';
import { aiSummaryEnabled } from './ai/index.js';
import { handleActivity } from './cards/activity/index.js';
import { handleLanguages } from './cards/languages/index.js';
import { handleStats } from './cards/stats/index.js';
import { handleStreak } from './cards/streak/index.js';
import { handleSummary } from './cards/summary/index.js';
import { handleTrends } from './cards/trends/index.js';
import { handleWrapped } from './cards/wrapped/index.js';
import { KvCardCache } from './cache/kv.js';
import { handleScheduled } from './cron/scheduled.js';
import { collectTokens, intVar, type Env } from './env.js';
import { TokenPool } from './github/token-pool.js';
import { renderFallbackCard } from './render/fallback.js';
import { svgResponse } from './render/response.js';
import { UserRegistry } from './snapshots/registry.js';
import { D1SnapshotStore } from './snapshots/store.js';

type Ctx = { Bindings: Env };
const app = new Hono<Ctx>();

app.get('/health', (c) => {
  const tokens = collectTokens(c.env as unknown as Record<string, unknown>);
  return c.json({
    ok: true,
    service: 'sigil',
    version: '0.3.0',
    tokensConfigured: tokens.length,
    snapshotsEnabled: Boolean(c.env.DB),
    time: new Date().toISOString(),
  });
});

app.get('/api/stats', (c) => card(c, handleStats));
app.get('/api/languages', (c) => card(c, handleLanguages));
app.get('/api/streak', (c) => card(c, handleStreak));
app.get('/api/activity', (c) => card(c, handleActivity));
app.get('/api/wrapped', (c) => card(c, handleWrapped));

app.get('/api/trends', (c) => {
  const waitUntil = (p: Promise<unknown>) => c.executionCtx.waitUntil(p);
  trackRequest(c.env, c.req.raw, waitUntil);
  const base = buildCardDeps(c.env, waitUntil);
  const store = c.env.DB ? new D1SnapshotStore(c.env.DB) : null;
  return handleTrends(c.req.raw, { ...base, store });
});

app.get('/api/summary', (c) => {
  const waitUntil = (p: Promise<unknown>) => c.executionCtx.waitUntil(p);
  trackRequest(c.env, c.req.raw, waitUntil);
  const base = buildCardDeps(c.env, waitUntil);
  const store = c.env.DB ? new D1SnapshotStore(c.env.DB) : null;
  return handleSummary(c.req.raw, { ...base, store, aiEnabled: aiSummaryEnabled(c.env) });
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
      '/api/wrapped?username=<login>&year=<year>',
      '/api/trends?username=<login>&metric=<metric>',
      '/api/summary?username=<login>',
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

type CardHandler<D> = (req: Request, deps: D) => Promise<Response>;

/** Run a card handler, tracking the requested user in the background. */
function card(
  c: Context<Ctx>,
  handler: CardHandler<ReturnType<typeof buildCardDeps>>,
): Promise<Response> {
  const waitUntil = (p: Promise<unknown>) => c.executionCtx.waitUntil(p);
  trackRequest(c.env, c.req.raw, waitUntil);
  return handler(c.req.raw, buildCardDeps(c.env, waitUntil));
}

/** Record the requested username so the cron job knows whom to snapshot. */
function trackRequest(
  env: Env,
  req: Request,
  waitUntil: (p: Promise<unknown>) => void,
): void {
  const username = new URL(req.url).searchParams.get('username');
  if (username && /^[A-Za-z0-9-]{1,39}$/.test(username)) {
    waitUntil(new UserRegistry(env.CACHE).track(username));
  }
}

/** Build the shared per-request card dependencies (pool + cache + config). */
function buildCardDeps(env: Env, waitUntil: (p: Promise<unknown>) => void) {
  const tokens = collectTokens(env as unknown as Record<string, unknown>);
  return {
    pool: new TokenPool(tokens),
    cache: new KvCardCache(env.CACHE),
    cacheSeconds: intVar(env.CACHE_SECONDS, 21600),
    staleSeconds: intVar(env.STALE_SECONDS, 86400),
    timeoutMs: intVar(env.GITHUB_TIMEOUT_MS, 8000),
    waitUntil,
  };
}

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => app.fetch(req, env, ctx),
  scheduled: (_controller: ScheduledController, env: Env, ctx: ExecutionContext) =>
    ctx.waitUntil(handleScheduled(env)),
};
