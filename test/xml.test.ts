import { describe, expect, it } from 'vitest';
import { escapeXml } from '../src/util/xml.js';

describe('escapeXml', () => {
  it('escapes all five XML metacharacters', () => {
    expect(escapeXml(`<a href="x" & 'y'>`)).toBe(
      '&lt;a href=&quot;x&quot; &amp; &apos;y&apos;&gt;',
    );
  });

  it('neutralizes a script/markup injection attempt', () => {
    const out = escapeXml('</text><script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('</text>');
  });

  it('leaves plain text alone', () => {
    expect(escapeXml('Mona Lisa Octocat')).toBe('Mona Lisa Octocat');
  });
});
