import { describe, expect, it } from 'vitest';
import { renderTrendsCard } from '../src/cards/trends/render.js';
import type { TrendPoint } from '../src/snapshots/trends.js';
import { resolveTheme } from '../src/themes/index.js';

const OPTS = {
  title: 'Stars Trend',
  metricLabel: 'Stars',
  hideBorder: false,
  borderRadius: 8,
};

const SERIES: TrendPoint[] = [
  { date: '2026-04-01', value: 10 },
  { date: '2026-04-08', value: 14 },
  { date: '2026-04-15', value: 22 },
  { date: '2026-04-22', value: 20 },
];

describe('renderTrendsCard', () => {
  it('renders a line chart with enough history', () => {
    const svg = renderTrendsCard(SERIES, resolveTheme('tokyonight'), OPTS);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<path');
    expect(svg).not.toMatch(/<image|xlink:href|<foreignObject|@import|href="http/);
  });

  it('shows the collecting state when history is insufficient', () => {
    const svg = renderTrendsCard(
      [{ date: '2026-04-01', value: 10 }],
      resolveTheme('dark'),
      OPTS,
    );
    expect(svg).toContain('still being collected');
    expect(svg).not.toContain('<path');
  });

  it('collecting state also covers an empty series (no snapshots yet)', () => {
    const svg = renderTrendsCard([], resolveTheme('dark'), OPTS);
    expect(svg).toContain('still being collected');
    expect(svg.startsWith('<svg')).toBe(true);
  });

  it('matches snapshot', () => {
    expect(renderTrendsCard(SERIES, resolveTheme('dark'), OPTS)).toMatchSnapshot(
      'trends-dark',
    );
  });
});
