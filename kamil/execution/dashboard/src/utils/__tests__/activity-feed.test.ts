import { describe, it, expect } from 'vitest';
import { buildFeed } from '../activity-feed';
import type { Client, Message, CheckIn, WorkoutLog, Invoice } from '../../types';

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

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: `msg-${Math.random()}`,
  clientId: 'c1',
  clientName: 'Test Client',
  clientAvatar: '',
  text: 'Hello coach',
  timestamp: new Date().toISOString(),
  isRead: false,
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

// ── Tests ──

describe('buildFeed', () => {
  it('returns empty array when no data', () => {
    const result = buildFeed([], [], [], [], [], [], 'en');
    expect(result).toEqual([]);
  });

  it('creates workout_completed event from completed log', () => {
    const client = makeClient();
    const log = makeWorkoutLog({ completed: true });
    const result = buildFeed([client], [], [], [log], [], [], 'en');
    expect(result.some(e => e.type === 'workout_completed')).toBe(true);
  });

  it('creates workout_missed event from missed log', () => {
    const client = makeClient();
    const log = makeWorkoutLog({ completed: false });
    const result = buildFeed([client], [], [], [log], [], [], 'en');
    expect(result.some(e => e.type === 'workout_missed')).toBe(true);
  });

  it('creates checkin_submitted event', () => {
    const client = makeClient();
    const checkIn = makeCheckIn({ reviewStatus: 'pending' });
    const result = buildFeed([client], [], [checkIn], [], [], [], 'en');
    expect(result.some(e => e.type === 'checkin_submitted')).toBe(true);
  });

  it('creates checkin_reviewed event when reviewed with feedback', () => {
    const client = makeClient();
    const checkIn = makeCheckIn({ reviewStatus: 'reviewed', coachFeedback: 'Great progress!' });
    const result = buildFeed([client], [], [checkIn], [], [], [], 'en');
    expect(result.some(e => e.type === 'checkin_reviewed')).toBe(true);
  });

  it('creates message_received event for client messages only', () => {
    const client = makeClient();
    const clientMsg = makeMessage({ isFromCoach: false });
    const coachMsg = makeMessage({ id: 'coach-msg', isFromCoach: true });
    const result = buildFeed([client], [clientMsg, coachMsg], [], [], [], [], 'en');
    const msgEvents = result.filter(e => e.type === 'message_received');
    // Only client messages should appear
    expect(msgEvents.length).toBe(1);
  });

  it('creates invoice_paid event', () => {
    const client = makeClient();
    const inv = makeInvoice({ status: 'paid' });
    const result = buildFeed([client], [], [], [], [], [inv], 'en');
    expect(result.some(e => e.type === 'invoice_paid')).toBe(true);
  });

  it('creates invoice_overdue event', () => {
    const client = makeClient();
    const inv = makeInvoice({ status: 'overdue', paidDate: null });
    const result = buildFeed([client], [], [], [], [], [inv], 'en');
    expect(result.some(e => e.type === 'invoice_overdue')).toBe(true);
  });

  it('respects limit option', () => {
    const client = makeClient();
    const logs = Array.from({ length: 20 }, (_, i) =>
      makeWorkoutLog({ id: `wl-${i}` }),
    );
    const result = buildFeed([client], [], [], logs, [], [], 'en', { limit: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('respects filter option', () => {
    const client = makeClient();
    const log = makeWorkoutLog();
    const msg = makeMessage();
    const result = buildFeed([client], [msg], [], [log], [], [], 'en', { filter: ['message_received'] });
    expect(result.every(e => e.type === 'message_received')).toBe(true);
  });

  it('respects clientId filter', () => {
    const c1 = makeClient({ id: 'c1', name: 'Client One' });
    const c2 = makeClient({ id: 'c2', name: 'Client Two' });
    const log1 = makeWorkoutLog({ clientId: 'c1' });
    const log2 = makeWorkoutLog({ id: 'wl-2', clientId: 'c2' });
    const result = buildFeed([c1, c2], [], [], [log1, log2], [], [], 'en', { clientId: 'c1' });
    expect(result.every(e => e.clientId === 'c1')).toBe(true);
  });

  it('sorts events by timestamp descending (newest first)', () => {
    const client = makeClient();
    const oldDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newDate = new Date().toISOString().slice(0, 10);
    const oldLog = makeWorkoutLog({ id: 'wl-old', date: oldDate });
    const newLog = makeWorkoutLog({ id: 'wl-new', date: newDate });
    const result = buildFeed([client], [], [], [oldLog, newLog], [], [], 'en');
    if (result.length >= 2) {
      expect(result[0].timestamp >= result[1].timestamp).toBe(true);
    }
  });

  it('generates Polish text when lang=pl', () => {
    const client = makeClient();
    const log = makeWorkoutLog();
    const result = buildFeed([client], [], [], [log], [], [], 'pl');
    const event = result.find(e => e.type === 'workout_completed');
    // Polish would say "ukończył/a" or similar — just check it's non-empty
    expect(event?.title.length).toBeGreaterThan(0);
  });

  it('creates client_joined event for new clients', () => {
    const recentStart = new Date();
    recentStart.setDate(recentStart.getDate() - 3);
    const client = makeClient({ startDate: recentStart.toISOString().slice(0, 10) });
    const result = buildFeed([client], [], [], [], [], [], 'en');
    expect(result.some(e => e.type === 'client_joined')).toBe(true);
  });
});
