/**
 * Compact number formatting for card values, e.g. 1234 -> "1.2k",
 * 2_500_000 -> "2.5m". Kept locale-agnostic and deterministic for stable SVG
 * snapshots; a future `number_format=full` param can bypass it.
 */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs < 1000) return String(n);
  const units = [
    { v: 1e9, s: 'b' },
    { v: 1e6, s: 'm' },
    { v: 1e3, s: 'k' },
  ];
  for (const { v, s } of units) {
    if (abs >= v) {
      const scaled = n / v;
      // One decimal, but drop a trailing ".0".
      const str = scaled.toFixed(1).replace(/\.0$/, '');
      return `${str}${s}`;
    }
  }
  return String(n);
}
