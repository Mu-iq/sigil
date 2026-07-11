import type { Snapshot, SnapshotMetrics } from './types.js';

/** A single (date, value) point in a trend series. */
export interface TrendPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export type TrendMetric = keyof SnapshotMetrics;

/**
 * Reduce raw snapshots into a daily series for one metric. When multiple
 * snapshots land on the same calendar day we keep the last (latest capture),
 * so the series is one point per day — what the trend chart expects.
 *
 * Pure and I/O-free: fully unit-testable with hand-built snapshot arrays.
 */
export function toDailySeries(snapshots: Snapshot[], metric: TrendMetric): TrendPoint[] {
  const byDay = new Map<string, number>();
  for (const snap of snapshots) {
    const day = snap.capturedAt.slice(0, 10);
    byDay.set(day, snap.metrics[metric]); // later capture wins
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, value]) => ({ date, value }));
}

/**
 * The net change of a metric across the available history (last - first).
 * Returns 0 when there are fewer than two points.
 */
export function netChange(series: TrendPoint[]): number {
  if (series.length < 2) return 0;
  return series[series.length - 1]!.value - series[0]!.value;
}

/** True when there's enough history to draw a meaningful trend. */
export function hasEnoughHistory(series: TrendPoint[], min = 2): boolean {
  return series.length >= min;
}
