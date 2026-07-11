import { describe, expect, it } from 'vitest';
import { renderStatsCard } from '../src/cards/stats/render.js';
import { transformStats } from '../src/cards/stats/transform.js';
import type { RawUserStats } from '../src/cards/stats/types.js';
import { renderLanguagesCard } from '../src/cards/languages/render.js';
import type { LanguagesModel } from '../src/cards/languages/transform.js';
import { renderStreakCard } from '../src/cards/streak/render.js';
import type { StreakModel } from '../src/cards/streak/types.js';
import { renderActivityCard } from '../src/cards/activity/render.js';
import { transformActivity } from '../src/cards/activity/transform.js';
import type { ActivityFetchResult } from '../src/cards/activity/types.js';
import { resolveTheme } from '../src/themes/index.js';

const THEME = 'github_dark';
const ACCENT = '#79c0ff';
const W = 450;

const RAW: RawUserStats = {
  login: 'mu-iq',
  name: 'Mu',
  totalStars: 1234,
  totalCommits: 4567,
  totalPRs: 89,
  totalIssues: 42,
  totalContributions: 3210,
  followers: 100,
  repoCount: 30,
};

const LANGS: LanguagesModel = {
  slices: [
    { name: 'TypeScript', color: '#3178c6', weight: 600, percentage: 60 },
    { name: 'Go', color: '#00add8', weight: 400, percentage: 40 },
  ],
  hasOther: false,
};

const STREAK: StreakModel = {
  totalContributions: 4321,
  firstDate: '2021-05-10',
  currentStreak: { length: 12, startDate: '2026-06-30', endDate: '2026-07-11' },
  longestStreak: { length: 87, startDate: '2023-01-02', endDate: '2023-03-29' },
};

function activityModel() {
  const data: ActivityFetchResult = {
    login: 'mu-iq',
    points: [1, 3, 2, 5, 0, 4, 6].map((count, i) => ({
      date: new Date(Date.parse('2026-06-01T12:00:00Z') + i * 86400000)
        .toISOString()
        .slice(0, 10),
      count,
    })),
  };
  return transformActivity(data);
}

/**
 * Encodes the acceptance check: all four cards at ?theme=github_dark&card_width=450
 * share the exact accent, share the width, and never emit the old green accent.
 */
describe('grid consistency (github_dark + card_width=450)', () => {
  const theme = resolveTheme(THEME);

  const cards: Record<string, string> = {
    stats: renderStatsCard(
      transformStats(RAW, { showIcons: true, hideRank: false }),
      theme,
      {
        hideBorder: false,
        borderRadius: 8,
        width: W,
      },
    ),
    languages: renderLanguagesCard(LANGS, theme, {
      layout: 'donut',
      title: 'Top Languages',
      hideBorder: false,
      borderRadius: 8,
      width: W,
    }),
    streak: renderStreakCard(STREAK, theme, {
      hideBorder: false,
      borderRadius: 8,
      width: W,
    }),
    activity: renderActivityCard(activityModel(), theme, {
      title: 'Activity',
      hideBorder: false,
      borderRadius: 8,
      width: W,
    }),
  };

  for (const [name, svg] of Object.entries(cards)) {
    it(`${name} renders at the requested width`, () => {
      expect(svg).toContain(`width="${W}"`);
    });

    it(`${name} uses the theme accent and never the old green`, () => {
      expect(svg.toLowerCase()).toContain(ACCENT);
      expect(svg.toLowerCase()).not.toContain('#7ee787'); // old github_dark green
      expect(svg.toLowerCase()).not.toContain('#3fb950'); // old dark green
    });
  }

  it('accent-bearing cards (stats/streak/activity) all use the same accent value', () => {
    // Rank ring, streak ring, and activity line must be the identical accent.
    for (const key of ['stats', 'streak', 'activity'] as const) {
      expect(cards[key]!.toLowerCase()).toContain(`stroke="${ACCENT}"`);
    }
  });
});
