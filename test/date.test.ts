import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatDayLabel,
  isPreviousDay,
  normalizeTimeZone,
  todayInTimeZone,
} from '../src/util/date.js';

describe('date helpers', () => {
  it('addDays crosses month/year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('isPreviousDay detects adjacency', () => {
    expect(isPreviousDay('2026-03-01', '2026-03-02')).toBe(true);
    expect(isPreviousDay('2026-03-01', '2026-03-03')).toBe(false);
  });

  it('todayInTimeZone differs across timezones at a boundary instant', () => {
    // 2026-01-01T03:00Z is still Dec 31 in New York, already Jan 1 in Tokyo.
    const instant = new Date('2026-01-01T03:00:00Z');
    expect(todayInTimeZone('America/New_York', instant)).toBe('2025-12-31');
    expect(todayInTimeZone('Asia/Tokyo', instant)).toBe('2026-01-01');
  });

  it('normalizeTimeZone falls back to UTC for garbage', () => {
    expect(normalizeTimeZone('Not/AZone')).toBe('UTC');
    expect(normalizeTimeZone('Europe/London')).toBe('Europe/London');
    expect(normalizeTimeZone(undefined)).toBe('UTC');
  });

  it('formatDayLabel renders a friendly date', () => {
    expect(formatDayLabel('2026-03-14')).toBe('Mar 14, 2026');
    expect(formatDayLabel(null)).toBe('');
  });
});
