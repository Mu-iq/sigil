import { resolveBackground } from '../../render/background.js';
import { FONT_STACK } from '../../render/constants.js';
import type { Theme } from '../../themes/index.js';
import { formatDayLabel } from '../../util/date.js';
import { formatCompact } from '../../util/format.js';
import { escapeXml } from '../../util/xml.js';
import type { WrappedModel } from './types.js';

export interface WrappedRenderOptions {
  login: string;
  hideBorder: boolean;
  borderRadius: number;
  width?: number | undefined;
}

const DEFAULT_WIDTH = 500;
const HEIGHT = 250;

/**
 * Render the Year-in-Review / Wrapped card: a left hero (year + total) and a
 * right column of highlights, designed to look good shared to social. Width is
 * configurable via `card_width`. Fully self-contained SVG, all text escaped.
 */
export function renderWrappedCard(
  model: WrappedModel,
  theme: Theme,
  options: WrappedRenderOptions,
): string {
  const WIDTH = options.width ?? DEFAULT_WIDTH;
  const DIV_X = Math.round(WIDTH / 2); // divider between hero and highlights
  const HERO_X = Math.round(WIDTH / 4); // center of the left hero column
  const { defs, fill } = resolveBackground(theme, 'sigil-wrapped-bg');
  const border = options.hideBorder
    ? ''
    : `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="${options.borderRadius}" fill="none" stroke="${theme.borderColor}"/>`;

  const hero = `<g text-anchor="middle" font-family="${FONT_STACK}">
    <text x="${HERO_X}" y="60" font-size="20" font-weight="700" fill="${theme.titleColor}">${model.year} in Review</text>
    <text x="${HERO_X}" y="128" font-size="52" font-weight="800" fill="${theme.accentColor}">${escapeXml(formatCompact(model.totalContributions))}</text>
    <text x="${HERO_X}" y="152" font-size="14" fill="${theme.textColor}">contributions</text>
    <text x="${HERO_X}" y="192" font-size="12" fill="${theme.mutedColor}">${model.activeDays} active days</text>
  </g>`;

  const highlights = renderHighlights(model, theme, DIV_X + 24);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="sigil-wrapped-title sigil-wrapped-desc">
  <title id="sigil-wrapped-title">${escapeXml(options.login)}'s ${model.year} GitHub Wrapped</title>
  <desc id="sigil-wrapped-desc">${model.totalContributions} contributions in ${model.year}, rendered by sigil</desc>
  <defs>${defs}</defs>
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="${options.borderRadius}" fill="${fill}"/>
  ${border}
  <text x="24" y="30" font-family="${FONT_STACK}" font-size="12" fill="${theme.mutedColor}">@${escapeXml(options.login)}</text>
  <line x1="${DIV_X}" y1="40" x2="${DIV_X}" y2="${HEIGHT - 30}" stroke="${theme.borderColor}"/>
  ${hero}
  ${highlights}
</svg>`;
}

function renderHighlights(model: WrappedModel, theme: Theme, startX: number): string {
  const rows: Array<{ label: string; value: string; dot?: string }> = [
    { label: 'Longest streak', value: `${model.longestStreak} days` },
    {
      label: 'Busiest month',
      value: model.busiestMonth
        ? `${model.busiestMonth.month} (${formatCompact(model.busiestMonth.count)})`
        : '—',
    },
    {
      label: 'Best day',
      value: model.bestDay
        ? `${formatDayLabel(model.bestDay.date)} (${model.bestDay.count})`
        : '—',
    },
    {
      label: 'Top language',
      value: model.topLanguage ? model.topLanguage.name : '—',
      dot: model.topLanguage?.color,
    },
  ];

  const startY = 66;
  const rowH = 42;

  return rows
    .map((r, i) => {
      const y = startY + i * rowH;
      const dot = r.dot
        ? `<circle cx="${startX + 6}" cy="${y + 8}" r="5" fill="${r.dot}"/>`
        : '';
      const valueX = r.dot ? startX + 18 : startX;
      return `<g font-family="${FONT_STACK}">
    <text x="${startX}" y="${y}" font-size="11" fill="${theme.mutedColor}">${escapeXml(r.label)}</text>
    ${dot}
    <text x="${valueX}" y="${y + 13}" font-size="15" font-weight="700" fill="${theme.textColor}">${escapeXml(r.value)}</text>
  </g>`;
    })
    .join('\n  ');
}
