/**
 * Rotating pool of GitHub PATs. GitHub allows ~5,000 GraphQL points/hour per
 * token, so self-hosters add PAT_1..PAT_N and we spread load across them and
 * skip tokens we believe are exhausted until their reset time.
 *
 * State is per-isolate and best-effort (Workers isolates are short-lived); it's
 * an optimization, not a correctness guarantee. The cache layer is what truly
 * protects the rate limit.
 */
export interface TokenState {
  token: string;
  /** Remaining points as last reported by GitHub, or null if unknown. */
  remaining: number | null;
  /** Epoch ms when this token's quota resets, or null if unknown. */
  resetAt: number | null;
}

export class TokenPool {
  private readonly states: TokenState[];
  private cursor = 0;

  constructor(tokens: string[]) {
    this.states = tokens.map((token) => ({ token, remaining: null, resetAt: null }));
  }

  get size(): number {
    return this.states.length;
  }

  /**
   * Pick the next usable token round-robin, skipping any believed-exhausted
   * token whose reset time hasn't passed. Falls back to the least-recently
   * tried token if every token looks exhausted (better to try and get a real
   * error than to give up).
   */
  next(now = Date.now()): TokenState | undefined {
    if (this.states.length === 0) return undefined;
    for (let i = 0; i < this.states.length; i++) {
      const idx = (this.cursor + i) % this.states.length;
      const state = this.states[idx]!;
      const exhausted =
        state.remaining !== null &&
        state.remaining <= 0 &&
        state.resetAt !== null &&
        state.resetAt > now;
      if (!exhausted) {
        this.cursor = (idx + 1) % this.states.length;
        return state;
      }
    }
    const fallback = this.states[this.cursor % this.states.length]!;
    this.cursor = (this.cursor + 1) % this.states.length;
    return fallback;
  }

  /** Record rate-limit info reported on a response for a given token. */
  report(token: string, remaining: number | null, resetAt: number | null): void {
    const state = this.states.find((s) => s.token === token);
    if (!state) return;
    if (remaining !== null) state.remaining = remaining;
    if (resetAt !== null) state.resetAt = resetAt;
  }
}
