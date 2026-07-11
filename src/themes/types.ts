/**
 * The single theme contract every card renders against. One theme applies
 * consistently across all card types — that consistency is a core selling
 * point, so no card may invent its own colors outside this object.
 */
export interface Theme {
  /** Card title text. */
  titleColor: string;
  /** Primary body/value text. */
  textColor: string;
  /** Secondary/muted text (labels, footnotes). */
  mutedColor: string;
  /** Icon fill and accent color. */
  iconColor: string;
  /**
   * Card background. A solid color (`#0d1117`), or a gradient expressed as
   * `deg,stop1,stop2[,...]` (e.g. `35,#0d1117,#161b22`). Use `transparent`
   * for README light/dark auto-switching.
   */
  bg: string;
  /** Border color. */
  borderColor: string;
  /** Accent used for ring/rank highlights. */
  accentColor: string;
}

/** Names of built-in themes. Kept as a const tuple for exhaustive handling. */
export const BUILTIN_THEME_NAMES = [
  'default',
  'dark',
  'light',
  'github_dark',
  'tokyonight',
  'dracula',
  'gruvbox',
  'catppuccin',
  'radical',
] as const;
export type BuiltinThemeName = (typeof BUILTIN_THEME_NAMES)[number];
