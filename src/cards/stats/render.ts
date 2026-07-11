import { resolveBackground } from '../../render/background.js';
import { FONT_STACK } from '../../render/constants.js';
import { STAT_ICON_PATHS } from '../../render/icons.js';
import type { Theme } from '../../themes/index.js';
import { escapeXml } from '../../util/xml.js';
import type { StatsCardModel } from './transform.js';

export interface RenderOptions {
  hideBorder: boolean;
  borderRadius: number;
  /** Optional fixed card width in px; defaults to DEFAULT_WIDTH when omitted. */
  width?: number | undefined;
}

const PAD_X = 25;
const HEADER_Y = 33;
const ROW_START = 66;
const ROW_H = 28;
const DEFAULT_WIDTH = 467;

/**
 * Render the stats card to a self-contained SVG string. No external refs, all
 * user-derived text escaped. Layout is hand-authored for tight control and
 * deterministic snapshots. Width is configurable via `card_width` so cards can
 * share edges in a README grid.
 */
export function renderStatsCard(
  model: StatsCardModel,
  theme: Theme,
  options: RenderOptions,
): string {
  const WIDTH = options.width ?? DEFAULT_WIDTH;
  const rows = model.items.length;
  const contentHeight = ROW_START + rows * ROW_H;
  const height = Math.max(contentHeight + 12, model.rank ? 165 : 120);
  const { defs, fill } = resolveBackground(theme, 'sigil-stats-bg');
  const title = escapeXml(model.title);

  const border = options.hideBorder
    ? ''
    : `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="${options.borderRadius}" fill="none" stroke="${theme.borderColor}"/>`;

  const bgRect = `<rect x="0" y="0" width="${WIDTH}" height="${height}" rx="${options.borderRadius}" fill="${fill}"/>`;

  const rowsSvg = model.items
    .map((item, i) => {
      const y = ROW_START + i * ROW_H;
      const icon = model.showIcons
        ? `<g transform="translate(${PAD_X}, ${y - 12})"><path d="${STAT_ICON_PATHS[item.key]}" fill="${theme.iconColor}"/></g>`
        : '';
      const labelX = model.showIcons ? PAD_X + 26 : PAD_X;
      return `<g>
    ${icon}
    <text x="${labelX}" y="${y}" font-family="${FONT_STACK}" font-size="14" fill="${theme.textColor}">${escapeXml(item.label)}</text>
    <text x="${WIDTH - PAD_X - (model.rank ? 90 : 0)}" y="${y}" text-anchor="end" font-family="${FONT_STACK}" font-size="14" font-weight="700" fill="${theme.textColor}">${escapeXml(item.value)}</text>
  </g>`;
    })
    .join('\n  ');

  const rankSvg = model.rank ? renderRank(model.rank, theme, WIDTH, height) : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-labelledby="sigil-title sigil-desc">
  <title id="sigil-title">${title}</title>
  <desc id="sigil-desc">GitHub statistics card rendered by sigil</desc>
  <defs>${defs}</defs>
  ${bgRect}
  ${border}
  <text x="${PAD_X}" y="${HEADER_Y}" font-family="${FONT_STACK}" font-size="18" font-weight="700" fill="${theme.titleColor}">${title}</text>
  ${rowsSvg}
  ${rankSvg}
</svg>`;
}

/** A rank ring with the letter grade and "top N%" caption, on the right side. */
function renderRank(
  rank: { level: string; percentile: number },
  theme: Theme,
  width: number,
  height: number,
): string {
  const cx = width - 62;
  const cy = height / 2 + 6;
  const r = 38;
  const circumference = 2 * Math.PI * r;
  // Fill proportion of the ring: better rank (smaller percentile) => fuller.
  const progress = (100 - rank.percentile) / 100;
  const dash = circumference * progress;
  const gap = circumference - dash;

  return `<g transform="translate(${cx}, ${cy})">
    <circle r="${r}" fill="none" stroke="${theme.borderColor}" stroke-width="6"/>
    <circle r="${r}" fill="none" stroke="${theme.accentColor}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}" transform="rotate(-90)"/>
    <text x="0" y="-2" text-anchor="middle" font-family="${FONT_STACK}" font-size="22" font-weight="800" fill="${theme.titleColor}">${escapeXml(rank.level)}</text>
    <text x="0" y="16" text-anchor="middle" font-family="${FONT_STACK}" font-size="10" fill="${theme.mutedColor}">Top ${rank.percentile}%</text>
  </g>`;
}
