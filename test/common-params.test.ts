import { describe, expect, it } from 'vitest';
import { parseCardWidth, parseThemeOverrides } from '../src/cards/common-params.js';
import { resolveTheme } from '../src/themes/index.js';

describe('parseThemeOverrides', () => {
  it('maps the short `accent` param to the accent_color override', () => {
    const o = parseThemeOverrides(new URLSearchParams('accent=79C0FF'));
    expect(o.accent_color).toBe('79C0FF');
  });

  it('prefers explicit accent_color over accent when both are given', () => {
    const o = parseThemeOverrides(
      new URLSearchParams('accent=111111&accent_color=222222'),
    );
    expect(o.accent_color).toBe('222222');
  });

  it('resolves the accent override onto any theme (drives rings/lines)', () => {
    const o = parseThemeOverrides(new URLSearchParams('accent=79c0ff'));
    // dracula has a green accent; the override must win.
    const t = resolveTheme('dracula', o);
    expect(t.accentColor).toBe('#79c0ff');
    expect(t.accentColor).not.toBe('#50fa7b');
  });
});

describe('parseCardWidth', () => {
  it('clamps to 300–900 and rounds', () => {
    expect(parseCardWidth('450')).toBe(450);
    expect(parseCardWidth('100')).toBe(300);
    expect(parseCardWidth('2000')).toBe(900);
    expect(parseCardWidth(undefined)).toBeUndefined();
    expect(parseCardWidth('abc')).toBeUndefined();
  });
});
