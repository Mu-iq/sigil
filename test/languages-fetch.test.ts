import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguagesQueryResult } from '../src/github/queries.js';

const graphqlMock = vi.fn();
vi.mock('../src/github/client.js', () => ({
  graphql: (...args: unknown[]) => graphqlMock(...args),
}));

const { fetchUserLanguages } = await import('../src/cards/languages/fetch.js');
const { TokenPool } = await import('../src/github/token-pool.js');

function page(
  repos: Array<{ name: string; isPrivate?: boolean; langs: Array<[string, number]> }>,
  hasNext: boolean,
  cursor: string | null,
): LanguagesQueryResult {
  return {
    user: {
      login: 'mu-iq',
      repositories: {
        pageInfo: { hasNextPage: hasNext, endCursor: cursor },
        nodes: repos.map((r) => ({
          name: r.name,
          isPrivate: r.isPrivate ?? false,
          languages: {
            edges: r.langs.map(([name, size]) => ({
              size,
              node: { name, color: '#123456' },
            })),
          },
        })),
      },
    },
  };
}

describe('fetchUserLanguages', () => {
  beforeEach(() => graphqlMock.mockReset());

  it('pages through all repos and flattens their languages', async () => {
    graphqlMock
      .mockResolvedValueOnce(page([{ name: 'a', langs: [['TS', 100]] }], true, 'c1'))
      .mockResolvedValueOnce(page([{ name: 'b', langs: [['Go', 200]] }], false, null));

    const pool = new TokenPool(['t1']);
    const result = await fetchUserLanguages(
      pool,
      'mu-iq',
      { includePrivate: false },
      5000,
    );

    expect(graphqlMock).toHaveBeenCalledTimes(2);
    expect(result.repos.map((r) => r.repo)).toEqual(['a', 'b']);
  });

  it('skips private repos unless includePrivate is set', async () => {
    graphqlMock.mockResolvedValue(
      page(
        [
          { name: 'pub', langs: [['TS', 1]] },
          { name: 'sec', isPrivate: true, langs: [['Go', 1]] },
        ],
        false,
        null,
      ),
    );
    const pool = new TokenPool(['t1']);

    const pub = await fetchUserLanguages(pool, 'mu-iq', { includePrivate: false }, 5000);
    expect(pub.repos.map((r) => r.repo)).toEqual(['pub']);

    graphqlMock.mockResolvedValue(
      page(
        [
          { name: 'pub', langs: [['TS', 1]] },
          { name: 'sec', isPrivate: true, langs: [['Go', 1]] },
        ],
        false,
        null,
      ),
    );
    const withPriv = await fetchUserLanguages(
      pool,
      'mu-iq',
      { includePrivate: true },
      5000,
    );
    expect(withPriv.repos.map((r) => r.repo)).toEqual(['pub', 'sec']);
  });
});
