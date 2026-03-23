import { describe, it, expect } from 'vitest';
import {
  computeRevenueChartData,
  calculateRevenueChange,
  computePlanDistribution,
  computePlanRevenue,
  computeEngagementMetrics,
} from '../analytics';
import type { Invoice, Client, CheckIn } from '../../types';

// ── Helpers ──
const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-1',
  clientId: 'c1',
  clientName: 'Test',
  amount: 100,
  status: 'paid',
  dueDate: '2026-03-01',
  paidDate: '2026-03-01',
  period: 'Mar 2026',
  plan: 'Premium',
  ...overrides,
});

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'c1',
  name: 'Test Client',
  avatar: '',
  email: 'test@test.com',
  plan: 'Premium',
  status: 'active',
  startDate: '2026-01-01',
  nextCheckIn: '2026-03-25',
  monthlyRate: 200,
  progress: 50,
  metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [], waist: [], hips: [], chest: [], bicep: [], thigh: [] },
  goals: [],
  notes: '',
  notesHistory: [],
  activityLog: [],
  lastActive: '2026-03-19',
  streak: 5,
  ...overrides,
});

// ── Tests ──

describe('calculateRevenueChange', () => {
  it('returns percentage increase', () => {
    expect(calculateRevenueChange(150, 100)).toBe(50);
  });

  it('returns percentage decrease', () => {
    expect(calculateRevenueChange(80, 100)).toBe(-20);
  });

  it('returns 0 when both are 0', () => {
    expect(calculateRevenueChange(0, 0)).toBe(0);
  });

  it('returns 100 when previous is 0 but current is positive', () => {
    expect(calculateRevenueChange(500, 0)).toBe(100);
  });

  it('handles negative previous gracefully', () => {
    expect(calculateRevenueChange(100, -50)).toBe(100);
  });
});

describe('computeRevenueChartData', () => {
  it('returns 6 months by default', () => {
    const result = computeRevenueChartData([]);
    expect(result).toHaveLength(6);
  });

  it('returns custom number of months', () => {
    const result = computeRevenueChartData([], 3);
    expect(result).toHaveLength(3);
  });

  it('sums revenue from paid invoices in correct month', () => {
    const now = new Date(2026, 2, 19); // March 2026
    const invoices: Invoice[] = [
      makeInvoice({ amount: 200, paidDate: '2026-03-05', status: 'paid' }),
      makeInvoice({ id: 'inv-2', amount: 300, paidDate: '2026-03-15', status: 'paid' }),
      makeInvoice({ id: 'inv-3', amount: 100, paidDate: '2026-02-10', status: 'paid' }),
      makeInvoice({ id: 'inv-4', amount: 50, status: 'pending', paidDate: null }), // not paid
    ];
    const result = computeRevenueChartData(invoices, 6, now);
    const march = result[result.length - 1];
    const february = result[result.length - 2];

    expect(march.revenue).toBe(500); // 200 + 300
    expect(february.revenue).toBe(100);
  });

  it('counts unique clients per month', () => {
    const now = new Date(2026, 2, 19);
    const invoices: Invoice[] = [
      makeInvoice({ clientId: 'c1', paidDate: '2026-03-01' }),
      makeInvoice({ id: 'inv-2', clientId: 'c1', paidDate: '2026-03-15' }),
      makeInvoice({ id: 'inv-3', clientId: 'c2', paidDate: '2026-03-10' }),
    ];
    const result = computeRevenueChartData(invoices, 6, now);
    const march = result[result.length - 1];
    expect(march.clients).toBe(2); // c1 and c2
  });
});

describe('computePlanDistribution', () => {
  it('returns empty array for no clients', () => {
    expect(computePlanDistribution([])).toEqual([]);
  });

  it('counts clients per plan', () => {
    const clients = [
      makeClient({ plan: 'Premium' }),
      makeClient({ id: 'c2', plan: 'Premium' }),
      makeClient({ id: 'c3', plan: 'Elite' }),
      makeClient({ id: 'c4', plan: 'Basic' }),
    ];
    const result = computePlanDistribution(clients);
    expect(result).toHaveLength(3);
    expect(result.find(p => p.name === 'Premium')?.value).toBe(2);
    expect(result.find(p => p.name === 'Elite')?.value).toBe(1);
    expect(result.find(p => p.name === 'Basic')?.value).toBe(1);
  });

  it('assigns colors from provided palette', () => {
    const clients = [makeClient({ plan: 'Alpha' })];
    const result = computePlanDistribution(clients, ['#ff0000']);
    expect(result[0].color).toBe('#ff0000');
  });
});

describe('computePlanRevenue', () => {
  it('groups revenue by plan from paid invoices', () => {
    const invoices = [
      makeInvoice({ plan: 'Premium', amount: 200, status: 'paid' }),
      makeInvoice({ id: 'inv-2', plan: 'Premium', amount: 300, status: 'paid' }),
      makeInvoice({ id: 'inv-3', plan: 'Elite', amount: 500, status: 'paid' }),
      makeInvoice({ id: 'inv-4', plan: 'Basic', amount: 100, status: 'pending' }), // ignored
    ];
    const result = computePlanRevenue(invoices);
    expect(result.find(p => p.name === 'Premium')?.revenue).toBe(500);
    expect(result.find(p => p.name === 'Elite')?.revenue).toBe(500);
    expect(result.find(p => p.name === 'Basic')).toBeUndefined(); // pending filtered out
  });
});

describe('computeEngagementMetrics', () => {
  it('returns zeros for empty data', () => {
    const result = computeEngagementMetrics([], [], []);
    expect(result.retentionRate).toBe(0);
    expect(result.workoutCompletionRate).toBe(0);
    expect(result.avgWorkoutsPerWeek).toBe(0);
    expect(result.checkInRate).toBe(0);
  });

  it('calculates retention rate', () => {
    const clients = [
      makeClient({ status: 'active' }),
      makeClient({ id: 'c2', status: 'active' }),
      makeClient({ id: 'c3', status: 'paused' }),
    ];
    const result = computeEngagementMetrics(clients, [], []);
    expect(result.retentionRate).toBe(66.7);
  });

  it('calculates check-in rate', () => {
    const checkIns = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'missed' },
    ] as CheckIn[];
    const result = computeEngagementMetrics([], [], checkIns);
    expect(result.checkInRate).toBe(67); // 2/3 rounded
  });
});
