import { resolveTheme, type Theme } from '../themes/index.js';
import { escapeXml } from '../util/xml.js';
import { resolveBackground } from './background.js';

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * The minimal branded "temporarily unavailable" card. This is the last line of
 * defense for the never-broken-image invariant: it takes no upstream data and
 * cannot itself fail. Used when there's no stale card to serve.
 */
export function renderFallbackCard(message: string, theme?: Theme): string {
  const t = theme ?? resolveTheme('default');
  const width = 460;
  const height = 120;
  const { defs, fill } = resolveBackground(t, 'sigil-fallback-bg');
  const safeMsg = escapeXml(message);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<title>Stats temporarily unavailable</title>
<desc>${safeMsg}</desc>
<defs>${defs}</defs>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${fill}" stroke="${t.borderColor}"/>
<text x="24" y="46" font-family="${FONT_STACK}" font-size="16" font-weight="600" fill="${t.titleColor}">Stats temporarily unavailable</text>
<text x="24" y="74" font-family="${FONT_STACK}" font-size="13" fill="${t.mutedColor}">${safeMsg}</text>
<text x="24" y="98" font-family="${FONT_STACK}" font-size="11" fill="${t.mutedColor}">sigil will retry automatically.</text>
</svg>`;
}
