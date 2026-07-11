import { BUILTIN_THEMES } from './builtin.js';
import { BUILTIN_THEME_NAMES, type BuiltinThemeName, type Theme } from './types.js';

/** Raw custom-theme overrides parsed from query params (all optional). */
export interface ThemeOverrides {
  title_color?: string | undefined;
  text_color?: string | undefined;
  muted_color?: string | undefined;
  icon_color?: string | undefined;
  bg_color?: string | undefined;
  border_color?: string | undefined;
  accent_color?: string | undefined;
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isBuiltinName(name: string): name is BuiltinThemeName {
  return (BUILTIN_THEME_NAMES as readonly string[]).includes(name);
}

/**
 * Sanitize a single color value. Accepts a bare hex (`#rgb`/`#rrggbb`/...) with
 * or without a leading `#`. Anything else is rejected (returns undefined) so we
 * never embed untrusted strings into SVG attributes. This is a security
 * boundary — colors flow straight into rendered markup.
 */
export function parseColor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX.test(withHash) ? withHash.toLowerCase() : undefined;
}

/**
 * Parse a background value: either a single color, `transparent`, or a gradient
 * `deg,stopA,stopB[,...]` where each stop is a validated color and `deg` is an
 * integer angle. Returns a normalized string safe to embed, or undefined if the
 * whole value is malformed.
 */
export function parseBackground(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.toLowerCase() === 'transparent') return 'transparent';

  const parts = trimmed.split(',').map((p) => p.trim());
  if (parts.length === 1) return parseColor(parts[0]);

  // Gradient: first token may be an angle; remaining tokens are color stops.
  const first = parts[0] ?? '';
  const hasAngle = /^-?\d{1,3}$/.test(first);
  const angle = hasAngle ? String(parseInt(first, 10) % 360) : '35';
  const stopTokens = hasAngle ? parts.slice(1) : parts;
  const stops = stopTokens.map(parseColor);
  if (stops.length < 2 || stops.some((s) => s === undefined)) return undefined;
  return [angle, ...stops].join(',');
}

/**
 * Resolve the effective theme: start from a built-in base (falling back to
 * `default` for unknown names), then layer validated custom overrides on top.
 * Invalid overrides are silently ignored so a bad param never breaks the card.
 */
export function resolveTheme(
  themeName: string | undefined,
  overrides: ThemeOverrides = {},
): Theme {
  const base =
    themeName && isBuiltinName(themeName)
      ? BUILTIN_THEMES[themeName]
      : BUILTIN_THEMES.default;

  const bg = parseBackground(overrides.bg_color);

  return {
    ...base,
    ...cleaned({
      titleColor: parseColor(overrides.title_color),
      textColor: parseColor(overrides.text_color),
      mutedColor: parseColor(overrides.muted_color),
      iconColor: parseColor(overrides.icon_color),
      borderColor: parseColor(overrides.border_color),
      accentColor: parseColor(overrides.accent_color),
      bg,
    }),
  };
}

/** Drop keys whose value is undefined so spread doesn't clobber base values. */
function cleaned(obj: Partial<Theme>): Partial<Theme> {
  const out: Partial<Theme> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k as keyof Theme] = v;
  }
  return out;
}
