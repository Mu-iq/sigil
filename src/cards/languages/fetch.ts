import { graphql } from '../../github/client.js';
import { GitHubError } from '../../github/errors.js';
import { LANGUAGES_QUERY, type LanguagesQueryResult } from '../../github/queries.js';
import type { TokenPool } from '../../github/token-pool.js';
import type { LanguagesFetchOptions, LanguagesFetchResult } from './types.js';

/** Hard cap on repo pages so a huge account can't run away with quota. */
const MAX_REPO_PAGES = 20; // 20 * 100 = 2000 repos

/**
 * Fetch every owned non-fork repo's language breakdown, paging through ALL
 * repos (the correctness fix — other tools stop at the first 100). Aggregation
 * happens in the pure transform; this step only flattens the wire response.
 */
export async function fetchUserLanguages(
  pool: TokenPool,
  username: string,
  options: LanguagesFetchOptions,
  timeoutMs: number,
): Promise<LanguagesFetchResult> {
  let after: string | null = null;
  let pages = 0;
  const repos: LanguagesFetchResult['repos'] = [];
  let login = username;

  do {
    const result: LanguagesQueryResult = await graphql<LanguagesQueryResult>(
      pool,
      LANGUAGES_QUERY,
      { login: username, after },
      { timeoutMs },
    );
    const user = result.user;
    if (!user) throw new GitHubError('user not found', 'not_found');
    login = user.login;

    for (const repo of user.repositories.nodes) {
      if (repo.isPrivate && !options.includePrivate) continue;
      repos.push({
        repo: repo.name,
        isPrivate: repo.isPrivate,
        languages: repo.languages.edges.map((e) => ({
          name: e.node.name,
          color: e.node.color,
          size: e.size,
        })),
      });
    }

    const pageInfo = user.repositories.pageInfo;
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    pages += 1;
  } while (after !== null && pages < MAX_REPO_PAGES);

  return { login, repos };
}
