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

/**
 * GraphQL query for the languages card. Pages ALL owned non-fork repos and
 * reads each repo's language breakdown by bytes. Fixing the "first 100 repos"
 * bug means paging `repositories`; reading `languages(orderBy: SIZE)` edges is
 * how GitHub exposes per-repo byte counts. `primaryLanguage`/`isPrivate` let us
 * offer count-weighting and private handling. All fields verified against the
 * Repository/Language schema.
 */
export const LANGUAGES_QUERY = /* GraphQL */ `
  query userLanguages($login: String!, $after: String) {
    user(login: $login) {
      login
      repositories(
        first: 100
        after: $after
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          isPrivate
          languages(first: 15, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

export interface LanguageEdge {
  size: number;
  node: { name: string; color: string | null };
}

export interface LanguagesQueryResult {
  user: {
    login: string;
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        name: string;
        isPrivate: boolean;
        languages: { edges: LanguageEdge[] };
      }>;
    };
  } | null;
}

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
