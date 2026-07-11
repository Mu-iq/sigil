import { describe, expect, it } from 'vitest';
import { renderStatsCard } from '../src/cards/stats/render.js';
import { transformStats } from '../src/cards/stats/transform.js';
import type { RawUserStats } from '../src/cards/stats/types.js';
import { renderFallbackCard } from '../src/render/fallback.js';
import { resolveTheme } from '../src/themes/index.js';

const RAW: RawUserStats = {
  login: 'mu-iq',
  name: 'Mu',
  totalStars: 1234,
  totalCommits: 4567,
  totalPRs: 89,
  totalIssues: 42,
  totalContributions: 3210,
  followers: 100,
  repoCount: 30,
};

const RENDER_OPTS = { hideBorder: false, borderRadius: 8 };

function card(themeName: string, opts = {}) {
  const model = transformStats(RAW, { showIcons: true, hideRank: false, ...opts });
  return renderStatsCard(model, resolveTheme(themeName), RENDER_OPTS);
}

describe('renderStatsCard', () => {
  it('emits accessible, self-contained SVG', () => {
    const svg = card('default');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title');
    expect(svg).toContain('<desc');
    // No external references that Camo would strip.
    expect(svg).not.toMatch(/<image|xlink:href|<foreignObject|@import|href="http/);
  });

  it('escapes a malicious title (no injected markup)', () => {
    const svg = card('default', { title: '</text><script>alert(1)</script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('renders a gradient background from the default theme', () => {
    expect(card('default')).toContain('<linearGradient');
  });

  it('matches snapshot for default and light themes', () => {
    expect(card('default')).toMatchSnapshot('stats-default');
    expect(card('light')).toMatchSnapshot('stats-light');
  });
});

describe('renderFallbackCard', () => {
  it('is valid SVG and never fails on arbitrary input', () => {
    const svg = renderFallbackCard('<upstream error & "stuff">');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&amp;');
  });
});
