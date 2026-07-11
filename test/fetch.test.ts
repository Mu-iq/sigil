import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatsQueryResult } from '../src/github/queries.js';

// Mock the GraphQL client so we can feed multi-page responses and assert the
// star total is summed across ALL pages (the bug other tools have).
const graphqlMock = vi.fn();
vi.mock('../src/github/client.js', () => ({
  graphql: (...args: unknown[]) => graphqlMock(...args),
}));

const { fetchUserStats } = await import('../src/cards/stats/fetch.js');
const { TokenPool } = await import('../src/github/token-pool.js');

function page(
  stars: number[],
  hasNext: boolean,
  cursor: string | null,
): StatsQueryResult {
  return {
    user: {
      name: 'Mu',
      login: 'mu-iq',
      contributionsCollection: {
        totalCommitContributions: 1000,
        restrictedContributionsCount: 250,
        contributionCalendar: { totalContributions: 3000 },
      },
      pullRequests: { totalCount: 40 },
      issues: { totalCount: 12 },
      followers: { totalCount: 77 },
      repositories: {
        totalCount: 150,
        pageInfo: { hasNextPage: hasNext, endCursor: cursor },
        nodes: stars.map((stargazerCount) => ({ stargazerCount })),
      },
    },
  };
}

describe('fetchUserStats', () => {
  beforeEach(() => graphqlMock.mockReset());

  it('paginates repos and sums stars across every page', async () => {
    graphqlMock
      .mockResolvedValueOnce(page([100, 50, 25], true, 'c1'))
      .mockResolvedValueOnce(page([10, 5], false, null));

    const pool = new TokenPool(['t1']);
    const result = await fetchUserStats(pool, 'mu-iq', { countPrivate: false }, 5000);

    expect(graphqlMock).toHaveBeenCalledTimes(2);
    expect(result.totalStars).toBe(190);
    expect(result.repoCount).toBe(150);
  });

  it('excludes private contributions unless countPrivate is set', async () => {
    graphqlMock.mockResolvedValue(page([1], false, null));
    const pool = new TokenPool(['t1']);

    const pub = await fetchUserStats(pool, 'mu-iq', { countPrivate: false }, 5000);
    expect(pub.totalCommits).toBe(1000);

    graphqlMock.mockResolvedValue(page([1], false, null));
    const priv = await fetchUserStats(pool, 'mu-iq', { countPrivate: true }, 5000);
    expect(priv.totalCommits).toBe(1250);
  });

  it('throws not_found when the user is missing', async () => {
    graphqlMock.mockResolvedValue({ user: null });
    const pool = new TokenPool(['t1']);
    await expect(
      fetchUserStats(pool, 'ghost', { countPrivate: false }, 5000),
    ).rejects.toThrow(/not found/i);
  });
});
