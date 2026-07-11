/**
 * KV-backed hot cache for rendered cards. Stores the SVG plus metadata so we
 * can do ETag conditional responses and stale-while-revalidate.
 *
 * Kept behind this small adapter so the core render/orchestration code never
 * imports KV directly — a Node/Vercel port swaps this out.
 */

export interface CachedCard {
  svg: string;
  etag: string;
  /** Epoch ms when this entry was written. */
  storedAt: number;
}

export type Freshness = 'fresh' | 'stale' | 'miss';

export interface CacheLookup {
  entry: CachedCard | null;
  freshness: Freshness;
}

export interface CardCache {
  get(key: string, freshSeconds: number, staleSeconds: number): Promise<CacheLookup>;
  put(key: string, svg: string): Promise<CachedCard>;
}

/** Weak ETag derived from content; cheap and stable for identical SVG. */
export function computeEtag(svg: string): string {
  let h = 2166136261;
  for (let i = 0; i < svg.length; i++) {
    h ^= svg.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `W/"${(h >>> 0).toString(16)}-${svg.length.toString(16)}"`;
}

/**
 * Bump when a rendering/theme change should invalidate all previously cached
 * cards. Old entries keep their old prefix and are simply never read again (they
 * expire via TTL), so a deploy never serves a stale look.
 */
const CACHE_VERSION = 'v2';

export class KvCardCache implements CardCache {
  constructor(private readonly kv: KVNamespace) {}

  private versioned(key: string): string {
    return `${CACHE_VERSION}:${key}`;
  }

  async get(
    key: string,
    freshSeconds: number,
    staleSeconds: number,
  ): Promise<CacheLookup> {
    const raw = await this.kv.get(this.versioned(key), 'json');
    if (!raw) return { entry: null, freshness: 'miss' };
    const entry = raw as CachedCard;
    const ageSeconds = (Date.now() - entry.storedAt) / 1000;
    if (ageSeconds <= freshSeconds) return { entry, freshness: 'fresh' };
    if (ageSeconds <= staleSeconds) return { entry, freshness: 'stale' };
    return { entry, freshness: 'miss' };
  }

  async put(key: string, svg: string): Promise<CachedCard> {
    const entry: CachedCard = {
      svg,
      etag: computeEtag(svg),
      storedAt: Date.now(),
    };
    // Keep entries around a bit beyond the stale window so a slow revalidate
    // still finds a last-good card. TTL is a coarse safety net; freshness is
    // decided by storedAt above. Min KV TTL is 60s.
    await this.kv.put(this.versioned(key), JSON.stringify(entry), {
      expirationTtl: 60 * 60 * 24 * 7,
    });
    return entry;
  }
}
