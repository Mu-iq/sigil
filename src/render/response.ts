import type { CachedCard } from '../cache/kv.js';

/**
 * Build an HTTP response for an SVG card. Always image/svg+xml. `maxAge` sets
 * the browser/Camo cache window; `stale` toggles whether we advertise the
 * response as already-stale (revalidating in background).
 */
export function svgResponse(
  card: { svg: string; etag: string },
  opts: { maxAge: number; status?: number },
): Response {
  return new Response(card.svg, {
    status: opts.status ?? 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': `max-age=${opts.maxAge}, s-maxage=${opts.maxAge}, stale-while-revalidate=86400`,
      ETag: card.etag,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/** 304 when the client's ETag matches — saves re-sending the SVG bytes. */
export function notModified(etag: string): Response {
  return new Response(null, {
    status: 304,
    headers: { ETag: etag, 'Cache-Control': 'max-age=0' },
  });
}

export function etagMatches(request: Request, entry: CachedCard): boolean {
  const inm = request.headers.get('If-None-Match');
  return inm !== null && inm === entry.etag;
}
