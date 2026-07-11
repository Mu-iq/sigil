import type { LanguageSlice, LanguageWeight, LanguagesFetchResult } from './types.js';

/** Neutral fill for languages GitHub has no color for. */
const NO_COLOR = '#858585';
const OTHER_COLOR = '#8b949e';

export interface LanguagesTransformOptions {
  weight: LanguageWeight;
  /** Max distinct language slices before the rest collapse into "Other". */
  langsCount: number;
  /** Repo names to exclude (case-insensitive). */
  excludeRepos?: string[] | undefined;
  /** Language names to hide (case-insensitive). */
  hideLanguages?: string[] | undefined;
}

export interface LanguagesModel {
  slices: LanguageSlice[];
  /** True when a synthetic "Other" slice was appended. */
  hasOther: boolean;
}

interface Agg {
  name: string;
  color: string;
  weight: number;
}

/**
 * Pure aggregation of per-repo language data into ranked, percentage-weighted
 * slices. Deterministic and I/O-free so it is fully unit-testable, including
 * the pagination-merge behavior (many repos -> one aggregate).
 */
export function transformLanguages(
  data: LanguagesFetchResult,
  options: LanguagesTransformOptions,
): LanguagesModel {
  const excluded = new Set((options.excludeRepos ?? []).map((s) => s.toLowerCase()));
  const hidden = new Set((options.hideLanguages ?? []).map((s) => s.toLowerCase()));

  const byLang = new Map<string, Agg>();
  for (const repo of data.repos) {
    if (excluded.has(repo.repo.toLowerCase())) continue;
    for (const lang of repo.languages) {
      if (hidden.has(lang.name.toLowerCase())) continue;
      const key = lang.name.toLowerCase();
      const prev = byLang.get(key);
      const add = options.weight === 'count' ? 1 : lang.size;
      if (prev) {
        prev.weight += add;
      } else {
        byLang.set(key, {
          name: lang.name,
          color: lang.color ?? NO_COLOR,
          weight: add,
        });
      }
    }
  }

  const sorted = [...byLang.values()].sort((a, b) => b.weight - a.weight);
  const totalWeight = sorted.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight === 0) return { slices: [], hasOther: false };

  const limit = Math.max(1, options.langsCount);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);

  const slices: LanguageSlice[] = top.map((a) => ({
    name: a.name,
    color: a.color,
    weight: a.weight,
    percentage: round1((a.weight / totalWeight) * 100),
  }));

  let hasOther = false;
  if (rest.length > 0) {
    const otherWeight = rest.reduce((sum, a) => sum + a.weight, 0);
    slices.push({
      name: 'Other',
      color: OTHER_COLOR,
      weight: otherWeight,
      percentage: round1((otherWeight / totalWeight) * 100),
    });
    hasOther = true;
  }

  return { slices, hasOther };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
