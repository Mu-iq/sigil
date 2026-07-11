import { describe, expect, it } from 'vitest';
import { renderSummaryCard } from '../src/cards/summary/render.js';
import { resolveTheme } from '../src/themes/index.js';

const OPTS = { title: 'Dev Summary', hideBorder: false, borderRadius: 8 };

describe('renderSummaryCard', () => {
  it('renders a stored summary as accessible SVG', () => {
    const svg = renderSummaryCard(
      'Builds reliable, typed edge services with a focus on developer experience.',
      resolveTheme('dark'),
      OPTS,
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('Builds reliable');
    expect(svg).not.toMatch(/<image|xlink:href|<foreignObject|@import|href="http/);
  });

  it('shows a waiting state when no summary is stored', () => {
    const svg = renderSummaryCard(null, resolveTheme('dark'), OPTS);
    expect(svg).toContain('after the next scheduled update');
    expect(svg.startsWith('<svg')).toBe(true);
  });

  it('escapes untrusted model output (no injected markup)', () => {
    const svg = renderSummaryCard(
      '</text><script>alert(1)</script> and & "quotes"',
      resolveTheme('dark'),
      OPTS,
    );
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('matches snapshot', () => {
    const svg = renderSummaryCard(
      'Prolific open-source contributor working mainly in TypeScript and Go.',
      resolveTheme('tokyonight'),
      OPTS,
    );
    expect(svg).toMatchSnapshot('summary-tokyonight');
  });
});
