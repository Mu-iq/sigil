import type { BuiltinThemeName, Theme } from './types.js';

/**
 * Built-in theme palettes. All cards share these — do not fork palettes per
 * card; the single-theme-everywhere consistency is a core selling point. These
 * are our own refined takes on the popular names people expect, not verbatim
 * copies. Add new themes here and to BUILTIN_THEME_NAMES.
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
  github_dark: {
    titleColor: '#e6edf3',
    textColor: '#c9d1d9',
    mutedColor: '#8b949e',
    iconColor: '#7ee787',
    bg: '#0d1117',
    borderColor: '#30363d',
    accentColor: '#7ee787',
  },
  tokyonight: {
    titleColor: '#7aa2f7',
    textColor: '#c0caf5',
    mutedColor: '#565f89',
    iconColor: '#bb9af7',
    bg: '35,#1a1b27,#24283b',
    borderColor: '#2a2e42',
    accentColor: '#7dcfff',
  },
  dracula: {
    titleColor: '#bd93f9',
    textColor: '#f8f8f2',
    mutedColor: '#6272a4',
    iconColor: '#ff79c6',
    bg: '#282a36',
    borderColor: '#44475a',
    accentColor: '#50fa7b',
  },
  gruvbox: {
    titleColor: '#fabd2f',
    textColor: '#ebdbb2',
    mutedColor: '#a89984',
    iconColor: '#fe8019',
    bg: '#282828',
    borderColor: '#3c3836',
    accentColor: '#b8bb26',
  },
  catppuccin: {
    titleColor: '#cba6f7',
    textColor: '#cdd6f4',
    mutedColor: '#7f849c',
    iconColor: '#f5c2e7',
    bg: '35,#1e1e2e,#181825',
    borderColor: '#313244',
    accentColor: '#a6e3a1',
  },
  radical: {
    titleColor: '#fe428e',
    textColor: '#a9fef7',
    mutedColor: '#8296b0',
    iconColor: '#f8d847',
    bg: '#141321',
    borderColor: '#2a2a45',
    accentColor: '#fe428e',
  },
};
