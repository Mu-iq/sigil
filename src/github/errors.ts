/** Error types the fetch layer surfaces so callers can fall back cleanly. */

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly kind: 'rate_limited' | 'not_found' | 'auth' | 'upstream' | 'timeout',
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class NoTokensError extends GitHubError {
  constructor() {
    super('No GitHub tokens configured (set PAT_1)', 'auth');
    this.name = 'NoTokensError';
  }
}
