import {
  resolveAiProvider,
  generateSummary,
  type AiProvider,
  type SummarySignals,
} from '../ai/index.js';
import { fetchUserLanguages } from '../cards/languages/fetch.js';
import { transformLanguages } from '../cards/languages/transform.js';
import { fetchUserStats } from '../cards/stats/fetch.js';
import { collectTokens, intVar, type Env } from '../env.js';
import { TokenPool } from '../github/token-pool.js';
import { UserRegistry } from '../snapshots/registry.js';
import { D1SnapshotStore } from '../snapshots/store.js';
import type { SnapshotMetrics } from '../snapshots/types.js';

/** Max users processed per cron run, to stay well under rate limits. */
const MAX_USERS_PER_RUN = 200;

/**
 * Scheduled job: snapshot each tracked user's stats into D1 (history the live
 * API can't provide) and, when a provider is configured, refresh their AI
 * developer summary. Runs off the request path entirely. Per-user failures are
 * isolated so one bad user never aborts the batch.
 */
export async function handleScheduled(env: Env): Promise<void> {
  if (!env.DB) return; // snapshots are optional; nothing to do without D1.

  const tokens = collectTokens(env as unknown as Record<string, unknown>);
  if (tokens.length === 0) return;

  const pool = new TokenPool(tokens);
  const registry = new UserRegistry(env.CACHE);
  const store = new D1SnapshotStore(env.DB);
  const timeoutMs = intVar(env.GITHUB_TIMEOUT_MS, 8000);
  // null unless the summary feature is explicitly enabled AND configured, so
  // the AI provider (and any cost) is skipped entirely by default.
  const provider = resolveAiProvider(env);

  const users = await registry.list(MAX_USERS_PER_RUN);
  const capturedAt = new Date().toISOString();

  for (const username of users) {
    try {
      const stats = await fetchUserStats(
        pool,
        username,
        { countPrivate: false },
        timeoutMs,
      );
      const metrics: SnapshotMetrics = {
        stars: stats.totalStars,
        commits: stats.totalCommits,
        contributions: stats.totalContributions,
        followers: stats.followers,
        prs: stats.totalPRs,
        issues: stats.totalIssues,
      };
      await store.writeSnapshot(username, capturedAt, metrics);

      if (provider) {
        await refreshSummary(pool, store, provider, username, stats, timeoutMs);
      }
    } catch {
      // Isolate per-user failures; the next run will retry.
    }
  }
}

async function refreshSummary(
  pool: TokenPool,
  store: D1SnapshotStore,
  provider: AiProvider,
  username: string,
  stats: Awaited<ReturnType<typeof fetchUserStats>>,
  timeoutMs: number,
): Promise<void> {
  const langData = await fetchUserLanguages(
    pool,
    username,
    { includePrivate: false },
    timeoutMs,
  );
  const langModel = transformLanguages(langData, { weight: 'bytes', langsCount: 5 });
  const signals: SummarySignals = {
    login: stats.login,
    name: stats.name,
    totalStars: stats.totalStars,
    totalCommits: stats.totalCommits,
    totalPRs: stats.totalPRs,
    totalContributions: stats.totalContributions,
    followers: stats.followers,
    repoCount: stats.repoCount,
    topLanguages: langModel.slices.filter((s) => s.name !== 'Other').map((s) => s.name),
  };
  const summary = await generateSummary(provider, signals, timeoutMs);
  if (summary) {
    await store.upsertSummary(username, summary, provider.model);
  }
}
