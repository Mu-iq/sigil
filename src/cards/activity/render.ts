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
  width?: number | undefined;
}

const DEFAULT_WIDTH = 495;
const HEIGHT = 200;
const LEFT = 40;
const TOP = 64;
const BOTTOM = HEIGHT - 28;

interface Geom {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Render the activity graph as a hand-authored area+line chart (Satori is weak
 * at charts). Width is configurable via `card_width`. Self-contained SVG, all
 * labels escaped.
 */
export function renderActivityCard(
  model: ActivityModel,
  theme: Theme,
  options: ActivityRenderOptions,
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const geom: Geom = { left: LEFT, right: width - 25, top: TOP, bottom: BOTTOM };
  const { open, close } = cardFrame({
    width,
    height: HEIGHT,
    theme,
    title: options.title,
    desc: `Daily contribution activity, ${model.total} in the window, rendered by sigil`,
    hideBorder: options.hideBorder,
    borderRadius: options.borderRadius,
    idPrefix: 'sigil-activity',
  });

  const summary = `<text x="25" y="52" font-family="${FONT_STACK}" font-size="12" fill="${theme.mutedColor}">${model.total} contributions · avg ${model.average}/day · peak ${model.max}</text>`;

  const chart = renderChart(model, theme, geom);
  const axis = renderAxis(model, theme, geom);

  return `${open}
  ${summary}
  ${axis}
  ${chart}
${close}`;
}

function renderChart(model: ActivityModel, theme: Theme, g: Geom): string {
  const n = model.points.length;
  if (n === 0) {
    return `<text x="25" y="130" font-family="${FONT_STACK}" font-size="13" fill="${theme.mutedColor}">No contribution data in this window.</text>`;
  }

  const chartW = g.right - g.left;
  const chartH = g.bottom - g.top;
  const scaleMax = model.max > 0 ? model.max : 1;
  const step = n > 1 ? chartW / (n - 1) : 0;

  const coords = model.points.map((p, i) => {
    const x = g.left + i * step;
    const y = g.bottom - (p.count / scaleMax) * chartH;
    return { x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${g.bottom} L ${first.x.toFixed(1)} ${g.bottom} Z`;

  return `<defs>
    <linearGradient id="sigil-activity-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.accentColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${theme.accentColor}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <path d="${areaPath}" fill="url(#sigil-activity-fill)"/>
  <path d="${linePath}" fill="none" stroke="${theme.accentColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function renderAxis(model: ActivityModel, theme: Theme, g: Geom): string {
  const scaleMax = model.max > 0 ? model.max : 1;
  // Baseline + a midline gridline, with y-axis value labels.
  const midY = (g.top + g.bottom) / 2;
  const gridlines = `
  <line x1="${g.left}" y1="${g.bottom}" x2="${g.right}" y2="${g.bottom}" stroke="${theme.borderColor}"/>
  <line x1="${g.left}" y1="${midY}" x2="${g.right}" y2="${midY}" stroke="${theme.borderColor}" stroke-opacity="0.4"/>
  <text x="${g.left - 6}" y="${g.bottom + 3}" text-anchor="end" font-family="${FONT_STACK}" font-size="9" fill="${theme.mutedColor}">0</text>
  <text x="${g.left - 6}" y="${midY + 3}" text-anchor="end" font-family="${FONT_STACK}" font-size="9" fill="${theme.mutedColor}">${Math.round(scaleMax / 2)}</text>
  <text x="${g.left - 6}" y="${g.top + 3}" text-anchor="end" font-family="${FONT_STACK}" font-size="9" fill="${theme.mutedColor}">${scaleMax}</text>`;

  const startLabel = escapeXml(formatDayLabel(model.startDate));
  const endLabel = escapeXml(formatDayLabel(model.endDate));
  const dateLabels = `
  <text x="${g.left}" y="${g.bottom + 18}" font-family="${FONT_STACK}" font-size="10" fill="${theme.mutedColor}">${startLabel}</text>
  <text x="${g.right}" y="${g.bottom + 18}" text-anchor="end" font-family="${FONT_STACK}" font-size="10" fill="${theme.mutedColor}">${endLabel}</text>`;

  return gridlines + dateLabels;
}
