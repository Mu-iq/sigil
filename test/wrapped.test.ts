import { describe, expect, it } from 'vitest';
import { renderWrappedCard } from '../src/cards/wrapped/render.js';
import { transformWrapped } from '../src/cards/wrapped/transform.js';
import type { WrappedFetchResult } from '../src/cards/wrapped/types.js';
import type { LanguagesFetchResult } from '../src/cards/languages/types.js';
import { resolveTheme } from '../src/themes/index.js';

function langs(): LanguagesFetchResult {
  return {
    login: 'mu-iq',
    repos: [
      {
        repo: 'a',
        isPrivate: false,
        languages: [{ name: 'TypeScript', color: '#3178c6', size: 1000 }],
      },
    ],
  };
}

function build(year: number, days: Array<[string, number]>): WrappedFetchResult {
  return {
    login: 'mu-iq',
    year,
    days: days.map(([date, count]) => ({ date, count })),
    languages: langs(),
  };
}

describe('transformWrapped', () => {
  it('summarizes a year: total, active days, busiest month, best day, streak, language', () => {
    const model = transformWrapped(
      build(2025, [
        ['2025-01-01', 3],
        ['2025-01-02', 5],
        ['2025-01-03', 0],
        ['2025-03-10', 9],
        ['2025-03-11', 2],
      ]),
    );
    expect(model.totalContributions).toBe(19);
    expect(model.activeDays).toBe(4);
    expect(model.busiestMonth?.month).toBe('March');
    expect(model.busiestMonth?.count).toBe(11);
    expect(model.bestDay?.date).toBe('2025-03-10');
    expect(model.longestStreak).toBe(2);
    expect(model.topLanguage?.name).toBe('TypeScript');
  });

  it('ignores days outside the requested year', () => {
    const model = transformWrapped(
      build(2025, [
        ['2024-12-31', 100],
        ['2025-01-01', 4],
        ['2026-01-01', 100],
      ]),
    );
    expect(model.totalContributions).toBe(4);
  });

  it('handles a year with no contributions', () => {
    const model = transformWrapped(build(2025, []));
    expect(model.totalContributions).toBe(0);
    expect(model.activeDays).toBe(0);
    expect(model.busiestMonth).toBeNull();
    expect(model.bestDay).toBeNull();
    expect(model.longestStreak).toBe(0);
  });
});

describe('renderWrappedCard', () => {
  const OPTS = { login: 'mu-iq', hideBorder: false, borderRadius: 8 };

  it('emits accessible, self-contained SVG', () => {
    const model = transformWrapped(build(2025, [['2025-05-01', 7]]));
    const svg = renderWrappedCard(model, resolveTheme('radical'), OPTS);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('2025 in Review');
    expect(svg).not.toMatch(/<image|xlink:href|<foreignObject|@import|href="http/);
  });

  it('matches snapshot', () => {
    const model = transformWrapped(
      build(2025, [
        ['2025-01-01', 3],
        ['2025-06-15', 12],
      ]),
    );
    expect(renderWrappedCard(model, resolveTheme('dark'), OPTS)).toMatchSnapshot(
      'wrapped-dark',
    );
  });
});
