import { describe, expect, it } from 'vitest';
import { formatCompact } from '../src/util/format.js';

describe('formatCompact', () => {
  it('leaves small numbers unchanged', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(42)).toBe('42');
    expect(formatCompact(999)).toBe('999');
  });

  it('compacts thousands and drops trailing .0', () => {
    expect(formatCompact(1000)).toBe('1k');
    expect(formatCompact(1234)).toBe('1.2k');
    expect(formatCompact(15000)).toBe('15k');
  });

  it('compacts millions and billions', () => {
    expect(formatCompact(2_500_000)).toBe('2.5m');
    expect(formatCompact(3_000_000_000)).toBe('3b');
  });

  it('handles negatives and non-finite input', () => {
    expect(formatCompact(-1500)).toBe('-1.5k');
    expect(formatCompact(NaN)).toBe('0');
  });
});
