/** Shared query-param helpers used by every card's boundary parser. */

import type { ThemeOverrides } from '../themes/index.js';

export const MIN_CARD_WIDTH = 300;
export const MAX_CARD_WIDTH = 900;

/**
 * Parse the custom-theme color overrides shared by every card. `accent` is a
 * short alias for `accent_color` — it overrides the single theme accent, so
 * rings, lines, and (in mono mode) language shades all follow it. Validation of
 * the color values happens in the theme resolver.
 */
export function parseThemeOverrides(q: URLSearchParams): ThemeOverrides {
  return {
    title_color: q.get('title_color') ?? undefined,
    text_color: q.get('text_color') ?? undefined,
    muted_color: q.get('muted_color') ?? undefined,
    icon_color: q.get('icon_color') ?? undefined,
    bg_color: q.get('bg_color') ?? undefined,
    border_color: q.get('border_color') ?? undefined,
    accent_color: q.get('accent_color') ?? q.get('accent') ?? undefined,
  };
}

/**
 * Parse the optional `card_width` param. Returns a clamped integer width, or
 * undefined when omitted/invalid so each card keeps its own sensible default.
 * Uniform sizing lets a profile request every card at the same width so a grid
 * lines up on all edges.
 */
export function parseCardWidth(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, Math.round(n)));
}
