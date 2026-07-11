import { BUILTIN_THEME_NAMES } from '../src/themes/index.js';

/** Card types the Action can render as static SVG (live-data cards only). */
export const ACTION_CARDS = [
  'stats',
  'languages',
  'streak',
  'activity',
  'wrapped',
] as const;
export type ActionCard = (typeof ACTION_CARDS)[number];

export interface ActionConfig {
  username: string;
  token: string;
  theme: string;
  cards: ActionCard[];
  outDir: string;
  timeZone: string;
  langLayout: 'normal' | 'compact' | 'donut';
  timeoutMs: number;
}

export class ConfigError extends Error {}

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const CARD_SET = new Set<string>(ACTION_CARDS);
const THEME_SET = new Set<string>(BUILTIN_THEME_NAMES);
const LAYOUTS = new Set(['normal', 'compact', 'donut']);

/**
 * Parse + validate the Action's configuration from an env-like map. Pure and
 * testable — the runner does the I/O. Throws ConfigError on anything that would
 * make the render meaningless (missing username or token, no valid cards).
 */
export function parseActionConfig(env: Record<string, string | undefined>): ActionConfig {
  const username = (env.SIGIL_USERNAME ?? '').trim();
  if (!USERNAME_RE.test(username)) {
    throw new ConfigError('SIGIL_USERNAME is required and must be a valid GitHub login');
  }

  const token = (env.GH_TOKEN ?? env.GITHUB_TOKEN ?? env.PAT_1 ?? '').trim();
  if (!token) {
    throw new ConfigError('A token is required (set GH_TOKEN, GITHUB_TOKEN, or PAT_1)');
  }

  const themeRaw = (env.SIGIL_THEME ?? 'default').trim().toLowerCase();
  const theme = THEME_SET.has(themeRaw) ? themeRaw : 'default';

  const cards = (env.SIGIL_CARDS ?? 'stats,languages,streak,activity')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter((c): c is ActionCard => CARD_SET.has(c));
  if (cards.length === 0) {
    throw new ConfigError(
      `SIGIL_CARDS has no valid cards. Choose from: ${ACTION_CARDS.join(', ')}`,
    );
  }

  const layoutRaw = (env.SIGIL_LANG_LAYOUT ?? 'compact').trim().toLowerCase();
  const langLayout = (
    LAYOUTS.has(layoutRaw) ? layoutRaw : 'compact'
  ) as ActionConfig['langLayout'];

  const timeoutRaw = env.SIGIL_TIMEOUT_MS ? Number(env.SIGIL_TIMEOUT_MS) : 10000;
  const timeoutMs = Number.isFinite(timeoutRaw) ? Math.max(1000, timeoutRaw) : 10000;

  return {
    username,
    token,
    theme,
    cards: [...new Set(cards)],
    outDir: (env.SIGIL_OUT ?? 'sigil-cards').trim() || 'sigil-cards',
    timeZone: (env.SIGIL_TZ ?? 'UTC').trim() || 'UTC',
    langLayout,
    timeoutMs,
  };
}
