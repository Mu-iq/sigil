import type { BuiltinThemeName, Theme } from './types.js';

/**
 * Built-in theme palettes. M1 ships a small, refined set; M2 expands to the
 * full library (radical, tokyonight, dracula, gruvbox, catppuccin, ...). All
 * cards share these — do not fork palettes per card.
 */
export const BUILTIN_THEMES: Record<BuiltinThemeName, Theme> = {
  default: {
    titleColor: '#58a6ff',
    textColor: '#c9d1d9',
    mutedColor: '#8b949e',
    iconColor: '#58a6ff',
    bg: '35,#0d1117,#161b22',
    borderColor: '#30363d',
    accentColor: '#58a6ff',
  },
  dark: {
    titleColor: '#58a6ff',
    textColor: '#c9d1d9',
    mutedColor: '#8b949e',
    iconColor: '#58a6ff',
    bg: '#0d1117',
    borderColor: '#30363d',
    accentColor: '#3fb950',
  },
  light: {
    titleColor: '#0969da',
    textColor: '#1f2328',
    mutedColor: '#59636e',
    iconColor: '#0969da',
    bg: '#ffffff',
    borderColor: '#d0d7de',
    accentColor: '#0969da',
  },
};
