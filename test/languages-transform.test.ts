import { describe, expect, it } from 'vitest';
import { transformLanguages } from '../src/cards/languages/transform.js';
import type { LanguagesFetchResult } from '../src/cards/languages/types.js';

function data(
  repos: Array<{
    repo: string;
    isPrivate?: boolean;
    langs: Array<[string, number, string | null]>;
  }>,
): LanguagesFetchResult {
  return {
    login: 'mu-iq',
    repos: repos.map((r) => ({
      repo: r.repo,
      isPrivate: r.isPrivate ?? false,
      languages: r.langs.map(([name, size, color]) => ({ name, size, color })),
    })),
  };
}

const OPTS = { weight: 'bytes' as const, langsCount: 6 };

describe('transformLanguages', () => {
  it('aggregates the same language across many repos (pagination merge)', () => {
    const model = transformLanguages(
      data([
        { repo: 'a', langs: [['TypeScript', 100, '#3178c6']] },
        { repo: 'b', langs: [['TypeScript', 300, '#3178c6']] },
      ]),
      OPTS,
    );
    expect(model.slices).toHaveLength(1);
    expect(model.slices[0]?.name).toBe('TypeScript');
    expect(model.slices[0]?.weight).toBe(400);
    expect(model.slices[0]?.percentage).toBe(100);
  });

  it('computes percentages over the total bytes', () => {
    const model = transformLanguages(
      data([
        {
          repo: 'a',
          langs: [
            ['TS', 750, '#000'],
            ['Go', 250, '#111'],
          ],
        },
      ]),
      OPTS,
    );
    expect(model.slices.find((s) => s.name === 'TS')?.percentage).toBe(75);
    expect(model.slices.find((s) => s.name === 'Go')?.percentage).toBe(25);
  });

  it('collapses languages beyond langs_count into an Other slice', () => {
    const model = transformLanguages(
      data([
        {
          repo: 'a',
          langs: [
            ['A', 50, '#1'],
            ['B', 30, '#2'],
            ['C', 20, '#3'],
          ],
        },
      ]),
      { weight: 'bytes', langsCount: 2 },
    );
    expect(model.hasOther).toBe(true);
    const other = model.slices.find((s) => s.name === 'Other');
    expect(other?.weight).toBe(20);
  });

  it('count weighting tallies repos, not bytes', () => {
    const model = transformLanguages(
      data([
        { repo: 'a', langs: [['TS', 9999, '#1']] },
        {
          repo: 'b',
          langs: [
            ['TS', 1, '#1'],
            ['Go', 500, '#2'],
          ],
        },
      ]),
      { weight: 'count', langsCount: 6 },
    );
    expect(model.slices.find((s) => s.name === 'TS')?.weight).toBe(2);
    expect(model.slices.find((s) => s.name === 'Go')?.weight).toBe(1);
  });

  it('excludes repos and hides languages case-insensitively', () => {
    const model = transformLanguages(
      data([
        { repo: 'Skip', langs: [['TS', 100, '#1']] },
        {
          repo: 'keep',
          langs: [
            ['TS', 50, '#1'],
            ['HTML', 50, '#2'],
          ],
        },
      ]),
      { weight: 'bytes', langsCount: 6, excludeRepos: ['skip'], hideLanguages: ['html'] },
    );
    expect(model.slices).toHaveLength(1);
    expect(model.slices[0]?.name).toBe('TS');
    expect(model.slices[0]?.weight).toBe(50);
  });

  it('returns an empty model when there is no data', () => {
    const model = transformLanguages(data([]), OPTS);
    expect(model.slices).toHaveLength(0);
    expect(model.hasOther).toBe(false);
  });
});

describe('transformLanguages weighting modes', () => {
  // Jupyter Notebook dwarfs everything by bytes but appears in only one repo.
  const repos = data([
    { repo: 'notebook', langs: [['Jupyter Notebook', 5_000_000, '#DA5B0B']] },
    { repo: 'a', langs: [['TypeScript', 5000, '#3178c6']] },
    { repo: 'b', langs: [['TypeScript', 4000, '#3178c6']] },
    { repo: 'c', langs: [['Go', 3000, '#00add8']] },
  ]);

  it('bytes weighting lets one huge file dominate', () => {
    const m = transformLanguages(repos, { weight: 'bytes', langsCount: 6 });
    expect(m.slices[0]?.name).toBe('Jupyter Notebook');
    expect(m.slices[0]!.percentage).toBeGreaterThan(99);
  });

  it('count weighting ranks by repo appearances, not bytes', () => {
    const m = transformLanguages(repos, { weight: 'count', langsCount: 6 });
    // TS appears in 2 repos, Jupyter and Go in 1 each -> TS leads.
    expect(m.slices[0]?.name).toBe('TypeScript');
    const jupyter = m.slices.find((s) => s.name === 'Jupyter Notebook');
    expect(jupyter!.percentage).toBeLessThan(30);
  });

  it('hybrid blends byte share and repo-count share (percentages sum to ~100)', () => {
    const m = transformLanguages(repos, { weight: 'hybrid', langsCount: 6 });
    const total = m.slices.reduce((s, x) => s + x.percentage, 0);
    expect(Math.round(total)).toBe(100);
    // Jupyter's huge bytes are tempered by its single-repo count.
    const jupyter = m.slices.find((s) => s.name === 'Jupyter Notebook');
    expect(jupyter!.percentage).toBeLessThan(80);
    expect(jupyter!.percentage).toBeGreaterThan(30);
  });

  it('hide removes a language and rescales the rest to 100% (layout-agnostic)', () => {
    const m = transformLanguages(repos, {
      weight: 'count',
      langsCount: 6,
      hideLanguages: ['jupyter notebook'],
    });
    expect(m.slices.some((s) => s.name === 'Jupyter Notebook')).toBe(false);
    expect(Math.round(m.slices.reduce((s, x) => s + x.percentage, 0))).toBe(100);
  });
});
