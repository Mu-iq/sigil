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
import { renderWrappedCard } from '../src/cards/wrapped/render.js';
import type { WrappedModel } from '../src/cards/wrapped/types.js';
import { renderTrendsCard } from '../src/cards/trends/render.js';
import type { TrendPoint } from '../src/snapshots/trends.js';
import { renderSummaryCard } from '../src/cards/summary/render.js';
import { resolveTheme } from '../src/themes/index.js';

const ACCENT = '#79c0ff';
const W = 450;

// Accents/titles that belong to OTHER themes. None may appear under github_dark
// — if one does, a card is falling back to a per-card default color.
const FOREIGN_COLORS = [
  '#7ee787', // old github_dark green
  '#3fb950', // old dark green
  '#50fa7b', // dracula green
  '#fe428e', // radical pink
  '#ff79c6', // dracula pink
  '#cba6f7', // catppuccin purple
  '#a6e3a1', // catppuccin green
  '#bb9af7', // tokyonight purple
];

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
    { name: 'TypeScript', color: '#3178c6', weight: 6, percentage: 60 },
    { name: 'Go', color: '#00add8', weight: 4, percentage: 40 },
  ],
  hasOther: false,
};

const STREAK: StreakModel = {
  totalContributions: 4321,
  firstDate: '2021-05-10',
  currentStreak: { length: 12, startDate: '2026-06-30', endDate: '2026-07-11' },
  longestStreak: { length: 87, startDate: '2023-01-02', endDate: '2023-03-29' },
};

const WRAPPED: WrappedModel = {
  year: 2025,
  totalContributions: 3210,
  activeDays: 210,
  busiestMonth: { month: 'March', count: 480 },
  bestDay: { date: '2025-03-14', count: 37 },
  longestStreak: 21,
  topLanguage: { name: 'TypeScript', color: '#3178c6' },
};

const TREND: TrendPoint[] = [
  { date: '2026-04-01', value: 10 },
  { date: '2026-04-08', value: 22 },
  { date: '2026-04-15', value: 31 },
];

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
 * Encodes the acceptance check: every card at ?theme=github_dark&card_width=450
 * shares the exact accent, shares the width, and never emits a foreign-theme
 * (green/pink/purple) color for a structural element.
 */
describe('grid consistency (github_dark + card_width=450)', () => {
  const theme = resolveTheme('github_dark');
  const border = { hideBorder: false, borderRadius: 8, width: W };

  const cards: Record<string, string> = {
    stats: renderStatsCard(
      transformStats(RAW, { showIcons: true, hideRank: false }),
      theme,
      border,
    ),
    languages: renderLanguagesCard(LANGS, theme, {
      layout: 'donut',
      title: 'Top Languages',
      ...border,
    }),
    streak: renderStreakCard(STREAK, theme, border),
    activity: renderActivityCard(activityModel(), theme, {
      title: 'Activity',
      ...border,
    }),
    wrapped: renderWrappedCard(WRAPPED, theme, { login: 'mu-iq', ...border }),
    trends: renderTrendsCard(TREND, theme, {
      title: 'Stars',
      metricLabel: 'Stars',
      ...border,
    }),
    summary: renderSummaryCard('Builds typed edge services.', theme, {
      title: 'Summary',
      enabled: true,
      ...border,
    }),
  };

  for (const [name, svg] of Object.entries(cards)) {
    const lower = svg.toLowerCase();

    it(`${name} renders at the requested width`, () => {
      expect(svg).toContain(`width="${W}"`);
    });

    it(`${name} uses the shared accent`, () => {
      expect(lower).toContain(ACCENT);
    });

    it(`${name} leaks no foreign-theme color`, () => {
      for (const c of FOREIGN_COLORS) {
        expect(lower).not.toContain(c);
      }
    });
  }

  it('accent-bearing cards use the identical accent stroke', () => {
    for (const key of ['stats', 'streak', 'activity', 'trends'] as const) {
      expect(cards[key]!.toLowerCase()).toContain(`stroke="${ACCENT}"`);
    }
  });
});
