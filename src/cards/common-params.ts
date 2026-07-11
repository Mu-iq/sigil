/** Shared query-param helpers used by every card's boundary parser. */

export const MIN_CARD_WIDTH = 300;
export const MAX_CARD_WIDTH = 900;

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
