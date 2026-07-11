import type { ThemeOverrides } from '../../themes/index.js';
import { parseCardWidth } from '../common-params.js';
import { ParamError } from '../params-error.js';
import type { LanguagesLayout } from './render.js';
import type { LanguageWeight } from './types.js';

export interface LanguagesParams {
  username: string;
  theme: string;
  overrides: ThemeOverrides;
  layout: LanguagesLayout;
  weight: LanguageWeight;
  langsCount: number;
  excludeRepos: string[] | undefined;
  hideLanguages: string[] | undefined;
  includePrivate: boolean;
  hideBorder: boolean;
  borderRadius: number;
  cardWidth: number | undefined;
  title: string | undefined;
}

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const LAYOUTS = new Set<LanguagesLayout>(['normal', 'compact', 'donut']);

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

/** Default is `count` (repo-count) so byte-heavy files don't dominate. */
function parseWeight(raw: string | null): LanguageWeight {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'bytes':
    case 'size': // backwards-compatible alias for byte weighting
      return 'bytes';
    case 'hybrid':
      return 'hybrid';
    case 'count':
      return 'count';
    default:
      return 'count';
  }
}

function parseList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 50); // bound input
  return items.length > 0 ? items : undefined;
}

export function parseLanguagesParams(q: URLSearchParams): LanguagesParams {
  const username = (q.get('username') ?? '').trim();
  if (!USERNAME_RE.test(username)) {
    throw new ParamError('Missing or invalid "username"');
  }

  const layoutRaw = (q.get('layout') ?? 'normal').trim().toLowerCase();
  const layout = LAYOUTS.has(layoutRaw as LanguagesLayout)
    ? (layoutRaw as LanguagesLayout)
    : 'normal';

  const weight = parseWeight(q.get('weight'));

  const countRaw = q.get('langs_count');
  const count = countRaw ? Number(countRaw) : 6;
  const langsCount = Number.isFinite(count) ? Math.max(1, Math.min(12, count)) : 6;

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
    layout,
    weight,
    langsCount,
    excludeRepos: parseList(q.get('exclude_repo') ?? undefined),
    hideLanguages: parseList(q.get('hide') ?? undefined),
    includePrivate: parseBool(q.get('include_private') ?? undefined, false),
    hideBorder: parseBool(q.get('hide_border') ?? undefined, false),
    borderRadius,
    cardWidth: parseCardWidth(q.get('card_width') ?? undefined),
    title: title ? title.slice(0, 60) : undefined,
  };
}

export function languagesCacheKey(p: LanguagesParams): string {
  const parts: string[] = [
    `u=${p.username.toLowerCase()}`,
    `theme=${p.theme}`,
    `layout=${p.layout}`,
    `weight=${p.weight}`,
    `n=${p.langsCount}`,
    `xrepo=${(p.excludeRepos ?? [])
      .map((s) => s.toLowerCase())
      .sort()
      .join('.')}`,
    `hide=${(p.hideLanguages ?? [])
      .map((s) => s.toLowerCase())
      .sort()
      .join('.')}`,
    `priv=${p.includePrivate ? 1 : 0}`,
    `border=${p.hideBorder ? 0 : 1}`,
    `radius=${p.borderRadius}`,
    `w=${p.cardWidth ?? ''}`,
    `title=${p.title ?? ''}`,
  ];
  for (const [k, v] of Object.entries(p.overrides)) {
    if (v) parts.push(`${k}=${v}`);
  }
  return `card:languages:${parts.join('|')}`;
}
