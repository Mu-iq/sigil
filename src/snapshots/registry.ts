/**
 * Tracks which usernames have been requested recently so the scheduled job
 * knows whom to snapshot. Backed by KV with a TTL, so inactive users age out
 * automatically and we never snapshot the whole world.
 *
 * Writes happen in the background (waitUntil) off the card request path, so
 * they never slow a render or bypass the card cache.
 */
const PREFIX = 'track:';
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export class UserRegistry {
  constructor(private readonly kv: KVNamespace) {}

  /** Record that `username` was requested (idempotent, cheap). */
  async track(username: string): Promise<void> {
    const key = `${PREFIX}${username.toLowerCase()}`;
    await this.kv.put(key, new Date().toISOString(), { expirationTtl: TTL_SECONDS });
  }

  /** List currently-tracked usernames (bounded by `limit`). */
  async list(limit = 1000): Promise<string[]> {
    const users: string[] = [];
    let cursor: string | undefined;
    do {
      const res = await this.kv.list({ prefix: PREFIX, cursor, limit: 1000 });
      for (const key of res.keys) users.push(key.name.slice(PREFIX.length));
      cursor = res.list_complete ? undefined : res.cursor;
    } while (cursor && users.length < limit);
    return users.slice(0, limit);
  }
}
