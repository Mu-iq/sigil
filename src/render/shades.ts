/**
 * Derive an ordered set of accent shades (light → dark, same hue) for the
 * `lang_colors=mono` languages mode — so a card can render its data series as
 * tints of the single theme accent instead of per-language rainbow colors.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.slice(0, 6);
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: Rgb): string {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

/**
 * `count` shades of `accent`, spread across a lightness range (light → dark)
 * while keeping the accent's hue and saturation. Deterministic; used for the
 * mono languages palette so the donut/bar read as one blue family.
 */
export function accentShades(accent: string, count: number): string[] {
  const { h, s } = rgbToHsl(parseHex(accent));
  const sat = Math.max(0.35, s); // keep some color even for near-grey accents
  const L_LIGHT = 0.74;
  const L_DARK = 0.42;
  if (count <= 1) return [toHex(hslToRgb(h, sat, (L_LIGHT + L_DARK) / 2))];
  const shades: string[] = [];
  for (let i = 0; i < count; i++) {
    const l = L_LIGHT - (i / (count - 1)) * (L_LIGHT - L_DARK);
    shades.push(toHex(hslToRgb(h, sat, l)));
  }
  return shades;
}
