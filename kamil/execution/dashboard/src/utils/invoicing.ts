import type { Invoice } from '../types';

/**
 * Compute summary stats for invoices in a given month.
 */
export function computeInvoiceSummary(invoices: Invoice[], currentPeriod: string, previousPeriod: string) {
  const thisMonth = invoices.filter(inv => inv.period === currentPeriod);
  const lastMonth = invoices.filter(inv => inv.period === previousPeriod);

  const thisMonthRevenue = thisMonth.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const lastMonthRevenue = lastMonth.filter(inv => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((s, inv) => s + inv.amount, 0);
  const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((s, inv) => s + inv.amount, 0);

  return { thisMonthRevenue, lastMonthRevenue, pendingAmount, overdueAmount };
}

type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low' | 'name';

/**
 * Filter invoices by status + search + sort.
 */
export function filterAndSortInvoices(
  invoices: Invoice[],
  filterStatus: string,
  search: string,
  sortKey: SortKey,
): Invoice[] {
  let filtered = invoices;

  if (filterStatus !== 'all') {
    filtered = filtered.filter(inv => inv.status === filterStatus);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(inv =>
      inv.clientName.toLowerCase().includes(q) || inv.period.toLowerCase().includes(q)
    );
  }

  switch (sortKey) {
    case 'newest':
      return [...filtered].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    case 'oldest':
      return [...filtered].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    case 'amount-high':
      return [...filtered].sort((a, b) => b.amount - a.amount);
    case 'amount-low':
      return [...filtered].sort((a, b) => a.amount - b.amount);
    case 'name':
      return [...filtered].sort((a, b) => a.clientName.localeCompare(b.clientName));
    default:
      return filtered;
  }
}
