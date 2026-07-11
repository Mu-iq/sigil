import { resolveBackground } from '../../render/background.js';
import { FONT_STACK } from '../../render/constants.js';
import type { Theme } from '../../themes/index.js';
import { formatDayLabel } from '../../util/date.js';
import { escapeXml } from '../../util/xml.js';
import { formatCompact } from '../../util/format.js';
import type { StreakModel, StreakRange } from './types.js';

export interface StreakRenderOptions {
  hideBorder: boolean;
  borderRadius: number;
  width?: number | undefined;
}

const DEFAULT_WIDTH = 495;
const HEIGHT = 165;
// Shared vertical anchors keep internal padding tight and consistent.
const PAD_Y = 20;
const NUM_Y = 70; // baseline of the big number
const LABEL_Y = 98;
const CAPTION_Y = 118;
const RING_CY = 62;
const RING_R = 32;

/**
 * Render the streak card: three columns (total | current | longest) with the
 * current-streak ring highlighted in the theme accent. Width is configurable
 * via `card_width`. Self-contained SVG, all user-derived text escaped.
 */
export function renderStreakCard(
  model: StreakModel,
  theme: Theme,
  options: StreakRenderOptions,
): string {
  const WIDTH = options.width ?? DEFAULT_WIDTH;
  const COL = WIDTH / 3;
  const { defs, fill } = resolveBackground(theme, 'sigil-streak-bg');
  const border = options.hideBorder
    ? ''
    : `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="${options.borderRadius}" fill="none" stroke="${theme.borderColor}"/>`;

  const dividers = `
  <line x1="${COL}" y1="${PAD_Y}" x2="${COL}" y2="${HEIGHT - PAD_Y}" stroke="${theme.borderColor}"/>
  <line x1="${COL * 2}" y1="${PAD_Y}" x2="${COL * 2}" y2="${HEIGHT - PAD_Y}" stroke="${theme.borderColor}"/>`;

  const totalCol = sideColumn(
    COL * 0.5,
    formatCompact(model.totalContributions),
    'Total Contributions',
    rangeCaption(model.firstDate, 'Present'),
    theme,
  );
  const longestCol = sideColumn(
    COL * 2.5,
    String(model.longestStreak.length),
    'Longest Streak',
    streakCaption(model.longestStreak),
    theme,
  );
  const currentCol = currentColumn(COL * 1.5, model.currentStreak, theme);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="sigil-streak-title sigil-streak-desc">
  <title id="sigil-streak-title">Contribution streak</title>
  <desc id="sigil-streak-desc">Current streak ${model.currentStreak.length} days, longest ${model.longestStreak.length} days, rendered by sigil</desc>
  <defs>${defs}</defs>
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="${options.borderRadius}" fill="${fill}"/>
  ${border}
  ${dividers}
  ${totalCol}
  ${currentCol}
  ${longestCol}
</svg>`;
}

/** A plain side column: big number, label, caption. */
function sideColumn(
  cx: number,
  value: string,
  label: string,
  caption: string,
  theme: Theme,
): string {
  return `<g text-anchor="middle" font-family="${FONT_STACK}">
    <text x="${cx}" y="${NUM_Y}" font-size="30" font-weight="800" fill="${theme.textColor}">${escapeXml(value)}</text>
    <text x="${cx}" y="${LABEL_Y}" font-size="14" font-weight="700" fill="${theme.titleColor}">${escapeXml(label)}</text>
    <text x="${cx}" y="${CAPTION_Y}" font-size="11" fill="${theme.mutedColor}">${escapeXml(caption)}</text>
  </g>`;
}

/** The centered, highlighted current-streak column with a ring. */
function currentColumn(cx: number, streak: StreakRange, theme: Theme): string {
  return `<g font-family="${FONT_STACK}" text-anchor="middle">
    <circle cx="${cx}" cy="${RING_CY}" r="${RING_R}" fill="none" stroke="${theme.accentColor}" stroke-width="4"/>
    <text x="${cx}" y="${RING_CY + 8}" font-size="26" font-weight="800" fill="${theme.accentColor}">${streak.length}</text>
    <text x="${cx}" y="${LABEL_Y + 14}" font-size="14" font-weight="700" fill="${theme.titleColor}">Current Streak</text>
    <text x="${cx}" y="${CAPTION_Y + 14}" font-size="11" fill="${theme.mutedColor}">${escapeXml(streakCaption(streak))}</text>
  </g>`;
}

function streakCaption(streak: StreakRange): string {
  if (streak.length === 0 || !streak.startDate) return '—';
  if (streak.startDate === streak.endDate) return formatDayLabel(streak.startDate);
  return `${formatDayLabel(streak.startDate)} – ${formatDayLabel(streak.endDate)}`;
}

function rangeCaption(from: string | null, to: string): string {
  if (!from) return '—';
  return `${formatDayLabel(from)} – ${to}`;
}
