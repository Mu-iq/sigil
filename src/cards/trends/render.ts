import { FONT_STACK } from '../../render/constants.js';
import { cardFrame } from '../../render/frame.js';
import type { Theme } from '../../themes/index.js';
import { formatCompact } from '../../util/format.js';
import { escapeXml } from '../../util/xml.js';
import { hasEnoughHistory, type TrendPoint } from '../../snapshots/trends.js';

export interface TrendsRenderOptions {
  title: string;
  metricLabel: string;
  hideBorder: boolean;
  borderRadius: number;
}

const WIDTH = 495;
const HEIGHT = 200;
const LEFT = 44;
const RIGHT = WIDTH - 25;
const TOP = 72;
const BOTTOM = HEIGHT - 30;

/**
 * Render a snapshot-backed trend line for one metric. When there isn't enough
 * history yet, render a friendly "collecting" state — still valid SVG, never a
 * broken image and never a misleading flat line.
 */
export function renderTrendsCard(
  series: TrendPoint[],
  theme: Theme,
  options: TrendsRenderOptions,
): string {
  const { open, close } = cardFrame({
    width: WIDTH,
    height: HEIGHT,
    theme,
    title: options.title,
    desc: `${options.metricLabel} trend from historical snapshots, rendered by sigil`,
    hideBorder: options.hideBorder,
    borderRadius: options.borderRadius,
    idPrefix: 'sigil-trends',
  });

  if (!hasEnoughHistory(series)) {
    return `${open}
  <text x="25" y="95" font-family="${FONT_STACK}" font-size="13" fill="${theme.textColor}">Trend data is still being collected.</text>
  <text x="25" y="118" font-family="${FONT_STACK}" font-size="11" fill="${theme.mutedColor}">This card fills in as snapshots accumulate — check back soon.</text>
${close}`;
  }

  const first = series[0]!.value;
  const last = series[series.length - 1]!.value;
  const change = last - first;
  const sign = change >= 0 ? '+' : '−';
  const changeColor = change >= 0 ? theme.accentColor : theme.mutedColor;

  const summary = `<text x="25" y="52" font-family="${FONT_STACK}" font-size="12" fill="${theme.mutedColor}">${escapeXml(options.metricLabel)} · now ${formatCompact(last)} · <tspan fill="${changeColor}">${sign}${formatCompact(Math.abs(change))}</tspan> over ${series.length} snapshots</text>`;

  return `${open}
  ${summary}
  ${renderLine(series, theme)}
${close}`;
}

function renderLine(series: TrendPoint[], theme: Theme): string {
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const chartW = RIGHT - LEFT;
  const chartH = BOTTOM - TOP;
  const step = series.length > 1 ? chartW / (series.length - 1) : 0;

  const coords = series.map((p, i) => ({
    x: LEFT + i * step,
    y: BOTTOM - ((p.value - min) / span) * chartH,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${BOTTOM} L ${first.x.toFixed(1)} ${BOTTOM} Z`;

  return `<defs>
    <linearGradient id="sigil-trends-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.accentColor}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${theme.accentColor}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <line x1="${LEFT}" y1="${BOTTOM}" x2="${RIGHT}" y2="${BOTTOM}" stroke="${theme.borderColor}"/>
  <text x="${LEFT - 6}" y="${TOP + 3}" text-anchor="end" font-family="${FONT_STACK}" font-size="9" fill="${theme.mutedColor}">${formatCompact(max)}</text>
  <text x="${LEFT - 6}" y="${BOTTOM + 3}" text-anchor="end" font-family="${FONT_STACK}" font-size="9" fill="${theme.mutedColor}">${formatCompact(min)}</text>
  <path d="${areaPath}" fill="url(#sigil-trends-fill)"/>
  <path d="${linePath}" fill="none" stroke="${theme.accentColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3" fill="${theme.accentColor}"/>`;
}
