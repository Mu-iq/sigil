import type { ActivityFetchResult, ActivityModel } from './types.js';

/**
 * Pure transform: daily points -> chart model with summary stats. No I/O, no
 * SVG. The renderer decides geometry; this decides the numbers.
 */
export function transformActivity(data: ActivityFetchResult): ActivityModel {
  const points = data.points;
  const total = points.reduce((sum, p) => sum + p.count, 0);
  const max = points.reduce((m, p) => Math.max(m, p.count), 0);
  const average = points.length > 0 ? Math.round((total / points.length) * 10) / 10 : 0;

  return {
    points,
    total,
    max,
    average,
    startDate: points.length > 0 ? points[0]!.date : null,
    endDate: points.length > 0 ? points[points.length - 1]!.date : null,
  };
}
