import type { Client, Message, Invoice, WorkoutLog, CheckIn } from '../types';

export interface WeeklyReportData {
  // Period
  weekStart: string;
  weekEnd: string;

  // Workouts
  totalWorkouts: number;
  prevWeekWorkouts: number;
  completedWorkouts: number;
  totalWorkoutMinutes: number;

  // Revenue
  weekRevenue: number;
  prevWeekRevenue: number;

  // Check-ins
  checkInsReviewed: number;
  checkInsPending: number;
  checkInsFlagged: number;
  prevWeekCheckIns: number;

  // Messages
  messagesSent: number;
  messagesReceived: number;
  prevWeekMessages: number;

  // Top performer
  topPerformer: { name: string; workouts: number; id: string } | null;

  // At-risk clients
  atRiskClients: { name: string; reason: string; id: string }[];

  // Retention
  activeClients: number;
  totalClients: number;
  newlyInactive: { name: string; id: string }[];

  // PRs (from check-in weight changes or workout logs)
  newPRs: { clientName: string; lift: string; value: string }[];
}

/**
 * Compute all data needed for the weekly coach report.
 */
export function computeWeeklyReport(
  clients: Client[],
  messages: Message[],
  invoices: Invoice[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  now = new Date(),
): WeeklyReportData {
  // Date ranges
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const weekStartStr = fmt(weekStart);
  const weekEndStr = fmt(weekEnd);
  const prevWeekStartStr = fmt(prevWeekStart);

  const inThisWeek = (dateStr: string) => dateStr >= weekStartStr && dateStr <= weekEndStr;
  const inPrevWeek = (dateStr: string) => dateStr >= prevWeekStartStr && dateStr < weekStartStr;

  // ── Workouts ──
  const thisWeekLogs = workoutLogs.filter(w => inThisWeek(w.date));
  const prevWeekLogs = workoutLogs.filter(w => inPrevWeek(w.date));
  const totalWorkouts = thisWeekLogs.length;
  const completedWorkouts = thisWeekLogs.filter(w => w.completed).length;
  const totalWorkoutMinutes = thisWeekLogs.reduce((sum, w) => sum + (w.duration || 0), 0);

  // ── Revenue ──
  const weekRevenue = invoices
    .filter(inv => inv.status === 'paid' && inv.paidDate && inThisWeek(inv.paidDate))
    .reduce((sum, inv) => sum + inv.amount, 0);
  const prevWeekRevenue = invoices
    .filter(inv => inv.status === 'paid' && inv.paidDate && inPrevWeek(inv.paidDate))
    .reduce((sum, inv) => sum + inv.amount, 0);

  // ── Check-ins ──
  const thisWeekCIs = checkIns.filter(ci => inThisWeek(ci.date));
  const prevWeekCIs = checkIns.filter(ci => inPrevWeek(ci.date));
  const checkInsReviewed = thisWeekCIs.filter(ci => ci.reviewStatus === 'reviewed').length;
  const checkInsPending = thisWeekCIs.filter(ci => ci.reviewStatus === 'pending').length;
  const checkInsFlagged = thisWeekCIs.filter(ci => ci.reviewStatus === 'flagged').length;

  // ── Messages ──
  const thisWeekMsgs = messages.filter(m => inThisWeek(m.timestamp.split('T')[0]));
  const prevWeekMsgs = messages.filter(m => inPrevWeek(m.timestamp.split('T')[0]));
  const messagesSent = thisWeekMsgs.filter(m => m.isFromCoach).length;
  const messagesReceived = thisWeekMsgs.filter(m => !m.isFromCoach).length;

  // ── Top performer ──
  const clientWorkoutCounts = new Map<string, number>();
  for (const w of thisWeekLogs.filter(w => w.completed)) {
    clientWorkoutCounts.set(w.clientId, (clientWorkoutCounts.get(w.clientId) || 0) + 1);
  }
  let topPerformer: WeeklyReportData['topPerformer'] = null;
  let maxWorkouts = 0;
  for (const [clientId, count] of clientWorkoutCounts) {
    if (count > maxWorkouts) {
      maxWorkouts = count;
      const client = clients.find(c => c.id === clientId);
      topPerformer = { name: client?.name || 'Unknown', workouts: count, id: clientId };
    }
  }

  // ── At-risk clients ──
  const atRiskClients: WeeklyReportData['atRiskClients'] = [];
  for (const c of clients.filter(cl => cl.status === 'active')) {
    const reasons: string[] = [];
    const clientWorkouts = thisWeekLogs.filter(w => w.clientId === c.id && w.completed);
    if (clientWorkouts.length === 0) reasons.push('no-workouts');
    const clientCheckIns = thisWeekCIs.filter(ci => ci.clientId === c.id);
    if (clientCheckIns.length === 0) reasons.push('missed-checkin');
    if (reasons.length > 0) {
      atRiskClients.push({ name: c.name, reason: reasons.join(', '), id: c.id });
    }
  }

  // ── Retention ──
  const activeClients = clients.filter(c => c.status === 'active').length;
  const newlyInactive = clients
    .filter(c => c.status === 'paused' && c.lastActive && c.lastActive >= prevWeekStartStr)
    .map(c => ({ name: c.name, id: c.id }));

  // ── PRs from metrics (comparing last two values) ──
  const newPRs: WeeklyReportData['newPRs'] = [];
  const liftKeys: Array<{ key: keyof Client['metrics']; label: string }> = [
    { key: 'benchPress', label: 'Bench Press' },
    { key: 'squat', label: 'Squat' },
    { key: 'deadlift', label: 'Deadlift' },
  ];
  for (const c of clients) {
    for (const lift of liftKeys) {
      const vals = c.metrics[lift.key];
      if (vals.length >= 2) {
        const latest = vals[vals.length - 1];
        const prev = vals[vals.length - 2];
        if (latest > prev) {
          newPRs.push({ clientName: c.name, lift: lift.label, value: `${latest}kg (+${(latest - prev).toFixed(1)})` });
        }
      }
    }
  }

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    totalWorkouts,
    prevWeekWorkouts: prevWeekLogs.length,
    completedWorkouts,
    totalWorkoutMinutes,
    weekRevenue,
    prevWeekRevenue,
    checkInsReviewed,
    checkInsPending,
    checkInsFlagged,
    prevWeekCheckIns: prevWeekCIs.length,
    messagesSent,
    messagesReceived,
    prevWeekMessages: prevWeekMsgs.length,
    topPerformer,
    atRiskClients,
    activeClients,
    totalClients: clients.length,
    newlyInactive,
    newPRs,
  };
}

/**
 * Calculate percentage change between two values.
 */
export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
