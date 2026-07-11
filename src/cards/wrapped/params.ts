import type { ThemeOverrides } from '../../themes/index.js';
import { parseCardWidth, parseThemeOverrides } from '../common-params.js';
import { ParamError } from '../params-error.js';

export interface WrappedParams {
  username: string;
  year: number;
  theme: string;
  overrides: ThemeOverrides;
  hideBorder: boolean;
  borderRadius: number;
  cardWidth: number | undefined;
}

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

export function parseWrappedParams(
  q: URLSearchParams,
  now: Date = new Date(),
): WrappedParams {
  const username = (q.get('username') ?? '').trim();
  if (!USERNAME_RE.test(username)) {
    throw new ParamError('Missing or invalid "username"');
  }

  const currentYear = now.getUTCFullYear();
  const yearRaw = q.get('year');
  const yearNum = yearRaw ? parseInt(yearRaw, 10) : currentYear;
  // GitHub launched in 2008; clamp to a sane range.
  const year = Number.isFinite(yearNum)
    ? Math.max(2008, Math.min(currentYear, yearNum))
    : currentYear;

  const radiusRaw = q.get('border_radius');
  const radius = radiusRaw ? Number(radiusRaw) : 8;
  const borderRadius = Number.isFinite(radius) ? Math.max(0, Math.min(24, radius)) : 8;

  return {
    username,
    year,
    theme: (q.get('theme') ?? 'default').trim().toLowerCase(),
    overrides: parseThemeOverrides(q),
    hideBorder: parseBool(q.get('hide_border') ?? undefined, false),
    borderRadius,
    cardWidth: parseCardWidth(q.get('card_width') ?? undefined),
  };
}

export function wrappedCacheKey(p: WrappedParams): string {
  const parts: string[] = [
    `u=${p.username.toLowerCase()}`,
    `year=${p.year}`,
    `theme=${p.theme}`,
    `border=${p.hideBorder ? 0 : 1}`,
    `radius=${p.borderRadius}`,
    `w=${p.cardWidth ?? ''}`,
  ];
  for (const [k, v] of Object.entries(p.overrides)) {
    if (v) parts.push(`${k}=${v}`);
  }
  return `card:wrapped:${parts.join('|')}`;
}
