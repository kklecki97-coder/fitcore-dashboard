import { describe, it, expect } from 'vitest';
import { matchMainLift, parseTarget } from '../lift-matching';

describe('matchMainLift', () => {
  it('matches "Bench Press" to bench', () => {
    expect(matchMainLift('Bench Press')).toBe('bench');
  });

  it('matches Polish bench press', () => {
    expect(matchMainLift('Wyciskanie sztangi leżąc')).toBe('bench');
  });

  it('matches "Flat Bench" to bench', () => {
    expect(matchMainLift('Flat Bench Press')).toBe('bench');
  });

  it('matches "Squat" to squat', () => {
    expect(matchMainLift('Back Squat')).toBe('squat');
  });

  it('matches Polish squat', () => {
    expect(matchMainLift('Przysiad ze sztangą')).toBe('squat');
  });

  it('matches "Deadlift" to deadlift', () => {
    expect(matchMainLift('Conventional Deadlift')).toBe('deadlift');
  });

  it('matches Polish deadlift', () => {
    expect(matchMainLift('Martwy ciąg klasyczny')).toBe('deadlift');
  });

  it('returns null for non-main lifts', () => {
    expect(matchMainLift('Bicep Curls')).toBeNull();
    expect(matchMainLift('Lat Pulldown')).toBeNull();
    expect(matchMainLift('Plank')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(matchMainLift('BENCH PRESS')).toBe('bench');
    expect(matchMainLift('squat')).toBe('squat');
  });
});

describe('parseTarget', () => {
  it('parses "5kg" from goal text', () => {
    expect(parseTarget('Lose 5kg')).toBe(5);
  });

  it('parses decimal weights', () => {
    expect(parseTarget('Drop to 82.5kg')).toBe(82.5);
  });

  it('parses plain number when no kg', () => {
    expect(parseTarget('Run 10 miles')).toBe(10);
  });

  it('returns null for no numbers', () => {
    expect(parseTarget('Get stronger')).toBeNull();
  });

  it('parses first number found', () => {
    expect(parseTarget('Bench 100kg by March')).toBe(100);
  });
});
