import { describe, it, expect } from 'vitest';
import { filterAtRiskClients } from '../client-analysis';
import type { Client, WorkoutLog } from '../../types';

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
  metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [] },
  goals: [],
  notes: '',
  notesHistory: [],
  activityLog: [],
  lastActive: '2026-03-19',
  streak: 5,
  ...overrides,
});

const makeLog = (overrides: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id: 'w1',
  clientId: 'c1',
  clientName: 'Test',
  type: 'Upper',
  duration: 60,
  date: '2026-03-18',
  completed: true,
  ...overrides,
});

describe('filterAtRiskClients', () => {
  const now = new Date('2026-03-19T12:00:00Z');

  it('flags paused clients', () => {
    const clients = [makeClient({ status: 'paused' })];
    const result = filterAtRiskClients(clients, [], now);
    expect(result).toHaveLength(1);
  });

  it('flags clients with no recent workouts', () => {
    const clients = [makeClient()];
    const logs: WorkoutLog[] = []; // no workouts
    const result = filterAtRiskClients(clients, logs, now);
    expect(result).toHaveLength(1);
  });

  it('does NOT flag clients with recent workouts and future check-in', () => {
    const clients = [makeClient({ nextCheckIn: '2026-03-25' })];
    const logs = [makeLog({ date: '2026-03-18' })]; // within 7 days
    const result = filterAtRiskClients(clients, logs, now);
    expect(result).toHaveLength(0);
  });

  it('flags clients with overdue check-in even if they have workouts', () => {
    const clients = [makeClient({ nextCheckIn: '2026-03-10' })]; // overdue
    const logs = [makeLog({ date: '2026-03-18' })]; // has recent workout
    const result = filterAtRiskClients(clients, logs, now);
    expect(result).toHaveLength(1);
  });

  it('handles nextCheckIn of "-" gracefully', () => {
    const clients = [makeClient({ nextCheckIn: '-' })];
    const logs = [makeLog({ date: '2026-03-18' })];
    const result = filterAtRiskClients(clients, logs, now);
    expect(result).toHaveLength(0); // not flagged because "-" is ignored
  });

  it('returns empty for empty inputs', () => {
    expect(filterAtRiskClients([], [], now)).toEqual([]);
  });
});
