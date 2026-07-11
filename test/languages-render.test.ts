import { describe, expect, it } from 'vitest';
import { renderLanguagesCard } from '../src/cards/languages/render.js';
import type { LanguagesModel } from '../src/cards/languages/transform.js';
import { accentShades } from '../src/render/shades.js';
import { resolveTheme } from '../src/themes/index.js';

const MODEL: LanguagesModel = {
  slices: [
    { name: 'TypeScript', color: '#3178c6', weight: 600, percentage: 60 },
    { name: 'Go', color: '#00add8', weight: 250, percentage: 25 },
    { name: 'Other', color: '#8b949e', weight: 150, percentage: 15 },
  ],
  hasOther: true,
};

const OPTS = (layout: 'normal' | 'compact' | 'donut') => ({
  layout,
  title: 'Top Languages',
  hideBorder: false,
  borderRadius: 8,
});

describe('renderLanguagesCard', () => {
  for (const layout of ['normal', 'compact', 'donut'] as const) {
    it(`emits accessible self-contained SVG for ${layout}`, () => {
      const svg = renderLanguagesCard(MODEL, resolveTheme('tokyonight'), OPTS(layout));
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('role="img"');
      expect(svg).toContain('<title');
      expect(svg).not.toMatch(/<image|xlink:href|<foreignObject|@import|href="http/);
      expect(svg).toContain('TypeScript');
    });

    it(`matches snapshot for ${layout}`, () => {
      const svg = renderLanguagesCard(MODEL, resolveTheme('dark'), OPTS(layout));
      expect(svg).toMatchSnapshot(`languages-${layout}`);
    });
  }

  it('escapes a malicious language name', () => {
    const evil: LanguagesModel = {
      slices: [
        { name: '</text><script>x</script>', color: '#fff', weight: 1, percentage: 100 },
      ],
      hasOther: false,
    };
    const svg = renderLanguagesCard(evil, resolveTheme('dark'), OPTS('normal'));
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('renders a valid empty-state card when there are no slices', () => {
    const svg = renderLanguagesCard(
      { slices: [], hasOther: false },
      resolveTheme('dark'),
      OPTS('normal'),
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('No public language data');
  });
});

describe('renderLanguagesCard lang_colors=mono', () => {
  const theme = resolveTheme('github_dark'); // accent #79c0ff
  const shades = accentShades(theme.accentColor, MODEL.slices.length);

  for (const layout of ['normal', 'compact', 'donut'] as const) {
    it(`${layout}: slices use accent shades, not per-language rainbow`, () => {
      const svg = renderLanguagesCard(MODEL, theme, {
        layout,
        title: 'Top Languages',
        hideBorder: false,
        borderRadius: 8,
        langColors: 'mono',
      }).toLowerCase();

      // Original per-language brand fills must be gone (these hexes are unique
      // to the slices; muted text color is asserted separately elsewhere).
      expect(svg).not.toContain('#3178c6'); // TypeScript blue
      expect(svg).not.toContain('#00add8'); // Go cyan
      // Every slice is a shade of the accent.
      for (const shade of shades) {
        expect(svg).toContain(shade.toLowerCase());
      }
    });
  }

  it('language mode keeps the per-language brand colors (default)', () => {
    const svg = renderLanguagesCard(MODEL, theme, OPTS('donut'));
    expect(svg).toContain('#3178c6');
    expect(svg).toContain('#00add8');
  });
});
