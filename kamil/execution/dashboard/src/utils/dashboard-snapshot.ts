import type { Client, Invoice, WorkoutLog, CheckIn, Message, WorkoutProgram } from '../types';

export interface DashboardSnapshot {
  totalClients: number;
  activeClients: number;
  pausedClients: number;
  revenueThisMonth: number;
  revenuePrevMonth: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  workoutsLast7Days: number;
  completedWorkoutsLast7Days: number;
  pendingCheckIns: number;
  unreadMessages: number;
  activePrograms: number;
}

/**
 * Aggregate all dashboard metrics into a single snapshot object.
 * Used by AI briefing to summarize coach data.
 */
export function buildSnapshot(
  clients: Client[],
  invoices: Invoice[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  messages: Message[],
  programs: WorkoutProgram[],
  now = new Date(),
): DashboardSnapshot {
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const monthLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevLabel = prevDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const revenueThisMonth = invoices
    .filter(i => i.status === 'paid' && i.period === monthLabel)
    .reduce((s, i) => s + i.amount, 0);
  const revenuePrevMonth = invoices
    .filter(i => i.status === 'paid' && i.period === prevLabel)
    .reduce((s, i) => s + i.amount, 0);

  const recentLogs = workoutLogs.filter(w => w.date >= sevenDaysAgoStr);

  return {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    pausedClients: clients.filter(c => c.status === 'paused').length,
    revenueThisMonth,
    revenuePrevMonth,
    totalRevenue: paidInvoices.reduce((s, i) => s + i.amount, 0),
    pendingInvoices: invoices.filter(i => i.status === 'pending').length,
    overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
    workoutsLast7Days: recentLogs.length,
    completedWorkoutsLast7Days: recentLogs.filter(w => w.completed).length,
    pendingCheckIns: checkIns.filter(ci => ci.reviewStatus === 'pending').length,
    unreadMessages: messages.filter(m => !m.isFromCoach && !m.isRead).length,
    activePrograms: programs.filter(p => p.status === 'active' && !p.isTemplate).length,
  };
}

/**
 * Simple deterministic hash for caching briefing responses.
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'briefing-' + hash;
}
