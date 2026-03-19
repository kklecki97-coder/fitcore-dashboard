import { describe, it, expect } from 'vitest';
import { calculateMetricChange, buildLiftData, buildClientRadarData } from '../client-metrics';
import type { Client } from '../../types';

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'c1',
  name: 'Test',
  avatar: '',
  email: 'test@test.com',
  plan: 'Premium',
  status: 'active',
  startDate: '2026-01-01',
  nextCheckIn: '2026-03-25',
  monthlyRate: 200,
  progress: 50,
  metrics: {
    weight: [85, 83, 82],
    bodyFat: [18, 17, 16],
    benchPress: [80, 85, 90],
    squat: [100, 110, 120],
    deadlift: [120, 130, 140],
  },
  goals: [],
  notes: '',
  notesHistory: [],
  activityLog: [],
  lastActive: '2026-03-19',
  streak: 10,
  ...overrides,
});

describe('calculateMetricChange', () => {
  it('returns null values for empty array', () => {
    const result = calculateMetricChange([]);
    expect(result.latestValue).toBeNull();
    expect(result.prevValue).toBeNull();
    expect(result.change).toBe(0);
  });

  it('returns same value for single entry', () => {
    const result = calculateMetricChange([85]);
    expect(result.latestValue).toBe(85);
    expect(result.prevValue).toBe(85);
    expect(result.change).toBe(0);
  });

  it('computes change between last two values', () => {
    const result = calculateMetricChange([85, 83, 82]);
    expect(result.latestValue).toBe(82);
    expect(result.prevValue).toBe(83);
    expect(result.change).toBe(-1);
  });

  it('handles increasing values', () => {
    const result = calculateMetricChange([80, 85, 90]);
    expect(result.change).toBe(5);
  });
});

describe('buildLiftData', () => {
  it('builds lift chart data from client metrics', () => {
    const client = makeClient();
    const months = ['Oct', 'Nov', 'Dec'];
    const result = buildLiftData(client, months);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ month: 'Oct', bench: 80, squat: 100, deadlift: 120 });
    expect(result[2]).toEqual({ month: 'Dec', bench: 90, squat: 120, deadlift: 140 });
  });

  it('uses fallback month labels when not enough provided', () => {
    const client = makeClient();
    const result = buildLiftData(client, ['Oct']);
    expect(result[1].month).toBe('M1');
    expect(result[2].month).toBe('M2');
  });
});

describe('buildClientRadarData', () => {
  it('returns 6 radar data points', () => {
    const client = makeClient();
    const labels = {
      strength: 'Strength',
      endurance: 'Endurance',
      consistency: 'Consistency',
      nutrition: 'Nutrition',
      recovery: 'Recovery',
      progress: 'Progress',
    };
    const result = buildClientRadarData(client, labels);
    expect(result).toHaveLength(6);
    expect(result.map(r => r.metric)).toEqual([
      'Strength', 'Endurance', 'Consistency', 'Nutrition', 'Recovery', 'Progress',
    ]);
  });

  it('caps values at 100', () => {
    const client = makeClient({ streak: 100, progress: 100 });
    const labels = {
      strength: 'S', endurance: 'E', consistency: 'C',
      nutrition: 'N', recovery: 'R', progress: 'P',
    };
    const result = buildClientRadarData(client, labels);
    result.forEach(r => {
      expect(r.value).toBeLessThanOrEqual(100);
    });
  });

  it('handles zero metrics gracefully', () => {
    const client = makeClient({
      metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
      streak: 0,
      progress: 0,
    });
    const labels = {
      strength: 'S', endurance: 'E', consistency: 'C',
      nutrition: 'N', recovery: 'R', progress: 'P',
    };
    const result = buildClientRadarData(client, labels);
    expect(result).toHaveLength(6);
    // Strength should be 0 (0/120 * 100)
    expect(result[0].value).toBe(0);
  });
});
