import type { ThemeOverrides } from '../../themes/index.js';
import { ALL_STAT_KEYS, type StatKey } from './transform.js';

/** Everything the stats endpoint needs, validated and normalized. */
export interface StatsParams {
  username: string;
  theme: string;
  overrides: ThemeOverrides;
  show: StatKey[] | undefined;
  hide: StatKey[] | undefined;
  showIcons: boolean;
  countPrivate: boolean;
  hideRank: boolean;
  hideBorder: boolean;
  borderRadius: number;
  title: string | undefined;
}

export class ParamError extends Error {}

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const STAT_KEY_SET = new Set<string>(ALL_STAT_KEYS);

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

function parseKeys(raw: string | undefined): StatKey[] | undefined {
  if (!raw) return undefined;
  const keys = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is StatKey => STAT_KEY_SET.has(s));
  return keys.length > 0 ? keys : undefined;
}

/**
 * Parse + validate query params at the boundary. Throws ParamError only for a
 * missing/invalid username (the one thing we can't render without); every other
 * param falls back to a sane default so a typo never breaks the card.
 */
export function parseStatsParams(q: URLSearchParams): StatsParams {
  const username = (q.get('username') ?? '').trim();
  if (!USERNAME_RE.test(username)) {
    throw new ParamError('Missing or invalid "username"');
  }

  const radiusRaw = q.get('border_radius');
  const radius = radiusRaw ? Number(radiusRaw) : 8;
  const borderRadius = Number.isFinite(radius) ? Math.max(0, Math.min(24, radius)) : 8;

  const title = q.get('title') ?? undefined;

  return {
    username,
    theme: (q.get('theme') ?? 'default').trim().toLowerCase(),
    overrides: {
      title_color: q.get('title_color') ?? undefined,
      text_color: q.get('text_color') ?? undefined,
      muted_color: q.get('muted_color') ?? undefined,
      icon_color: q.get('icon_color') ?? undefined,
      bg_color: q.get('bg_color') ?? undefined,
      border_color: q.get('border_color') ?? undefined,
      accent_color: q.get('accent_color') ?? undefined,
    },
    show: parseKeys(q.get('show') ?? undefined),
    hide: parseKeys(q.get('hide') ?? undefined),
    showIcons: parseBool(q.get('show_icons') ?? undefined, true),
    countPrivate: parseBool(q.get('count_private') ?? undefined, false),
    hideRank: parseBool(q.get('hide_rank') ?? undefined, false),
    hideBorder: parseBool(q.get('hide_border') ?? undefined, false),
    borderRadius,
    // Cap title length to keep the SVG bounded; escaping happens at render.
    title: title ? title.slice(0, 60) : undefined,
  };
}

/**
 * Build the normalized cache key from parsed params. Equivalent URLs (param
 * order/casing) must map to the same key, so we serialize a canonical subset.
 */
export function statsCacheKey(p: StatsParams): string {
  const parts: string[] = [
    `u=${p.username.toLowerCase()}`,
    `theme=${p.theme}`,
    `show=${(p.show ?? []).join('.')}`,
    `hide=${(p.hide ?? []).join('.')}`,
    `icons=${p.showIcons ? 1 : 0}`,
    `priv=${p.countPrivate ? 1 : 0}`,
    `rank=${p.hideRank ? 0 : 1}`,
    `border=${p.hideBorder ? 0 : 1}`,
    `radius=${p.borderRadius}`,
    `title=${p.title ?? ''}`,
  ];
  for (const [k, v] of Object.entries(p.overrides)) {
    if (v) parts.push(`${k}=${v}`);
  }
  return `card:stats:${parts.join('|')}`;
}
