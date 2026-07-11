import { describe, expect, it } from 'vitest';
import { ConfigError, parseActionConfig } from '../action/config.js';

const BASE = { SIGIL_USERNAME: 'Mu-iq', GH_TOKEN: 'ghp_x' };

describe('parseActionConfig', () => {
  it('requires a valid username and a token', () => {
    expect(() => parseActionConfig({ GH_TOKEN: 'x' })).toThrow(ConfigError);
    expect(() => parseActionConfig({ SIGIL_USERNAME: 'Mu-iq' })).toThrow(ConfigError);
    expect(() =>
      parseActionConfig({ SIGIL_USERNAME: 'bad name', GH_TOKEN: 'x' }),
    ).toThrow(ConfigError);
  });

  it('accepts GH_TOKEN, GITHUB_TOKEN, or PAT_1', () => {
    expect(parseActionConfig({ SIGIL_USERNAME: 'a', GITHUB_TOKEN: 't' }).token).toBe('t');
    expect(parseActionConfig({ SIGIL_USERNAME: 'a', PAT_1: 'p' }).token).toBe('p');
  });

  it('defaults cards and filters unknown ones', () => {
    expect(parseActionConfig(BASE).cards).toEqual([
      'stats',
      'languages',
      'streak',
      'activity',
    ]);
    const c = parseActionConfig({ ...BASE, SIGIL_CARDS: 'stats,bogus,wrapped,stats' });
    expect(c.cards).toEqual(['stats', 'wrapped']); // filtered + deduped
  });

  it('throws when no valid cards remain', () => {
    expect(() => parseActionConfig({ ...BASE, SIGIL_CARDS: 'nope,alsobad' })).toThrow(
      ConfigError,
    );
  });

  it('falls back to defaults for invalid theme and layout', () => {
    const c = parseActionConfig({
      ...BASE,
      SIGIL_THEME: 'nonsense',
      SIGIL_LANG_LAYOUT: 'zzz',
    });
    expect(c.theme).toBe('default');
    expect(c.langLayout).toBe('compact');
  });

  it('honors valid theme, layout, out dir, and timezone', () => {
    const c = parseActionConfig({
      ...BASE,
      SIGIL_THEME: 'dracula',
      SIGIL_LANG_LAYOUT: 'donut',
      SIGIL_OUT: 'cards',
      SIGIL_TZ: 'America/New_York',
    });
    expect(c.theme).toBe('dracula');
    expect(c.langLayout).toBe('donut');
    expect(c.outDir).toBe('cards');
    expect(c.timeZone).toBe('America/New_York');
  });
});
