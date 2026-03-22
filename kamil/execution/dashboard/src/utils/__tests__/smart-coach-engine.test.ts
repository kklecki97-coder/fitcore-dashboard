import { describe, it, expect } from 'vitest';
import { generateTriggers, getBusinessDaysSince } from '../smart-coach-engine';
import type { Client, Message, CheckIn, Invoice, WorkoutLog, WorkoutProgram } from '../../types';

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
  metrics: { weight: [80, 82], bodyFat: [15, 14], benchPress: [60, 65], squat: [80, 85], deadlift: [100, 110] },
  goals: ['Lose weight'],
  notes: '',
  notesHistory: [],
  activityLog: [],
  lastActive: new Date().toISOString(),
  streak: 5,
  height: 180,
  ...overrides,
});

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: `msg-${Math.random()}`,
  clientId: 'c1',
  clientName: 'Test Client',
  clientAvatar: '',
  text: 'Hello',
  timestamp: new Date().toISOString(),
  isRead: true,
  isFromCoach: false,
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
  mood: 4,
  energy: 7,
  stress: 3,
  sleepHours: 7.5,
  steps: 8000,
  nutritionScore: 7,
  notes: '',
  wins: '',
  challenges: '',
  coachFeedback: 'Good work',
  reviewStatus: 'reviewed',
  flagReason: '',
  photos: [],
  followUpNotes: [],
  ...overrides,
});

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: `inv-${Math.random()}`,
  clientId: 'c1',
  clientName: 'Test Client',
  amount: 200,
  status: 'paid',
  dueDate: '2026-03-01',
  paidDate: '2026-03-01',
  period: 'Mar 2026',
  plan: 'Premium',
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

const makeProgram = (overrides: Partial<WorkoutProgram> = {}): WorkoutProgram => ({
  id: 'prog-1',
  name: 'Test Program',
  status: 'active',
  durationWeeks: 12,
  clientIds: ['c1'],
  days: [],
  isTemplate: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

// ── Tests ──

describe('generateTriggers', () => {
  it('returns empty array for empty clients', () => {
    const result = generateTriggers([], [], [], [], [], [], [], 'en');
    expect(result).toEqual([]);
  });

  it('returns all-clear when no HIGH priority issues', () => {
    const client = makeClient();
    const result = generateTriggers([client], [], [], [], [], [], [], 'en');
    expect(result.some(t => t.type === 'all-clear')).toBe(true);
  });

  describe('checkin-overdue trigger', () => {
    it('fires when check-in is pending review for >48h', () => {
      const client = makeClient();
      const checkIn = makeCheckIn({
        date: daysAgo(3),
        reviewStatus: 'pending',
      });
      const result = generateTriggers([client], [], [checkIn], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'checkin-overdue')).toBe(true);
    });

    it('does NOT fire for recently submitted check-in', () => {
      const client = makeClient();
      const checkIn = makeCheckIn({
        date: daysAgo(1),
        reviewStatus: 'pending',
      });
      const result = generateTriggers([client], [], [checkIn], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'checkin-overdue')).toBe(false);
    });

    it('does NOT fire for already reviewed check-in', () => {
      const client = makeClient();
      const checkIn = makeCheckIn({
        date: daysAgo(5),
        reviewStatus: 'reviewed',
      });
      const result = generateTriggers([client], [], [checkIn], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'checkin-overdue')).toBe(false);
    });
  });

  describe('msg-unanswered trigger', () => {
    it('fires when client message unanswered >48h', () => {
      const client = makeClient();
      const msg = makeMessage({
        timestamp: hoursAgo(72),
        isFromCoach: false,
      });
      const result = generateTriggers([client], [msg], [], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'msg-unanswered')).toBe(true);
    });

    it('does NOT fire when coach replied after client', () => {
      const client = makeClient();
      const clientMsg = makeMessage({
        id: 'cm1',
        timestamp: hoursAgo(72),
        isFromCoach: false,
      });
      const coachMsg = makeMessage({
        id: 'cm2',
        timestamp: hoursAgo(24),
        isFromCoach: true,
      });
      const result = generateTriggers([client], [clientMsg, coachMsg], [], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'msg-unanswered')).toBe(false);
    });
  });

  describe('wellness-decline trigger', () => {
    it('fires when energy is declining over 3 check-ins (newest-first)', () => {
      const client = makeClient();
      // newest first order in check-ins array (sorted by date desc)
      const checkIns = [
        makeCheckIn({ id: 'ci3', date: daysAgo(0), energy: 3, mood: 4 }),
        makeCheckIn({ id: 'ci2', date: daysAgo(7), energy: 5, mood: 4 }),
        makeCheckIn({ id: 'ci1', date: daysAgo(14), energy: 8, mood: 4 }),
      ];
      const result = generateTriggers([client], [], checkIns, [], [], [], [], 'en');
      expect(result.some(t => t.type === 'wellness-decline')).toBe(true);
    });

    it('fires when energy plateaus after drop (5→5→8)', () => {
      const client = makeClient();
      const checkIns = [
        makeCheckIn({ id: 'ci3', date: daysAgo(0), energy: 5, mood: 4 }),
        makeCheckIn({ id: 'ci2', date: daysAgo(7), energy: 5, mood: 4 }),
        makeCheckIn({ id: 'ci1', date: daysAgo(14), energy: 8, mood: 4 }),
      ];
      const result = generateTriggers([client], [], checkIns, [], [], [], [], 'en');
      expect(result.some(t => t.type === 'wellness-decline')).toBe(true);
    });

    it('does NOT fire when values are flat (5→5→5)', () => {
      const client = makeClient();
      const checkIns = [
        makeCheckIn({ id: 'ci3', date: daysAgo(0), energy: 5, mood: 5 }),
        makeCheckIn({ id: 'ci2', date: daysAgo(7), energy: 5, mood: 5 }),
        makeCheckIn({ id: 'ci1', date: daysAgo(14), energy: 5, mood: 5 }),
      ];
      const result = generateTriggers([client], [], checkIns, [], [], [], [], 'en');
      expect(result.some(t => t.type === 'wellness-decline')).toBe(false);
    });

    it('does NOT fire when values are rising (3→5→8)', () => {
      const client = makeClient();
      const checkIns = [
        makeCheckIn({ id: 'ci3', date: daysAgo(0), energy: 8, mood: 4 as const }),
        makeCheckIn({ id: 'ci2', date: daysAgo(7), energy: 5, mood: 4 as const }),
        makeCheckIn({ id: 'ci1', date: daysAgo(14), energy: 3, mood: 4 as const }),
      ];
      const result = generateTriggers([client], [], checkIns, [], [], [], [], 'en');
      expect(result.some(t => t.type === 'wellness-decline')).toBe(false);
    });
  });

  describe('invoice-overdue trigger', () => {
    it('fires for overdue invoice', () => {
      const client = makeClient();
      const inv = makeInvoice({
        status: 'overdue',
        dueDate: daysAgo(10),
        paidDate: null,
      });
      const result = generateTriggers([client], [], [], [inv], [], [], [], 'en');
      expect(result.some(t => t.type === 'invoice-overdue')).toBe(true);
    });
  });

  describe('missed-workout trigger', () => {
    it('fires when last workout >2 business days ago', () => {
      const client = makeClient();
      const program = makeProgram();
      const log = makeWorkoutLog({ date: daysAgo(5) });
      const result = generateTriggers([client], [], [], [], [log], [program], [], 'en');
      expect(result.some(t => t.type === 'missed-workout')).toBe(true);
    });

    it('does NOT fire when client trained recently', () => {
      const client = makeClient();
      const program = makeProgram();
      const log = makeWorkoutLog({ date: daysAgo(0) });
      const result = generateTriggers([client], [], [], [], [log], [program], [], 'en');
      expect(result.some(t => t.type === 'missed-workout')).toBe(false);
    });
  });

  describe('streak milestone trigger', () => {
    it('fires at streak of 7', () => {
      const client = makeClient({
        streak: 7,
        metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
      });
      const result = generateTriggers([client], [], [], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'streak')).toBe(true);
    });

    it('does NOT fire at streak of 8', () => {
      const client = makeClient({
        streak: 8,
        metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
      });
      const result = generateTriggers([client], [], [], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'streak')).toBe(false);
    });
  });

  describe('pr trigger', () => {
    it('fires when latest lift exceeds previous max', () => {
      const client = makeClient({
        metrics: { weight: [80], bodyFat: [15], benchPress: [60, 65, 70], squat: [80], deadlift: [100] },
      });
      const result = generateTriggers([client], [], [], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'pr')).toBe(true);
    });

    it('does NOT fire when latest is below max', () => {
      const client = makeClient({
        metrics: { weight: [80], bodyFat: [15], benchPress: [60, 70, 65], squat: [80], deadlift: [100] },
      });
      const result = generateTriggers([client], [], [], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'pr')).toBe(false);
    });
  });

  describe('per-client cap', () => {
    it('limits to max 3 triggers per client', () => {
      // Create a client with many trigger conditions
      const client = makeClient({ streak: 7 });
      const checkIns = [
        makeCheckIn({ id: 'ci3', date: daysAgo(0), energy: 3, mood: 3 }),
        makeCheckIn({ id: 'ci2', date: daysAgo(7), energy: 5, mood: 5 }),
        makeCheckIn({ id: 'ci1', date: daysAgo(14), energy: 8, mood: 5 }),
        makeCheckIn({ id: 'ci-pending', date: daysAgo(5), reviewStatus: 'pending' }),
      ];
      const inv = makeInvoice({ status: 'overdue', dueDate: daysAgo(10), paidDate: null });
      const result = generateTriggers([client], [], checkIns, [inv], [], [], [], 'en');
      const clientTriggers = result.filter(t => t.clientId === 'c1');
      expect(clientTriggers.length).toBeLessThanOrEqual(3);
    });
  });

  describe('dismissed triggers', () => {
    it('filters out dismissed trigger IDs', () => {
      const client = makeClient({ streak: 7 });
      const today = new Date().toISOString().slice(0, 10);
      const dismissedId = `c1-streak-${today}`;
      const result = generateTriggers([client], [], [], [], [], [], [dismissedId], 'en');
      expect(result.some(t => t.type === 'streak')).toBe(false);
    });
  });

  describe('i18n', () => {
    it('generates Polish text when lang=pl', () => {
      const client = makeClient({
        streak: 14,
        metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
      });
      const result = generateTriggers([client], [], [], [], [], [], [], 'pl');
      const streak = result.find(t => t.type === 'streak');
      expect(streak).toBeDefined();
      expect(streak!.insightText).toContain('streak');
      expect(streak!.insightText).toContain('dni');
    });
  });

  describe('paused clients', () => {
    it('does NOT fire inactive trigger for paused clients', () => {
      const client = makeClient({ status: 'paused', lastActive: daysAgo(30) });
      const result = generateTriggers([client], [], [], [], [], [], [], 'en');
      expect(result.some(t => t.type === 'inactive')).toBe(false);
    });
  });

  describe('convo guard', () => {
    it('suppresses draft when recent conversation exists', () => {
      const client = makeClient();
      const program = makeProgram();
      const log = makeWorkoutLog({ date: daysAgo(5) });
      // Recent message within 24h
      const msg = makeMessage({ timestamp: hoursAgo(2), isFromCoach: true });
      const result = generateTriggers([client], [msg], [], [], [log], [program], [], 'en');
      const missedWorkout = result.find(t => t.type === 'missed-workout');
      if (missedWorkout) {
        expect(missedWorkout.draftText).toBeNull();
        expect(missedWorkout.insightText).toContain('active conversation');
      }
    });
  });
});

describe('getBusinessDaysSince', () => {
  it('returns 0 for today', () => {
    expect(getBusinessDaysSince(new Date().toISOString())).toBe(0);
  });

  it('returns 0 for future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(getBusinessDaysSince(future.toISOString())).toBe(0);
  });
});
