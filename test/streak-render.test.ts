import { describe, expect, it } from 'vitest';
import { renderStreakCard } from '../src/cards/streak/render.js';
import type { StreakModel } from '../src/cards/streak/types.js';
import { resolveTheme } from '../src/themes/index.js';

const MODEL: StreakModel = {
  totalContributions: 4321,
  firstDate: '2021-05-10',
  currentStreak: { length: 12, startDate: '2026-06-30', endDate: '2026-07-11' },
  longestStreak: { length: 87, startDate: '2023-01-02', endDate: '2023-03-29' },
};

const OPTS = { hideBorder: false, borderRadius: 8 };

describe('renderStreakCard', () => {
  it('emits accessible, self-contained SVG with the three columns', () => {
    const svg = renderStreakCard(MODEL, resolveTheme('dark'), OPTS);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('Current Streak');
    expect(svg).toContain('Longest Streak');
    expect(svg).toContain('Total Contributions');
    expect(svg).not.toMatch(/<image|xlink:href|<foreignObject|@import|href="http/);
  });

  it('matches snapshot', () => {
    expect(renderStreakCard(MODEL, resolveTheme('dracula'), OPTS)).toMatchSnapshot(
      'streak-dracula',
    );
  });

  it('renders a zero streak without dates gracefully', () => {
    const empty: StreakModel = {
      totalContributions: 0,
      firstDate: null,
      currentStreak: { length: 0, startDate: null, endDate: null },
      longestStreak: { length: 0, startDate: null, endDate: null },
    };
    const svg = renderStreakCard(empty, resolveTheme('dark'), OPTS);
    expect(svg).toContain('—');
    expect(svg.startsWith('<svg')).toBe(true);
  });
});
