import { describe, it, expect } from 'vitest';
import { buildSnapshot, hashString } from '../dashboard-snapshot';
import type { Client, Invoice, CheckIn, Message, WorkoutProgram } from '../../types';

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'c1', name: 'Test', avatar: '', email: '', plan: 'Premium',
  status: 'active', startDate: '', nextCheckIn: '', monthlyRate: 200,
  progress: 50, metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
  goals: [], notes: '', notesHistory: [], activityLog: [], lastActive: '', streak: 0,
  ...overrides,
});

describe('buildSnapshot', () => {
  it('counts active and paused clients', () => {
    const clients = [
      makeClient({ status: 'active' }),
      makeClient({ id: 'c2', status: 'active' }),
      makeClient({ id: 'c3', status: 'paused' }),
    ];
    const result = buildSnapshot(clients, [], [], [], [], []);
    expect(result.totalClients).toBe(3);
    expect(result.activeClients).toBe(2);
    expect(result.pausedClients).toBe(1);
  });

  it('counts pending check-ins', () => {
    const checkIns = [
      { reviewStatus: 'pending' },
      { reviewStatus: 'reviewed' },
      { reviewStatus: 'pending' },
    ] as CheckIn[];
    const result = buildSnapshot([], [], [], checkIns, [], []);
    expect(result.pendingCheckIns).toBe(2);
  });

  it('counts unread messages (from client only)', () => {
    const messages = [
      { isFromCoach: false, isRead: false },
      { isFromCoach: false, isRead: true },
      { isFromCoach: true, isRead: false }, // coach msg, should not count
    ] as Message[];
    const result = buildSnapshot([], [], [], [], messages, []);
    expect(result.unreadMessages).toBe(1);
  });

  it('counts active non-template programs', () => {
    const programs = [
      { status: 'active', isTemplate: false },
      { status: 'active', isTemplate: true }, // template, should not count
      { status: 'draft', isTemplate: false }, // draft, should not count
    ] as WorkoutProgram[];
    const result = buildSnapshot([], [], [], [], [], programs);
    expect(result.activePrograms).toBe(1);
  });

  it('sums revenue for invoices matching current month period', () => {
    const now = new Date(2026, 2, 19); // March 2026
    const invoices = [
      { status: 'paid', period: 'Mar 2026', amount: 200 },
      { status: 'paid', period: 'Mar 2026', amount: 300 },
      { status: 'paid', period: 'Feb 2026', amount: 150 },
      { status: 'pending', period: 'Mar 2026', amount: 100 }, // not paid
    ] as Invoice[];
    const result = buildSnapshot([], invoices, [], [], [], [], now);
    expect(result.revenueThisMonth).toBe(500);
    expect(result.revenuePrevMonth).toBe(150);
  });
});

describe('hashString', () => {
  it('returns a string starting with "briefing-"', () => {
    expect(hashString('test')).toMatch(/^briefing-/);
  });

  it('is deterministic', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
