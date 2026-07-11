import { describe, expect, it } from 'vitest';
import {
  ParamError,
  parseStatsParams,
  statsCacheKey,
} from '../src/cards/stats/params.js';

function params(qs: string) {
  return parseStatsParams(new URLSearchParams(qs));
}

describe('parseStatsParams', () => {
  it('requires a valid username', () => {
    expect(() => params('')).toThrow(ParamError);
    expect(() => params('username=has space')).toThrow(ParamError);
    expect(params('username=Mu-iq').username).toBe('Mu-iq');
  });

  it('parses booleans with sensible defaults', () => {
    const p = params('username=a&show_icons=false&count_private=1');
    expect(p.showIcons).toBe(false);
    expect(p.countPrivate).toBe(true);
    expect(p.hideRank).toBe(false); // default
  });

  it('filters unknown stat keys from show/hide', () => {
    const p = params('username=a&hide=issues,bogus,stars');
    expect(p.hide).toEqual(['issues', 'stars']);
  });

  it('clamps border_radius into range', () => {
    expect(params('username=a&border_radius=999').borderRadius).toBe(24);
    expect(params('username=a&border_radius=-5').borderRadius).toBe(0);
    expect(params('username=a&border_radius=abc').borderRadius).toBe(8);
  });
});

describe('statsCacheKey', () => {
  it('is stable regardless of query param order/casing of username', () => {
    const a = statsCacheKey(params('username=Mu-iq&theme=dark&show_icons=true'));
    const b = statsCacheKey(params('theme=dark&username=mu-IQ&show_icons=true'));
    expect(a).toBe(b);
  });

  it('differs when a meaningful param differs', () => {
    const a = statsCacheKey(params('username=a&theme=dark'));
    const b = statsCacheKey(params('username=a&theme=light'));
    expect(a).not.toBe(b);
  });
});
