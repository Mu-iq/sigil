import { FONT_STACK } from '../../render/constants.js';
import { cardFrame } from '../../render/frame.js';
import type { Theme } from '../../themes/index.js';
import { formatDayLabel } from '../../util/date.js';
import { escapeXml } from '../../util/xml.js';
import type { ActivityModel } from './types.js';

export interface ActivityRenderOptions {
  title: string;
  hideBorder: boolean;
  borderRadius: number;
}

const WIDTH = 495;
const HEIGHT = 220;
const LEFT = 40;
const RIGHT = WIDTH - 25;
const TOP = 70;
const BOTTOM = HEIGHT - 32;

/**
 * Render the activity graph as a hand-authored area+line chart (Satori is weak
 * at charts). Self-contained SVG, all labels escaped.
 */
export function renderActivityCard(
  model: ActivityModel,
  theme: Theme,
  options: ActivityRenderOptions,
): string {
  const { open, close } = cardFrame({
    width: WIDTH,
    height: HEIGHT,
    theme,
    title: options.title,
    desc: `Daily contribution activity, ${model.total} in the window, rendered by sigil`,
    hideBorder: options.hideBorder,
    borderRadius: options.borderRadius,
    idPrefix: 'sigil-activity',
  });

  const summary = `<text x="25" y="52" font-family="${FONT_STACK}" font-size="12" fill="${theme.mutedColor}">${model.total} contributions · avg ${model.average}/day · peak ${model.max}</text>`;

  const chart = renderChart(model, theme);
  const axis = renderAxis(model, theme);

  return `${open}
  ${summary}
  ${axis}
  ${chart}
${close}`;
}

function renderChart(model: ActivityModel, theme: Theme): string {
  const n = model.points.length;
  if (n === 0) {
    return `<text x="25" y="130" font-family="${FONT_STACK}" font-size="13" fill="${theme.mutedColor}">No contribution data in this window.</text>`;
  }

  const chartW = RIGHT - LEFT;
  const chartH = BOTTOM - TOP;
  const scaleMax = model.max > 0 ? model.max : 1;
  const step = n > 1 ? chartW / (n - 1) : 0;

  const coords = model.points.map((p, i) => {
    const x = LEFT + i * step;
    const y = BOTTOM - (p.count / scaleMax) * chartH;
    return { x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${BOTTOM} L ${first.x.toFixed(1)} ${BOTTOM} Z`;

  return `<defs>
    <linearGradient id="sigil-activity-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.accentColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${theme.accentColor}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <path d="${areaPath}" fill="url(#sigil-activity-fill)"/>
  <path d="${linePath}" fill="none" stroke="${theme.accentColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function renderAxis(model: ActivityModel, theme: Theme): string {
  const scaleMax = model.max > 0 ? model.max : 1;
  // Baseline + a midline gridline, with y-axis value labels.
  const midY = (TOP + BOTTOM) / 2;
  const gridlines = `
  <line x1="${LEFT}" y1="${BOTTOM}" x2="${RIGHT}" y2="${BOTTOM}" stroke="${theme.borderColor}"/>
  <line x1="${LEFT}" y1="${midY}" x2="${RIGHT}" y2="${midY}" stroke="${theme.borderColor}" stroke-opacity="0.4"/>
  <text x="${LEFT - 6}" y="${BOTTOM + 3}" text-anchor="end" font-family="${FONT_STACK}" font-size="9" fill="${theme.mutedColor}">0</text>
  <text x="${LEFT - 6}" y="${midY + 3}" text-anchor="end" font-family="${FONT_STACK}" font-size="9" fill="${theme.mutedColor}">${Math.round(scaleMax / 2)}</text>
  <text x="${LEFT - 6}" y="${TOP + 3}" text-anchor="end" font-family="${FONT_STACK}" font-size="9" fill="${theme.mutedColor}">${scaleMax}</text>`;

  const startLabel = escapeXml(formatDayLabel(model.startDate));
  const endLabel = escapeXml(formatDayLabel(model.endDate));
  const dateLabels = `
  <text x="${LEFT}" y="${BOTTOM + 18}" font-family="${FONT_STACK}" font-size="10" fill="${theme.mutedColor}">${startLabel}</text>
  <text x="${RIGHT}" y="${BOTTOM + 18}" text-anchor="end" font-family="${FONT_STACK}" font-size="10" fill="${theme.mutedColor}">${endLabel}</text>`;

  return gridlines + dateLabels;
}
