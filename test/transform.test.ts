import { describe, expect, it } from 'vitest';
import { transformStats } from '../src/cards/stats/transform.js';
import type { RawUserStats } from '../src/cards/stats/types.js';

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

const DEFAULTS = { showIcons: true, hideRank: false };

describe('transformStats', () => {
  it('produces all six stats by default, compacted', () => {
    const m = transformStats(RAW, DEFAULTS);
    expect(m.items).toHaveLength(6);
    const stars = m.items.find((i) => i.key === 'stars');
    expect(stars?.value).toBe('1.2k');
  });

  it('defaults the title from the user name', () => {
    expect(transformStats(RAW, DEFAULTS).title).toBe("Mu's GitHub Stats");
  });

  it('honors a custom title', () => {
    expect(transformStats(RAW, { ...DEFAULTS, title: 'My Stats' }).title).toBe(
      'My Stats',
    );
  });

  it('hides listed stats', () => {
    const m = transformStats(RAW, { ...DEFAULTS, hide: ['issues', 'followers'] });
    const keys = m.items.map((i) => i.key);
    expect(keys).not.toContain('issues');
    expect(keys).not.toContain('followers');
  });

  it('show whitelist overrides the default set and respects order', () => {
    const m = transformStats(RAW, { ...DEFAULTS, show: ['prs', 'stars'] });
    expect(m.items.map((i) => i.key)).toEqual(['prs', 'stars']);
  });

  it('omits the rank when hideRank is set', () => {
    expect(transformStats(RAW, { ...DEFAULTS, hideRank: true }).rank).toBeNull();
    expect(transformStats(RAW, DEFAULTS).rank).not.toBeNull();
  });
});
