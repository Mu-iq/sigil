import type { ThemeOverrides } from '../../themes/index.js';
import { parseCardWidth, parseThemeOverrides } from '../common-params.js';
import { ParamError } from '../params-error.js';

export interface ActivityParams {
  username: string;
  theme: string;
  overrides: ThemeOverrides;
  /** Window size in days (7–365). */
  days: number;
  hideBorder: boolean;
  borderRadius: number;
  cardWidth: number | undefined;
  title: string | undefined;
}

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

export function parseActivityParams(q: URLSearchParams): ActivityParams {
  const username = (q.get('username') ?? '').trim();
  if (!USERNAME_RE.test(username)) {
    throw new ParamError('Missing or invalid "username"');
  }

  const daysRaw = q.get('days');
  const daysNum = daysRaw ? Number(daysRaw) : 30;
  const days = Number.isFinite(daysNum)
    ? Math.max(7, Math.min(365, Math.round(daysNum)))
    : 30;

  const radiusRaw = q.get('border_radius');
  const radius = radiusRaw ? Number(radiusRaw) : 8;
  const borderRadius = Number.isFinite(radius) ? Math.max(0, Math.min(24, radius)) : 8;

  const title = q.get('title') ?? undefined;

  return {
    username,
    theme: (q.get('theme') ?? 'default').trim().toLowerCase(),
    overrides: parseThemeOverrides(q),
    days,
    hideBorder: parseBool(q.get('hide_border') ?? undefined, false),
    borderRadius,
    cardWidth: parseCardWidth(q.get('card_width') ?? undefined),
    title: title ? title.slice(0, 60) : undefined,
  };
}

export function activityCacheKey(p: ActivityParams): string {
  const parts: string[] = [
    `u=${p.username.toLowerCase()}`,
    `theme=${p.theme}`,
    `days=${p.days}`,
    `border=${p.hideBorder ? 0 : 1}`,
    `radius=${p.borderRadius}`,
    `w=${p.cardWidth ?? ''}`,
    `title=${p.title ?? ''}`,
  ];
  for (const [k, v] of Object.entries(p.overrides)) {
    if (v) parts.push(`${k}=${v}`);
  }
  return `card:activity:${parts.join('|')}`;
}
