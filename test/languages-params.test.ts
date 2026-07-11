import { describe, expect, it } from 'vitest';
import {
  languagesCacheKey,
  parseLanguagesParams,
} from '../src/cards/languages/params.js';
import { ParamError } from '../src/cards/params-error.js';

function p(qs: string) {
  return parseLanguagesParams(new URLSearchParams(qs));
}

describe('parseLanguagesParams', () => {
  it('requires a valid username', () => {
    expect(() => p('')).toThrow(ParamError);
    expect(p('username=Mu-iq').username).toBe('Mu-iq');
  });

  it('defaults and validates layout', () => {
    expect(p('username=a').layout).toBe('normal');
    expect(p('username=a&layout=donut').layout).toBe('donut');
    expect(p('username=a&layout=bogus').layout).toBe('normal');
  });

  it('clamps langs_count', () => {
    expect(p('username=a&langs_count=99').langsCount).toBe(12);
    expect(p('username=a&langs_count=0').langsCount).toBe(1);
    expect(p('username=a').langsCount).toBe(6);
  });

  it('parses weight, exclude_repo and hide lists', () => {
    const parsed = p('username=a&weight=bytes&exclude_repo=x,y&hide=html,css');
    expect(parsed.weight).toBe('bytes');
    expect(parsed.excludeRepos).toEqual(['x', 'y']);
    expect(parsed.hideLanguages).toEqual(['html', 'css']);
  });

  it('defaults weight to count and accepts bytes/size/hybrid', () => {
    expect(p('username=a').weight).toBe('count'); // default
    expect(p('username=a&weight=hybrid').weight).toBe('hybrid');
    expect(p('username=a&weight=size').weight).toBe('bytes'); // alias
    expect(p('username=a&weight=nonsense').weight).toBe('count'); // fallback
  });
});

describe('languagesCacheKey', () => {
  it('is order-insensitive for exclude/hide lists', () => {
    const a = languagesCacheKey(p('username=a&exclude_repo=x,y&hide=go,ts'));
    const b = languagesCacheKey(p('username=a&exclude_repo=y,x&hide=ts,go'));
    expect(a).toBe(b);
  });

  it('differs by layout', () => {
    expect(languagesCacheKey(p('username=a&layout=normal'))).not.toBe(
      languagesCacheKey(p('username=a&layout=donut')),
    );
  });
});
