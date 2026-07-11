import { FONT_STACK } from '../../render/constants.js';
import { cardFrame } from '../../render/frame.js';
import { accentShades } from '../../render/shades.js';
import type { Theme } from '../../themes/index.js';
import { escapeXml } from '../../util/xml.js';
import type { LanguagesModel } from './transform.js';

export type LanguagesLayout = 'normal' | 'compact' | 'donut';

/** `language` = per-language brand colors (rainbow); `mono` = accent shades. */
export type LanguageColors = 'language' | 'mono';

export interface LanguagesRenderOptions {
  layout: LanguagesLayout;
  title: string;
  hideBorder: boolean;
  borderRadius: number;
  width?: number | undefined;
  /** How to color the slices/legend. */
  langColors?: LanguageColors | undefined;
}

/**
 * Build the per-slice color list. In `mono` mode every slice (and its legend
 * dot) becomes a shade of the theme accent, so the card reads as one color
 * family; otherwise each language keeps its own brand color.
 */
function sliceColors(
  model: LanguagesModel,
  theme: Theme,
  opts: LanguagesRenderOptions,
): string[] {
  if (opts.langColors === 'mono') {
    return accentShades(theme.accentColor, model.slices.length);
  }
  return model.slices.map((s) => s.color);
}

const PAD = 25;
const DEFAULT_WIDTH = 300;
const DEFAULT_DONUT_WIDTH = 360;

/** Render the languages card in the requested layout. Always valid SVG. */
export function renderLanguagesCard(
  model: LanguagesModel,
  theme: Theme,
  options: LanguagesRenderOptions,
): string {
  if (model.slices.length === 0) {
    return renderEmpty(theme, options);
  }
  switch (options.layout) {
    case 'compact':
      return renderCompact(model, theme, options);
    case 'donut':
      return renderDonut(model, theme, options);
    case 'normal':
    default:
      return renderNormal(model, theme, options);
  }
}

function frameFor(
  theme: Theme,
  options: LanguagesRenderOptions,
  width: number,
  height: number,
) {
  return cardFrame({
    width,
    height,
    theme,
    title: options.title,
    desc: 'Top languages by code size, rendered by sigil',
    hideBorder: options.hideBorder,
    borderRadius: options.borderRadius,
    idPrefix: 'sigil-langs',
  });
}

/** Normal: one labeled progress bar per language. */
function renderNormal(
  model: LanguagesModel,
  theme: Theme,
  options: LanguagesRenderOptions,
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const rowH = 40;
  const top = 55;
  const height = top + model.slices.length * rowH + 5;
  const { open, close } = frameFor(theme, options, width, height);
  const barW = width - PAD * 2;
  const colors = sliceColors(model, theme, options);

  const rows = model.slices
    .map((s, i) => {
      const y = top + i * rowH;
      const filled = Math.max(2, (s.percentage / 100) * barW);
      return `<g>
    <text x="${PAD}" y="${y}" font-family="${FONT_STACK}" font-size="13" font-weight="600" fill="${theme.textColor}">${escapeXml(s.name)}</text>
    <text x="${width - PAD}" y="${y}" text-anchor="end" font-family="${FONT_STACK}" font-size="12" fill="${theme.mutedColor}">${s.percentage}%</text>
    <rect x="${PAD}" y="${y + 8}" width="${barW}" height="8" rx="4" fill="${theme.borderColor}"/>
    <rect x="${PAD}" y="${y + 8}" width="${filled.toFixed(1)}" height="8" rx="4" fill="${colors[i]}"/>
  </g>`;
    })
    .join('\n  ');

  return `${open}\n  ${rows}\n${close}`;
}

/** Compact: a single stacked bar plus a two-column legend. */
function renderCompact(
  model: LanguagesModel,
  theme: Theme,
  options: LanguagesRenderOptions,
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const barW = width - PAD * 2;
  const barY = 50;
  const legendTop = 78;
  const rowsPerCol = Math.ceil(model.slices.length / 2);
  const height = legendTop + rowsPerCol * 22 + 5;
  const { open, close } = frameFor(theme, options, width, height);
  const colors = sliceColors(model, theme, options);

  // Stacked segments across one rounded bar.
  let x = PAD;
  const segments = model.slices
    .map((s, i) => {
      const w = (s.percentage / 100) * barW;
      const seg = `<rect x="${x.toFixed(2)}" y="${barY}" width="${Math.max(0, w).toFixed(2)}" height="10" fill="${colors[i]}"/>`;
      x += w;
      return seg;
    })
    .join('');

  const legend = model.slices
    .map((s, i) => {
      const col = i < rowsPerCol ? 0 : 1;
      const row = i % rowsPerCol;
      const lx = PAD + col * (barW / 2);
      const ly = legendTop + row * 22;
      return `<g transform="translate(${lx}, ${ly})">
    <circle cx="6" cy="-4" r="5" fill="${colors[i]}"/>
    <text x="18" y="0" font-family="${FONT_STACK}" font-size="12" fill="${theme.textColor}">${escapeXml(s.name)} ${s.percentage}%</text>
  </g>`;
    })
    .join('\n  ');

  return `${open}
  <clipPath id="sigil-langs-clip"><rect x="${PAD}" y="${barY}" width="${barW}" height="10" rx="5"/></clipPath>
  <g clip-path="url(#sigil-langs-clip)">${segments}</g>
  ${legend}
${close}`;
}

/** Donut: a ring chart with a legend beside it. */
function renderDonut(
  model: LanguagesModel,
  theme: Theme,
  options: LanguagesRenderOptions,
): string {
  const width = options.width ?? DEFAULT_DONUT_WIDTH;
  const cx = 92;
  const cy = 110;
  const r = 52;
  const stroke = 22;
  const circumference = 2 * Math.PI * r;
  const rowsH = model.slices.length * 22;
  const height = Math.max(190, 70 + rowsH);
  const { open, close } = frameFor(theme, options, width, height);
  const colors = sliceColors(model, theme, options);

  let offset = 0;
  const arcs = model.slices
    .map((s, i) => {
      const len = (s.percentage / 100) * circumference;
      const arc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="${stroke}"
      stroke-dasharray="${len.toFixed(2)} ${(circumference - len).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += len;
      return arc;
    })
    .join('\n  ');

  // Legend sits to the right of the ring; the % is right-anchored so it tracks
  // the card's right edge when the width changes.
  const legendX = 180;
  const legend = model.slices
    .map((s, i) => {
      const ly = 60 + i * 22;
      return `<g transform="translate(${legendX}, ${ly})">
    <circle cx="6" cy="-4" r="5" fill="${colors[i]}"/>
    <text x="18" y="0" font-family="${FONT_STACK}" font-size="12" fill="${theme.textColor}">${escapeXml(s.name)}</text>
    <text x="${width - legendX - PAD}" y="0" text-anchor="end" font-family="${FONT_STACK}" font-size="12" fill="${theme.mutedColor}">${s.percentage}%</text>
  </g>`;
    })
    .join('\n  ');

  return `${open}
  ${arcs}
  ${legend}
${close}`;
}

/** Empty state: valid card, honest message — still never a broken image. */
function renderEmpty(theme: Theme, options: LanguagesRenderOptions): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const { open, close } = frameFor(theme, options, width, 120);
  return `${open}
  <text x="${PAD}" y="75" font-family="${FONT_STACK}" font-size="13" fill="${theme.mutedColor}">No public language data found.</text>
${close}`;
}
