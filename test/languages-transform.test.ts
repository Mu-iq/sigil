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

const OPTS = { weight: 'size' as const, langsCount: 6 };

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
      { weight: 'size', langsCount: 2 },
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
      { weight: 'size', langsCount: 6, excludeRepos: ['skip'], hideLanguages: ['html'] },
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
