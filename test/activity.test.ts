import { describe, expect, it } from 'vitest';
import { renderActivityCard } from '../src/cards/activity/render.js';
import { transformActivity } from '../src/cards/activity/transform.js';
import type { ActivityFetchResult } from '../src/cards/activity/types.js';
import { resolveTheme } from '../src/themes/index.js';

function fetchResult(counts: number[]): ActivityFetchResult {
  return {
    login: 'mu-iq',
    points: counts.map((count, i) => ({
      date: new Date(Date.parse('2026-06-01T12:00:00Z') + i * 86400000)
        .toISOString()
        .slice(0, 10),
      count,
    })),
  };
}

describe('transformActivity', () => {
  it('computes total, max and average', () => {
    const m = transformActivity(fetchResult([0, 2, 4, 2]));
    expect(m.total).toBe(8);
    expect(m.max).toBe(4);
    expect(m.average).toBe(2);
    expect(m.startDate).toBe('2026-06-01');
    expect(m.endDate).toBe('2026-06-04');
  });

  it('handles an empty window', () => {
    const m = transformActivity({ login: 'x', points: [] });
    expect(m.total).toBe(0);
    expect(m.max).toBe(0);
    expect(m.average).toBe(0);
    expect(m.startDate).toBeNull();
  });
});

describe('renderActivityCard', () => {
  const OPTS = { title: 'Activity', hideBorder: false, borderRadius: 8 };

  it('emits accessible, self-contained SVG with a line path', () => {
    const m = transformActivity(fetchResult([1, 3, 2, 5, 0, 4]));
    const svg = renderActivityCard(m, resolveTheme('tokyonight'), OPTS);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<path');
    expect(svg).not.toMatch(/<image|xlink:href|<foreignObject|@import|href="http/);
  });

  it('renders an empty-window message without a chart', () => {
    const m = transformActivity({ login: 'x', points: [] });
    const svg = renderActivityCard(m, resolveTheme('dark'), OPTS);
    expect(svg).toContain('No contribution data');
    expect(svg.startsWith('<svg')).toBe(true);
  });

  it('matches snapshot', () => {
    const m = transformActivity(fetchResult([0, 1, 4, 2, 6, 3, 5]));
    expect(renderActivityCard(m, resolveTheme('dark'), OPTS)).toMatchSnapshot(
      'activity-dark',
    );
  });

  it('does not divide by zero when all counts are zero', () => {
    const m = transformActivity(fetchResult([0, 0, 0]));
    const svg = renderActivityCard(m, resolveTheme('dark'), OPTS);
    expect(svg).toContain('<path');
    expect(svg).not.toContain('NaN');
  });
});
