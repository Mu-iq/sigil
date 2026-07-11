/** The metrics captured in a single snapshot. Kept small and stable. */
export interface SnapshotMetrics {
  stars: number;
  commits: number;
  contributions: number;
  followers: number;
  prs: number;
  issues: number;
}

/** A stored snapshot row. */
export interface Snapshot {
  username: string;
  capturedAt: string;
  metrics: SnapshotMetrics;
}

/** A stored, precomputed AI summary. */
export interface StoredSummary {
  username: string;
  summary: string;
  model: string | null;
  generatedAt: string;
}
