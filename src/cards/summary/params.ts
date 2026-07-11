import type { ThemeOverrides } from '../../themes/index.js';
import { ParamError } from '../params-error.js';

export interface SummaryParams {
  username: string;
  theme: string;
  overrides: ThemeOverrides;
  hideBorder: boolean;
  borderRadius: number;
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

export function parseSummaryParams(q: URLSearchParams): SummaryParams {
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
    hideBorder: parseBool(q.get('hide_border') ?? undefined, false),
    borderRadius,
    title: title ? title.slice(0, 60) : undefined,
  };
}

export function summaryCacheKey(p: SummaryParams): string {
  const parts: string[] = [
    `u=${p.username.toLowerCase()}`,
    `theme=${p.theme}`,
    `border=${p.hideBorder ? 0 : 1}`,
    `radius=${p.borderRadius}`,
    `title=${p.title ?? ''}`,
  ];
  for (const [k, v] of Object.entries(p.overrides)) {
    if (v) parts.push(`${k}=${v}`);
  }
  return `card:summary:${parts.join('|')}`;
}
