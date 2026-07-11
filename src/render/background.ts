import type { Theme } from '../themes/index.js';

/**
 * Resolve a theme background into an SVG paint. Returns any `<defs>` markup
 * (for gradients) and the `fill` value to apply to the card rect. Values are
 * already validated by the theme parser, so no escaping is needed here.
 */
export function resolveBackground(
  theme: Theme,
  gradientId: string,
): { defs: string; fill: string } {
  const bg = theme.bg;
  if (bg === 'transparent') return { defs: '', fill: 'none' };

  if (bg.includes(',')) {
    const [angleRaw, ...stops] = bg.split(',');
    const angle = parseInt(angleRaw ?? '35', 10);
    // Convert an angle in degrees into x1/y1/x2/y2 on the unit square.
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad);
    const y = Math.sin(rad);
    const x1 = (50 - x * 50).toFixed(2);
    const y1 = (50 + y * 50).toFixed(2);
    const x2 = (50 + x * 50).toFixed(2);
    const y2 = (50 - y * 50).toFixed(2);
    const stopEls = stops
      .map((color, i) => {
        const offset = stops.length === 1 ? 0 : (i / (stops.length - 1)) * 100;
        return `<stop offset="${offset.toFixed(1)}%" stop-color="${color}"/>`;
      })
      .join('');
    const defs =
      `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">` +
      `${stopEls}</linearGradient>`;
    return { defs, fill: `url(#${gradientId})` };
  }

  return { defs: '', fill: bg };
}
