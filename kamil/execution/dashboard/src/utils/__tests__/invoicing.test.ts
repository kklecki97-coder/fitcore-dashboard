import { describe, it, expect } from 'vitest';
import { computeInvoiceSummary, filterAndSortInvoices } from '../invoicing';
import type { Invoice } from '../../types';

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-1',
  clientId: 'c1',
  clientName: 'Test Client',
  amount: 100,
  status: 'paid',
  dueDate: '2026-03-15',
  paidDate: '2026-03-10',
  period: 'Mar 2026',
  plan: 'Premium',
  ...overrides,
});

describe('computeInvoiceSummary', () => {
  it('computes this month revenue from paid invoices', () => {
    const invoices = [
      makeInvoice({ amount: 200, status: 'paid', period: 'Mar 2026' }),
      makeInvoice({ id: 'inv-2', amount: 300, status: 'paid', period: 'Mar 2026' }),
      makeInvoice({ id: 'inv-3', amount: 100, status: 'pending', period: 'Mar 2026' }),
    ];
    const result = computeInvoiceSummary(invoices, 'Mar 2026', 'Feb 2026');
    expect(result.thisMonthRevenue).toBe(500);
  });

  it('computes pending and overdue amounts', () => {
    const invoices = [
      makeInvoice({ amount: 150, status: 'pending' }),
      makeInvoice({ id: 'inv-2', amount: 250, status: 'overdue' }),
      makeInvoice({ id: 'inv-3', amount: 100, status: 'overdue' }),
    ];
    const result = computeInvoiceSummary(invoices, 'Mar 2026', 'Feb 2026');
    expect(result.pendingAmount).toBe(150);
    expect(result.overdueAmount).toBe(350);
  });

  it('computes last month revenue', () => {
    const invoices = [
      makeInvoice({ amount: 400, status: 'paid', period: 'Feb 2026' }),
    ];
    const result = computeInvoiceSummary(invoices, 'Mar 2026', 'Feb 2026');
    expect(result.lastMonthRevenue).toBe(400);
    expect(result.thisMonthRevenue).toBe(0);
  });
});

describe('filterAndSortInvoices', () => {
  const invoices = [
    makeInvoice({ id: 'a', clientName: 'Alice', amount: 300, dueDate: '2026-03-01', status: 'paid' }),
    makeInvoice({ id: 'b', clientName: 'Bob', amount: 100, dueDate: '2026-03-15', status: 'pending' }),
    makeInvoice({ id: 'c', clientName: 'Charlie', amount: 200, dueDate: '2026-03-10', status: 'overdue' }),
  ];

  it('filters by status', () => {
    const result = filterAndSortInvoices(invoices, 'pending', '', 'newest');
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe('Bob');
  });

  it('shows all when filter is "all"', () => {
    const result = filterAndSortInvoices(invoices, 'all', '', 'newest');
    expect(result).toHaveLength(3);
  });

  it('searches by client name', () => {
    const result = filterAndSortInvoices(invoices, 'all', 'alice', 'newest');
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe('Alice');
  });

  it('sorts by newest (descending due date)', () => {
    const result = filterAndSortInvoices(invoices, 'all', '', 'newest');
    expect(result[0].clientName).toBe('Bob'); // Mar 15
    expect(result[2].clientName).toBe('Alice'); // Mar 1
  });

  it('sorts by amount high to low', () => {
    const result = filterAndSortInvoices(invoices, 'all', '', 'amount-high');
    expect(result[0].amount).toBe(300);
    expect(result[2].amount).toBe(100);
  });

  it('sorts by name alphabetically', () => {
    const result = filterAndSortInvoices(invoices, 'all', '', 'name');
    expect(result[0].clientName).toBe('Alice');
    expect(result[2].clientName).toBe('Charlie');
  });
});
