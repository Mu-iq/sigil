/**
 * GraphQL query for the stats card. Every field here is verified against the
 * GitHub GraphQL v4 schema (User type). Do NOT add speculative fields.
 *
 * Notes on correctness:
 * - `repositories(ownerAffiliations: OWNER)` + pagination is how we get the
 *   real star total; the first-100-repos bug in other tools comes from not
 *   paging this connection.
 * - `contributionsCollection.totalCommitContributions` counts the last ~year of
 *   commits (public + accessible). `restrictedContributionsCount` is the
 *   private slice, added only when `count_private` is requested and the token
 *   can see it.
 * - `contributionCalendar.totalContributions` is the headline "contributions"
 *   number GitHub shows on the profile.
 */
export const STATS_QUERY = /* GraphQL */ `
  query userStats($login: String!, $after: String) {
    user(login: $login) {
      name
      login
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
        }
      }
      pullRequests {
        totalCount
      }
      issues {
        totalCount
      }
      followers {
        totalCount
      }
      repositories(
        first: 100
        after: $after
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          stargazerCount
        }
      }
    }
  }
`;

/** Shape returned by STATS_QUERY. Mirrors the query exactly. */
export interface StatsQueryResult {
  user: {
    name: string | null;
    login: string;
    contributionsCollection: {
      totalCommitContributions: number;
      restrictedContributionsCount: number;
      contributionCalendar: { totalContributions: number };
    };
    pullRequests: { totalCount: number };
    issues: { totalCount: number };
    followers: { totalCount: number };
    repositories: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{ stargazerCount: number }>;
    };
  } | null;
}
