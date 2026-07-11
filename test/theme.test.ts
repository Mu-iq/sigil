import { describe, expect, it } from 'vitest';
import { parseBackground, parseColor, resolveTheme } from '../src/themes/index.js';

describe('parseColor', () => {
  it('accepts hex with or without leading #', () => {
    expect(parseColor('#ff0000')).toBe('#ff0000');
    expect(parseColor('ff0000')).toBe('#ff0000');
    expect(parseColor('FFF')).toBe('#fff');
  });

  it('rejects non-hex / injection attempts', () => {
    expect(parseColor('red')).toBeUndefined();
    expect(parseColor('#ff0000"/><script>')).toBeUndefined();
    expect(parseColor('url(#x)')).toBeUndefined();
    expect(parseColor('')).toBeUndefined();
  });
});

describe('parseBackground', () => {
  it('passes through transparent', () => {
    expect(parseBackground('transparent')).toBe('transparent');
  });

  it('normalizes a gradient with an angle', () => {
    expect(parseBackground('45,#000,#fff')).toBe('45,#000,#fff');
  });

  it('defaults the angle when omitted', () => {
    expect(parseBackground('#000,#fff')).toBe('35,#000,#fff');
  });

  it('rejects a gradient with a bad stop', () => {
    expect(parseBackground('45,#000,notacolor')).toBeUndefined();
  });
});

describe('resolveTheme', () => {
  it('falls back to default for an unknown theme name', () => {
    const t = resolveTheme('does-not-exist');
    expect(t.titleColor).toBe('#58a6ff');
  });

  it('applies valid overrides and ignores invalid ones', () => {
    const t = resolveTheme('dark', {
      title_color: 'ff0000',
      text_color: 'not-a-color',
    });
    expect(t.titleColor).toBe('#ff0000');
    // invalid override ignored -> keeps base dark value
    expect(t.textColor).toBe('#c9d1d9');
  });
});
