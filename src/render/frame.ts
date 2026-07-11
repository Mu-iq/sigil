import type { Theme } from '../themes/index.js';
import { escapeXml } from '../util/xml.js';
import { resolveBackground } from './background.js';
import { FONT_STACK } from './constants.js';

export interface FrameOptions {
  width: number;
  height: number;
  theme: Theme;
  /** Already-trusted title text; will be XML-escaped here. */
  title: string;
  desc: string;
  hideBorder: boolean;
  borderRadius: number;
  /** Unique-per-card id prefix so multiple gradients never collide. */
  idPrefix: string;
}

/**
 * Build the shared card chrome: root <svg>, accessible title/desc, background
 * (solid/gradient/transparent), optional border, and the header title. Returns
 * the open markup and matching close so a card only supplies its inner content.
 * Centralizing this keeps every card visually consistent and accessible.
 */
export function cardFrame(opts: FrameOptions): { open: string; close: string } {
  const { width, height, theme, hideBorder, borderRadius, idPrefix } = opts;
  const title = escapeXml(opts.title);
  const desc = escapeXml(opts.desc);
  const { defs, fill } = resolveBackground(theme, `${idPrefix}-bg`);

  const border = hideBorder
    ? ''
    : `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${borderRadius}" fill="none" stroke="${theme.borderColor}"/>`;

  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${idPrefix}-title ${idPrefix}-desc">
  <title id="${idPrefix}-title">${title}</title>
  <desc id="${idPrefix}-desc">${desc}</desc>
  <defs>${defs}</defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" fill="${fill}"/>
  ${border}
  <text x="25" y="33" font-family="${FONT_STACK}" font-size="18" font-weight="700" fill="${theme.titleColor}">${title}</text>`;

  return { open, close: '</svg>' };
}
