import { resolveBackground } from '../../render/background.js';
import { FONT_STACK } from '../../render/constants.js';
import type { Theme } from '../../themes/index.js';
import { escapeXml } from '../../util/xml.js';

export interface SummaryRenderOptions {
  title: string;
  /** Whether the AI summary feature is enabled for this instance. */
  enabled: boolean;
  hideBorder: boolean;
  borderRadius: number;
  width?: number | undefined;
}

const DEFAULT_WIDTH = 467;
const PAD = 25;

/**
 * Render the AI developer summary card. The summary text is model-generated and
 * therefore untrusted — it is XML-escaped and word-wrapped here. Three states:
 * a stored summary; a waiting message (enabled but not yet generated); and a
 * clean "not enabled" message when the operator has left the feature off.
 */
export function renderSummaryCard(
  summary: string | null,
  theme: Theme,
  options: SummaryRenderOptions,
): string {
  const WIDTH = options.width ?? DEFAULT_WIDTH;
  const body =
    summary ??
    (options.enabled
      ? 'A summary will appear here after the next scheduled update.'
      : 'AI summary is not enabled for this instance.');
  // Approximate chars-per-line from the usable width (~7.4px per char at 14px).
  const maxChars = Math.max(24, Math.floor((WIDTH - PAD * 2) / 7.4));
  const lines = wrap(body, maxChars).slice(0, 4);
  const height = 60 + lines.length * 22 + 10;
  const { defs, fill } = resolveBackground(theme, 'sigil-summary-bg');
  const border = options.hideBorder
    ? ''
    : `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="${options.borderRadius}" fill="none" stroke="${theme.borderColor}"/>`;

  const textLines = lines
    .map(
      (line, i) =>
        `<text x="${PAD}" y="${64 + i * 22}" font-family="${FONT_STACK}" font-size="14" fill="${summary ? theme.textColor : theme.mutedColor}">${escapeXml(line)}</text>`,
    )
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-labelledby="sigil-summary-title sigil-summary-desc">
  <title id="sigil-summary-title">${escapeXml(options.title)}</title>
  <desc id="sigil-summary-desc">AI-generated developer summary, rendered by sigil</desc>
  <defs>${defs}</defs>
  <rect x="0" y="0" width="${WIDTH}" height="${height}" rx="${options.borderRadius}" fill="${fill}"/>
  ${border}
  <text x="${PAD}" y="33" font-family="${FONT_STACK}" font-size="16" font-weight="700" fill="${theme.titleColor}">${escapeXml(options.title)}</text>
  ${textLines}
</svg>`;
}

/** Greedy word-wrap by approximate character width. Pure and deterministic. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [''];
}
