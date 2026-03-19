import { describe, it, expect } from 'vitest';
import { getInitials, getAvatarColor, getDailyQuote } from '../formatting';

describe('getInitials', () => {
  it('extracts initials from two-word name', () => {
    expect(getInitials('Marcus Chen')).toBe('MC');
  });

  it('extracts initials from single name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('extracts initials from three-word name', () => {
    expect(getInitials('John Michael Smith')).toBe('JMS');
  });

  it('uppercases initials', () => {
    expect(getInitials('john doe')).toBe('JD');
  });
});

describe('getAvatarColor', () => {
  it('returns a hex color string', () => {
    const color = getAvatarColor('some-id');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('is deterministic (same ID = same color)', () => {
    expect(getAvatarColor('abc')).toBe(getAvatarColor('abc'));
  });

  it('different IDs can produce different colors', () => {
    // Not guaranteed for all pairs, but very likely for these
    const c1 = getAvatarColor('user-1');
    const c2 = getAvatarColor('user-completely-different');
    // At least one of several different IDs should differ
    const colors = new Set([c1, c2, getAvatarColor('z'), getAvatarColor('abcdef')]);
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('getDailyQuote', () => {
  const quotes = ['Quote A', 'Quote B', 'Quote C'];
  const authors = ['Author A', 'Author B', 'Author C'];

  it('returns a quote and author', () => {
    const result = getDailyQuote(quotes, authors);
    expect(result.text).toBeTruthy();
    expect(result.author).toBeTruthy();
  });

  it('is deterministic for the same day', () => {
    const now = new Date('2026-03-19');
    const r1 = getDailyQuote(quotes, authors, now);
    const r2 = getDailyQuote(quotes, authors, now);
    expect(r1).toEqual(r2);
  });

  it('rotates based on day of year', () => {
    const jan1 = new Date('2026-01-01');
    const jan2 = new Date('2026-01-02');
    const r1 = getDailyQuote(quotes, authors, jan1);
    const r2 = getDailyQuote(quotes, authors, jan2);
    // Different days should give different quotes (with 3 quotes and consecutive days)
    expect(r1.text !== r2.text || r1.author !== r2.author).toBe(true);
  });

  it('wraps around when day exceeds quotes length', () => {
    // Day 365+ should wrap to valid index
    const dec31 = new Date('2026-12-31');
    const result = getDailyQuote(quotes, authors, dec31);
    expect(quotes).toContain(result.text);
    expect(authors).toContain(result.author);
  });
});
