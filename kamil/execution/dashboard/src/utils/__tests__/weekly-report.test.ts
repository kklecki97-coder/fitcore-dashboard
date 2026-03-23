import { describe, it, expect } from 'vitest';
import { computeWeeklyReport, pctChange } from '../weekly-report';
import type { Client, Message, Invoice, WorkoutLog, CheckIn } from '../../types';

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'c1', name: 'Test', avatar: '', email: '', plan: 'Premium',
  status: 'active', startDate: '', nextCheckIn: '', monthlyRate: 200,
  progress: 50, metrics: { weight: [85, 83], bodyFat: [18, 17], benchPress: [80, 90], squat: [100, 110], deadlift: [120, 120], waist: [], hips: [], chest: [], bicep: [], thigh: [] },
  goals: [], notes: '', notesHistory: [], activityLog: [], lastActive: '2026-03-19', streak: 5,
  ...overrides,
});

const makeLog = (date: string, clientId = 'c1'): WorkoutLog => ({
  id: `w-${date}-${clientId}`, clientId, clientName: 'Test', type: 'Upper', duration: 60, date, completed: true,
});

const makeInvoice = (paidDate: string, amount = 200): Invoice => ({
  id: `inv-${paidDate}`, clientId: 'c1', clientName: 'Test', amount, status: 'paid',
  dueDate: paidDate, paidDate, period: 'Mar 2026', plan: 'Premium',
});

const makeCheckIn = (date: string, reviewStatus: 'pending' | 'reviewed' | 'flagged' = 'reviewed'): CheckIn => ({
  id: `ci-${date}`, clientId: 'c1', clientName: 'Test', date, status: 'completed',
  weight: 83, bodyFat: 17, waist: null, hips: null, chest: null, bicep: null, thigh: null,
  mood: 4, energy: 7, stress: 3, sleepHours: 7,
  steps: 8000, nutritionScore: 7, notes: '', wins: '', challenges: '',
  coachFeedback: '', photos: [], reviewStatus, flagReason: '', followUpNotes: [],
});

const makeMessage = (timestamp: string, isFromCoach: boolean): Message => ({
  id: `m-${timestamp}`, clientId: 'c1', clientName: 'Test', clientAvatar: '',
  text: 'Hello', timestamp, isRead: true, isFromCoach,
});

describe('pctChange', () => {
  it('calculates positive change', () => {
    expect(pctChange(150, 100)).toBe(50);
  });
  it('calculates negative change', () => {
    expect(pctChange(80, 100)).toBe(-20);
  });
  it('handles zero previous', () => {
    expect(pctChange(100, 0)).toBe(100);
    expect(pctChange(0, 0)).toBe(0);
  });
});

describe('computeWeeklyReport', () => {
  const now = new Date('2026-03-20T12:00:00Z');

  it('counts workouts in current week', () => {
    const logs = [
      makeLog('2026-03-18'),  // this week
      makeLog('2026-03-19'),  // this week
      makeLog('2026-03-10'),  // prev week
    ];
    const result = computeWeeklyReport([makeClient()], [], [], logs, [], now);
    expect(result.totalWorkouts).toBe(2);
    expect(result.completedWorkouts).toBe(2);
    expect(result.prevWeekWorkouts).toBe(1);
  });

  it('counts revenue from paid invoices this week', () => {
    const invoices = [
      makeInvoice('2026-03-18', 300),  // this week
      makeInvoice('2026-03-10', 200),  // prev week
    ];
    const result = computeWeeklyReport([], [], invoices, [], [], now);
    expect(result.weekRevenue).toBe(300);
    expect(result.prevWeekRevenue).toBe(200);
  });

  it('counts check-ins by review status', () => {
    const checkIns = [
      makeCheckIn('2026-03-18', 'reviewed'),
      makeCheckIn('2026-03-19', 'pending'),
      makeCheckIn('2026-03-19', 'flagged'),
    ];
    const result = computeWeeklyReport([], [], [], [], checkIns, now);
    expect(result.checkInsReviewed).toBe(1);
    expect(result.checkInsPending).toBe(1);
    expect(result.checkInsFlagged).toBe(1);
  });

  it('counts messages sent and received', () => {
    const messages = [
      makeMessage('2026-03-18T10:00:00Z', true),   // sent by coach
      makeMessage('2026-03-18T11:00:00Z', false),   // from client
      makeMessage('2026-03-18T12:00:00Z', false),   // from client
      makeMessage('2026-03-10T10:00:00Z', true),    // prev week
    ];
    const result = computeWeeklyReport([], messages, [], [], [], now);
    expect(result.messagesSent).toBe(1);
    expect(result.messagesReceived).toBe(2);
    expect(result.prevWeekMessages).toBe(1);
  });

  it('identifies top performer', () => {
    const clients = [
      makeClient({ id: 'c1', name: 'Alice' }),
      makeClient({ id: 'c2', name: 'Bob' }),
    ];
    const logs = [
      makeLog('2026-03-18', 'c1'),
      makeLog('2026-03-19', 'c2'),
      makeLog('2026-03-19', 'c2'),
      makeLog('2026-03-20', 'c2'),
    ];
    const result = computeWeeklyReport(clients, [], [], logs, [], now);
    expect(result.topPerformer?.name).toBe('Bob');
    expect(result.topPerformer?.workouts).toBe(3);
  });

  it('detects at-risk clients', () => {
    const clients = [
      makeClient({ id: 'c1', name: 'Active Alice' }),
      makeClient({ id: 'c2', name: 'Lazy Larry' }),
    ];
    const logs = [makeLog('2026-03-18', 'c1')]; // only Alice worked out
    const checkIns = [makeCheckIn('2026-03-18')]; // only c1 checked in
    const result = computeWeeklyReport(clients, [], [], logs, checkIns, now);
    expect(result.atRiskClients.length).toBe(1);
    expect(result.atRiskClients[0].name).toBe('Lazy Larry');
  });

  it('detects new PRs from client metrics', () => {
    const clients = [
      makeClient({
        metrics: { weight: [], bodyFat: [], benchPress: [80, 90], squat: [100, 100], deadlift: [120, 130], waist: [], hips: [], chest: [], bicep: [], thigh: [] },
      }),
    ];
    const result = computeWeeklyReport(clients, [], [], [], [], now);
    expect(result.newPRs.length).toBe(2); // bench +10, deadlift +10 (squat no change)
  });

  it('returns empty arrays for no data', () => {
    const result = computeWeeklyReport([], [], [], [], [], now);
    expect(result.totalWorkouts).toBe(0);
    expect(result.weekRevenue).toBe(0);
    expect(result.topPerformer).toBeNull();
    expect(result.atRiskClients).toEqual([]);
    expect(result.newPRs).toEqual([]);
  });
});
