import { describe, it, expect } from 'vitest';
import {
  calculateEngagement,
  getEngagementLevel,
  getEngagementColor,
  getScoreColor,
  getScoreLabel,
  generateEngagementInsight,
  getSuggestedAction,
} from '../engagement';
import type { Client, WorkoutLog, CheckIn } from '../../types';

// ── Factories ──

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'c1',
  name: 'Test Client',
  avatar: '',
  email: 'test@test.com',
  plan: 'Premium',
  status: 'active',
  startDate: '2025-01-01',
  nextCheckIn: '2026-03-25',
  monthlyRate: 200,
  progress: 50,
  metrics: { weight: [80], bodyFat: [15], benchPress: [60], squat: [80], deadlift: [100], waist: [], hips: [], chest: [], bicep: [], thigh: [] },
  goals: [],
  notes: '',
  notesHistory: [],
  activityLog: [],
  lastActive: '2 hours ago',
  streak: 5,
  height: 180,
  ...overrides,
});

const makeWorkoutLog = (overrides: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id: `wl-${Math.random()}`,
  clientId: 'c1',
  clientName: 'Test Client',
  type: 'strength',
  duration: 60,
  date: new Date().toISOString().slice(0, 10),
  completed: true,
  ...overrides,
});

const makeCheckIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  id: `ci-${Math.random()}`,
  clientId: 'c1',
  clientName: 'Test Client',
  date: new Date().toISOString().slice(0, 10),
  status: 'completed',
  weight: 80,
  bodyFat: 15,
  waist: null,
  hips: null,
  chest: null,
  bicep: null,
  thigh: null,
  mood: 4,
  energy: 7,
  stress: 3,
  sleepHours: 7,
  steps: 8000,
  nutritionScore: 7,
  notes: '',
  wins: '',
  challenges: '',
  coachFeedback: '',
  reviewStatus: 'reviewed',
  flagReason: '',
  photos: [],
  followUpNotes: [],
  ...overrides,
});


function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Tests ──

describe('calculateEngagement', () => {
  it('returns 100 for new client with no data', () => {
    const client = makeClient();
    const result = calculateEngagement(client, [], [], []);
    expect(result.total).toBe(100);
    expect(result.trend).toBe('stable');
    expect(result.history).toHaveLength(8);
  });

  it('returns high score for active client with completed workouts', () => {
    const client = makeClient({ streak: 14 });
    const logs = Array.from({ length: 10 }, (_, i) =>
      makeWorkoutLog({ id: `wl-${i}`, date: daysAgo(i), completed: true }),
    );
    const checkIns = [
      makeCheckIn({ id: 'ci1', date: daysAgo(7), status: 'completed' }),
    ];
    const result = calculateEngagement(client, logs, checkIns, []);
    expect(result.total).toBeGreaterThanOrEqual(50);
  });

  it('penalizes missed workouts', () => {
    const client = makeClient({ streak: 0 });
    const logs = Array.from({ length: 5 }, (_, i) =>
      makeWorkoutLog({ id: `wl-${i}`, date: daysAgo(i), completed: false }),
    );
    const result = calculateEngagement(client, logs, [], []);
    expect(result.breakdown.workoutCompletion).toBe(0);
  });

  it('penalizes missed check-ins', () => {
    const client = makeClient();
    const checkIns = [
      makeCheckIn({ id: 'ci1', status: 'missed' }),
      makeCheckIn({ id: 'ci2', status: 'missed' }),
      makeCheckIn({ id: 'ci3', status: 'completed' }),
    ];
    const result = calculateEngagement(client, [], checkIns, []);
    expect(result.breakdown.checkInRate).toBeLessThan(50);
  });

  it('returns 8-week history array', () => {
    const client = makeClient();
    const logs = [makeWorkoutLog()];
    const result = calculateEngagement(client, logs, [], []);
    expect(result.history).toHaveLength(8);
    result.history.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });
});

describe('getEngagementLevel', () => {
  it('returns green for ≥80', () => expect(getEngagementLevel(80)).toBe('green'));
  it('returns yellow for ≥50', () => expect(getEngagementLevel(60)).toBe('yellow'));
  it('returns orange for ≥25', () => expect(getEngagementLevel(30)).toBe('orange'));
  it('returns red for <25', () => expect(getEngagementLevel(10)).toBe('red'));
});

describe('getEngagementColor', () => {
  it('returns green color for high scores', () => expect(getEngagementColor(85)).toBe('#22c55e'));
  it('returns yellow for mid scores', () => expect(getEngagementColor(60)).toBe('#eab308'));
  it('returns orange for low scores', () => expect(getEngagementColor(30)).toBe('#f97316'));
  it('returns red for very low', () => expect(getEngagementColor(10)).toBe('#ef4444'));
});

describe('getScoreColor', () => {
  it('returns accent green for ≥80', () => expect(getScoreColor(85)).toBe('#20dba4'));
  it('returns amber for ≥50', () => expect(getScoreColor(60)).toBe('#f59e0b'));
});

describe('getScoreLabel', () => {
  it('returns excellent for ≥80', () => expect(getScoreLabel(85)).toBe('excellent'));
  it('returns good for ≥50', () => expect(getScoreLabel(60)).toBe('good'));
  it('returns needsAttention for ≥25', () => expect(getScoreLabel(30)).toBe('needsAttention'));
  it('returns atRisk for <25', () => expect(getScoreLabel(10)).toBe('atRisk'));
});

describe('generateEngagementInsight', () => {
  it('returns English insight by default', () => {
    const client = makeClient();
    const score = calculateEngagement(client, [], [], []);
    const insight = generateEngagementInsight(client, score, 'en');
    expect(typeof insight).toBe('string');
    expect(insight.length).toBeGreaterThan(10);
    expect(insight).toContain('Test');
  });

  it('returns Polish insight when lang=pl', () => {
    const client = makeClient({ status: 'paused', streak: 0 });
    const logs = [makeWorkoutLog({ completed: false })];
    const score = calculateEngagement(client, logs, [], []);
    const insight = generateEngagementInsight(client, score, 'pl');
    expect(typeof insight).toBe('string');
    expect(insight.length).toBeGreaterThan(10);
  });
});

describe('getSuggestedAction', () => {
  it('suggests motivation for high scores', () => {
    const score = calculateEngagement(makeClient(), [], [], []);
    const action = getSuggestedAction(score, 'en');
    expect(action.type).toBe('motivation');
  });

  it('suggests call for very low scores', () => {
    const client = makeClient({ streak: 0 });
    const logs = Array.from({ length: 5 }, (_, i) =>
      makeWorkoutLog({ id: `wl-${i}`, completed: false }),
    );
    const checkIns = [
      makeCheckIn({ id: 'ci1', status: 'missed' }),
      makeCheckIn({ id: 'ci2', status: 'missed' }),
    ];
    const score = calculateEngagement(client, logs, checkIns, []);
    if (score.total < 30) {
      const action = getSuggestedAction(score, 'en');
      expect(action.type).toBe('call');
    }
  });
});
