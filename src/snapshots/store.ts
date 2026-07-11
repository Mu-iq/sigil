import type { Snapshot, SnapshotMetrics, StoredSummary } from './types.js';

/**
 * D1-backed historical store. Behind this adapter so the core stays
 * runtime-agnostic — a Node/Postgres port swaps this out. All reads are scoped
 * by username and time so trend queries stay cheap.
 */
export interface SnapshotStore {
  writeSnapshot(
    username: string,
    capturedAt: string,
    metrics: SnapshotMetrics,
  ): Promise<void>;
  getSnapshots(username: string, sinceIso?: string): Promise<Snapshot[]>;
  getSummary(username: string): Promise<StoredSummary | null>;
  upsertSummary(username: string, summary: string, model: string | null): Promise<void>;
}

interface SnapshotRow {
  username: string;
  captured_at: string;
  metrics_json: string;
}

interface SummaryRow {
  username: string;
  summary: string;
  model: string | null;
  generated_at: string;
}

export class D1SnapshotStore implements SnapshotStore {
  constructor(private readonly db: D1Database) {}

  async writeSnapshot(
    username: string,
    capturedAt: string,
    metrics: SnapshotMetrics,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO snapshots
           (username, captured_at, stars, commits, contributions, followers, metrics_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        username.toLowerCase(),
        capturedAt,
        metrics.stars,
        metrics.commits,
        metrics.contributions,
        metrics.followers,
        JSON.stringify(metrics),
      )
      .run();
  }

  async getSnapshots(username: string, sinceIso?: string): Promise<Snapshot[]> {
    const stmt = sinceIso
      ? this.db
          .prepare(
            `SELECT username, captured_at, metrics_json FROM snapshots
             WHERE username = ? AND captured_at >= ? ORDER BY captured_at ASC`,
          )
          .bind(username.toLowerCase(), sinceIso)
      : this.db
          .prepare(
            `SELECT username, captured_at, metrics_json FROM snapshots
             WHERE username = ? ORDER BY captured_at ASC`,
          )
          .bind(username.toLowerCase());

    const { results } = await stmt.all<SnapshotRow>();
    return (results ?? []).map((r) => ({
      username: r.username,
      capturedAt: r.captured_at,
      metrics: JSON.parse(r.metrics_json) as SnapshotMetrics,
    }));
  }

  async getSummary(username: string): Promise<StoredSummary | null> {
    const row = await this.db
      .prepare(
        `SELECT username, summary, model, generated_at FROM summaries WHERE username = ?`,
      )
      .bind(username.toLowerCase())
      .first<SummaryRow>();
    if (!row) return null;
    return {
      username: row.username,
      summary: row.summary,
      model: row.model,
      generatedAt: row.generated_at,
    };
  }

  async upsertSummary(
    username: string,
    summary: string,
    model: string | null,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO summaries (username, summary, model, generated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(username.toLowerCase(), summary, model, new Date().toISOString())
      .run();
  }
}
