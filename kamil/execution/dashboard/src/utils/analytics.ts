import type { Invoice, Client, WorkoutLog, CheckIn } from '../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Compute revenue chart data from paid invoices over the last N months.
 */
export function computeRevenueChartData(
  invoices: Invoice[],
  months = 6,
  now = new Date(),
): { month: string; revenue: number; clients: number }[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const label = MONTH_NAMES[d.getMonth()];
    const monthPaid = invoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.paidDate) return false;
      const pd = new Date(inv.paidDate);
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
    });
    return {
      month: label,
      revenue: monthPaid.reduce((sum, inv) => sum + inv.amount, 0),
      clients: new Set(monthPaid.map(inv => inv.clientId)).size,
    };
  });
}

/**
 * Calculate percentage change between two revenue amounts.
 */
export function calculateRevenueChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get plan distribution: how many clients per plan tier.
 */
export function computePlanDistribution(
  clients: Client[],
  colors = ['#00e5c8', '#6366f1', '#f59e0b', '#e8637a', '#3b82f6', '#8b5cf6', '#10b981', '#525a6e'],
): { name: string; value: number; color: string }[] {
  const uniquePlans = [...new Set(clients.map(c => c.plan).filter(Boolean))];
  return uniquePlans.map((plan, i) => ({
    name: plan,
    value: clients.filter(c => c.plan === plan).length,
    color: colors[i % colors.length],
  }));
}

/**
 * Revenue grouped by plan tier from paid invoices.
 */
export function computePlanRevenue(invoices: Invoice[]): { name: string; revenue: number }[] {
  const paid = invoices.filter(inv => inv.status === 'paid');
  const uniquePlans = [...new Set(paid.map(inv => inv.plan).filter(Boolean))];
  return uniquePlans.map(plan => ({
    name: plan,
    revenue: paid.filter(inv => inv.plan === plan).reduce((s, inv) => s + inv.amount, 0),
  }));
}

/**
 * Per-client engagement data: workouts, check-ins, revenue.
 */
export function buildClientEngagement(
  clients: Client[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  paidInvoices: Invoice[],
  thirtyDaysAgo: Date,
) {
  const recentWorkouts = workoutLogs.filter(w => new Date(w.date) >= thirtyDaysAgo);
  return clients.map(client => {
    const cWorkouts = recentWorkouts.filter(w => w.clientId === client.id);
    const cCompleted = cWorkouts.filter(w => w.completed).length;
    const cCheckIns = checkIns.filter(ci => ci.clientId === client.id && ci.status === 'completed').length;
    const cMissed = checkIns.filter(ci => ci.clientId === client.id && ci.status === 'missed').length;
    const cInvoicesPaid = paidInvoices.filter(inv => inv.clientId === client.id).reduce((s, inv) => s + inv.amount, 0);
    return {
      ...client,
      workoutsCompleted: cCompleted,
      workoutsTotal: cWorkouts.length,
      checkInsCompleted: cCheckIns,
      checkInsMissed: cMissed,
      totalPaid: cInvoicesPaid,
    };
  }).sort((a, b) => b.totalPaid - a.totalPaid);
}

/**
 * Compute engagement metrics: retention, workout completion, check-in rate.
 */
export function computeEngagementMetrics(
  clients: Client[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  now = new Date(),
) {
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const recentWorkouts = workoutLogs.filter(w => new Date(w.date) >= thirtyDaysAgo);
  const completedWorkouts = recentWorkouts.filter(w => w.completed);
  const activePayingClients = clients.filter(c => c.status !== 'paused');

  const retentionRate = clients.length > 0
    ? Math.round((clients.filter(c => c.status === 'active').length / clients.length) * 1000) / 10
    : 0;

  const workoutCompletionRate = recentWorkouts.length > 0
    ? Math.round((completedWorkouts.length / recentWorkouts.length) * 100)
    : 0;

  const avgWorkoutsPerWeek = activePayingClients.length > 0
    ? Math.round((completedWorkouts.length / activePayingClients.length / 4) * 10) / 10
    : 0;

  const completedCheckIns = checkIns.filter(ci => ci.status === 'completed');
  const scheduledOrDone = checkIns.filter(ci => ci.status === 'completed' || ci.status === 'missed');
  const checkInRate = scheduledOrDone.length > 0
    ? Math.round((completedCheckIns.length / scheduledOrDone.length) * 100)
    : 0;

  return { retentionRate, workoutCompletionRate, avgWorkoutsPerWeek, checkInRate };
}
