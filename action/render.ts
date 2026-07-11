import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { TokenPool } from '../src/github/token-pool.js';
import { renderFallbackCard } from '../src/render/fallback.js';
import { resolveTheme } from '../src/themes/index.js';
import { renderActionCard } from './cards.js';
import { ConfigError, parseActionConfig } from './config.js';

/**
 * GitHub Action entry point: render the configured cards to static .svg files
 * committed to the user's repo. Zero external runtime at render time → the
 * cards can never break. Upholds the never-broken-image invariant even here:
 * if a card fails, we write a valid fallback SVG rather than a partial/empty
 * file.
 */
async function main(): Promise<void> {
  const cfg = parseActionConfig(process.env);
  const pool = new TokenPool([cfg.token]);
  await mkdir(cfg.outDir, { recursive: true });

  let failures = 0;
  for (const card of cfg.cards) {
    const outPath = join(cfg.outDir, `${card}.svg`);
    try {
      const svg = await renderActionCard(pool, card, cfg);
      await writeFile(outPath, svg, 'utf8');
      console.log(`✓ ${card} -> ${outPath}`);
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : 'render failed';
      const svg = renderFallbackCard(
        `Could not render ${card}.`,
        resolveTheme(cfg.theme),
      );
      await writeFile(outPath, svg, 'utf8');
      console.error(`! ${card} failed (${message}) — wrote fallback card`);
    }
  }

  console.log(
    `\nRendered ${cfg.cards.length - failures}/${cfg.cards.length} cards for @${cfg.username} into ${cfg.outDir}/`,
  );
}

main().catch((err) => {
  // Only reached for config errors (no valid username/token/cards) — surface
  // clearly and exit non-zero so the workflow fails loudly on misconfiguration.
  const message = err instanceof ConfigError ? err.message : String(err);
  console.error(`sigil action: ${message}`);
  process.exit(1);
});
