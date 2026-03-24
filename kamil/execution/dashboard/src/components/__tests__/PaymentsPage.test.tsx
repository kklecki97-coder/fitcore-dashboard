import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from './test-utils';
import PaymentsPage from '../PaymentsPage';
import type { Client, Invoice, CoachingPlan } from '../../types';

// ── Mock data ──
const mockClients: Client[] = [
  {
    id: 'c1', name: 'Marcus Chen', avatar: '', email: 'marcus@test.com',
    plan: 'Premium', status: 'active', startDate: '2025-01-01',
    nextCheckIn: '2026-03-25', monthlyRate: 200, progress: 50,
    metrics: { weight: [], bodyFat: [], benchPress: [], squat: [], deadlift: [], waist: [], hips: [], chest: [], bicep: [], thigh: [] },
    goals: [], notes: '', notesHistory: [], activityLog: [],
    lastActive: new Date().toISOString(), streak: 5, height: 180,
  },
];

const mockInvoices: Invoice[] = [
  {
    id: 'inv-1', clientId: 'c1', clientName: 'Marcus Chen', amount: 200, status: 'paid',
    period: 'Mar 2026', dueDate: '2026-03-01', paidDate: '2026-03-01',
    plan: 'Premium',
  },
  {
    id: 'inv-2', clientId: 'c1', clientName: 'Marcus Chen', amount: 200, status: 'pending',
    period: 'Apr 2026', dueDate: '2026-04-01', paidDate: null,
    plan: 'Premium',
  },
];

const mockPlans: CoachingPlan[] = [
  {
    id: 'plan-1', coachId: 'coach-1', name: 'Premium',
    price: 200, billingCycle: 'monthly', description: 'Full coaching',
    isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01',
  },
];

const mockAddInvoice = vi.fn();
const mockDeleteInvoice = vi.fn();
const mockUpdateInvoice = vi.fn();
const onViewClient = vi.fn();

// ── Mock useData ──
vi.mock('../../contexts/DataProvider', () => ({
  useData: () => ({
    clients: mockClients,
    invoices: mockInvoices,
    plans: mockPlans,
    addInvoice: mockAddInvoice,
    deleteInvoice: mockDeleteInvoice,
    updateInvoice: mockUpdateInvoice,
  }),
}));

// ── Mock supabase ──
vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { url: 'https://checkout.stripe.com/test' }, error: null }),
    },
  },
}));

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<PaymentsPage onViewClient={onViewClient} />);
    expect(container).toBeTruthy();
  });

  it('displays client name in invoices', () => {
    renderWithProviders(<PaymentsPage onViewClient={onViewClient} />);
    const body = document.body.textContent || '';
    expect(body).toContain('Marcus');
  });

  it('shows invoice amounts', () => {
    renderWithProviders(<PaymentsPage onViewClient={onViewClient} />);
    const body = document.body.textContent || '';
    expect(body).toContain('200');
  });

  it('renders filter buttons', () => {
    renderWithProviders(<PaymentsPage onViewClient={onViewClient} />);
    const body = document.body.textContent || '';
    // Should have filter tabs (PL defaults)
    expect(body).toMatch(/wszystkie|all/i);
  });

  it('filters by pending status', async () => {
    renderWithProviders(<PaymentsPage onViewClient={onViewClient} />);
    const user = userEvent.setup();

    // Find "Pending" / "Oczekujące" filter tab (may include count)
    const allBtns = screen.getAllByRole('button');
    const pendingBtn = allBtns.find(btn => /oczekujące|pending/i.test(btn.textContent || ''));
    if (!pendingBtn) throw new Error('Pending filter button not found');
    await user.click(pendingBtn);

    await waitFor(() => {
      const body = document.body.textContent || '';
      expect(body).toContain('Apr 2026');
    });
  });
});
