import { describe, it, expect } from 'vitest';
import { localDateStr, formatTime, getMondayOfWeek, daysUntil } from '../date-helpers';

describe('localDateStr', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(localDateStr(new Date(2026, 2, 19))).toBe('2026-03-19');
  });

  it('pads single-digit months and days', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 90 seconds as 1:30', () => {
    expect(formatTime(90)).toBe('1:30');
  });

  it('formats 3600 seconds as 60:00', () => {
    expect(formatTime(3600)).toBe('60:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatTime(65)).toBe('1:05');
  });
});

describe('getMondayOfWeek', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 2, 18); // Wednesday March 18, 2026
    const monday = getMondayOfWeek(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(localDateStr(monday)).toBe('2026-03-16');
  });

  it('returns Monday for a Monday', () => {
    const mon = new Date(2026, 2, 16); // Monday March 16, 2026
    const monday = getMondayOfWeek(mon);
    expect(localDateStr(monday)).toBe('2026-03-16');
  });

  it('returns previous Monday for a Sunday', () => {
    const sun = new Date(2026, 2, 22); // Sunday March 22, 2026
    const monday = getMondayOfWeek(sun);
    expect(localDateStr(monday)).toBe('2026-03-16');
  });
});

describe('daysUntil', () => {
  it('returns positive days for future date', () => {
    const now = new Date('2026-03-19T12:00:00Z');
    expect(daysUntil('2026-03-22', now)).toBe(3);
  });

  it('returns negative for past date', () => {
    const now = new Date('2026-03-19T12:00:00Z');
    expect(daysUntil('2026-03-16', now)).toBe(-3);
  });

  it('returns 0 for same day', () => {
    const now = new Date('2026-03-19T00:00:00Z');
    expect(daysUntil('2026-03-19', now)).toBe(0);
  });
});
