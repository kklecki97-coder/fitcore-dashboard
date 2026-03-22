/**
 * Activity Feed Engine
 * Merges all data sources into a unified chronological event feed.
 * Pure function — no side effects, no API calls.
 */

import type { Client, Message, CheckIn, WorkoutLog, WorkoutSetLog, Invoice } from '../types';

export type FeedEventType =
  | 'workout_completed'
  | 'workout_missed'
  | 'checkin_submitted'
  | 'checkin_reviewed'
  | 'message_received'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'personal_record'
  | 'client_joined';

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  clientId: string;
  clientName: string;
  timestamp: string;
  title: string;
  detail?: string;
  actionType?: 'reply' | 'review' | 'view';
  metadata?: Record<string, unknown>;
}

interface BuildFeedOptions {
  limit?: number;
  filter?: FeedEventType[];
  clientId?: string;
}

// Icon mapping for use in UI
export const FEED_EVENT_CONFIG: Record<FeedEventType, { icon: string; color: string }> = {
  workout_completed: { icon: 'Dumbbell', color: 'var(--accent-success)' },
  workout_missed: { icon: 'Dumbbell', color: 'var(--accent-danger)' },
  checkin_submitted: { icon: 'ClipboardCheck', color: 'var(--accent-primary)' },
  checkin_reviewed: { icon: 'ClipboardCheck', color: 'var(--accent-success)' },
  message_received: { icon: 'MessageSquare', color: '#60a5fa' },
  invoice_paid: { icon: 'DollarSign', color: 'var(--accent-success)' },
  invoice_overdue: { icon: 'DollarSign', color: 'var(--accent-danger)' },
  personal_record: { icon: 'Trophy', color: 'var(--accent-warm)' },
  client_joined: { icon: 'UserPlus', color: 'var(--accent-primary)' },
};

type LangStrings = {
  workoutCompleted: (name: string, type: string, duration: number) => string;
  workoutMissed: (name: string, type: string) => string;
  checkinSubmitted: (name: string) => string;
  checkinReviewed: (name: string) => string;
  checkinDetail: (mood: number | null, energy: number | null, weight: number | null) => string;
  messageReceived: (name: string) => string;
  invoicePaid: (name: string, amount: string, period: string) => string;
  invoiceOverdue: (name: string, amount: string, days: number) => string;
  personalRecord: (name: string, exercise: string, weight: string, diff: string) => string;
  clientJoined: (name: string, plan: string) => string;
};

const LANG: Record<'en' | 'pl', LangStrings> = {
  en: {
    workoutCompleted: (name, type, dur) => `${name} completed ${type} (${dur} min)`,
    workoutMissed: (name, type) => `${name} missed ${type}`,
    checkinSubmitted: (name) => `${name} submitted check-in`,
    checkinReviewed: (name) => `You reviewed ${name}'s check-in`,
    checkinDetail: (mood, energy, weight) => {
      const parts: string[] = [];
      if (mood != null) parts.push(`Mood: ${mood}/5`);
      if (energy != null) parts.push(`Energy: ${energy}/10`);
      if (weight != null) parts.push(`Weight: ${weight}kg`);
      return parts.join(' · ') || '';
    },
    messageReceived: (name) => name,
    invoicePaid: (name, amount, period) => `${name} paid ${amount} (${period})`,
    invoiceOverdue: (name, amount, days) => `${name}'s invoice (${amount}) is ${days} day${days === 1 ? '' : 's'} overdue`,
    personalRecord: (name, exercise, weight, diff) => `${name} — new PR! ${exercise} ${weight}kg (+${diff}kg)`,
    clientJoined: (name, plan) => `${name} joined as ${plan} client`,
  },
  pl: {
    workoutCompleted: (name, type, dur) => `${name} ukończył/a ${type} (${dur} min)`,
    workoutMissed: (name, type) => `${name} opuścił/a ${type}`,
    checkinSubmitted: (name) => `${name} przesłał/a check-in`,
    checkinReviewed: (name) => `Sprawdziłeś check-in ${name}`,
    checkinDetail: (mood, energy, weight) => {
      const parts: string[] = [];
      if (mood != null) parts.push(`Nastrój: ${mood}/5`);
      if (energy != null) parts.push(`Energia: ${energy}/10`);
      if (weight != null) parts.push(`Waga: ${weight}kg`);
      return parts.join(' · ') || '';
    },
    messageReceived: (name) => name,
    invoicePaid: (name, amount, period) => `${name} zapłacił/a ${amount} (${period})`,
    invoiceOverdue: (name, amount, days) => `Faktura ${name} (${amount}) — ${days} dni po terminie`,
    personalRecord: (name, exercise, weight, diff) => `${name} — nowy rekord! ${exercise} ${weight}kg (+${diff}kg)`,
    clientJoined: (name, plan) => `${name} dołączył/a jako klient ${plan}`,
  },
};

export function buildFeed(
  clients: Client[],
  messages: Message[],
  checkIns: CheckIn[],
  workoutLogs: WorkoutLog[],
  workoutSetLogs: WorkoutSetLog[],
  invoices: Invoice[],
  lang: 'en' | 'pl',
  options: BuildFeedOptions = {},
): FeedEvent[] {
  const { limit = 50, filter, clientId } = options;
  const t = LANG[lang];
  const nameMap = new Map(clients.map(c => [c.id, c.name]));
  const events: FeedEvent[] = [];

  // ── Workout logs ──
  for (const log of workoutLogs) {
    const name = log.clientName || nameMap.get(log.clientId) || 'Unknown';
    if (log.completed) {
      events.push({
        id: `workout_completed-${log.id}`,
        type: 'workout_completed',
        clientId: log.clientId,
        clientName: name,
        timestamp: log.date,
        title: t.workoutCompleted(name, log.type, log.duration),
        actionType: 'view',
      });
    } else {
      events.push({
        id: `workout_missed-${log.id}`,
        type: 'workout_missed',
        clientId: log.clientId,
        clientName: name,
        timestamp: log.date,
        title: t.workoutMissed(name, log.type),
        actionType: 'view',
      });
    }
  }

  // ── Check-ins ──
  for (const ci of checkIns) {
    const name = ci.clientName || nameMap.get(ci.clientId) || 'Unknown';
    // Submitted event
    events.push({
      id: `checkin_submitted-${ci.id}`,
      type: 'checkin_submitted',
      clientId: ci.clientId,
      clientName: name,
      timestamp: ci.date,
      title: t.checkinSubmitted(name),
      detail: t.checkinDetail(ci.mood, ci.energy, ci.weight),
      actionType: ci.reviewStatus === 'pending' ? 'review' : 'view',
      metadata: { reviewStatus: ci.reviewStatus },
    });
    // Reviewed event (only if reviewed/flagged and has coach feedback)
    if (ci.reviewStatus !== 'pending' && ci.coachFeedback) {
      events.push({
        id: `checkin_reviewed-${ci.id}`,
        type: 'checkin_reviewed',
        clientId: ci.clientId,
        clientName: name,
        timestamp: ci.date, // approximate — we don't have exact review time
        title: t.checkinReviewed(name),
        actionType: 'view',
      });
    }
  }

  // ── Messages (client-sent only — coach-sent excluded) ──
  for (const msg of messages) {
    if (msg.isFromCoach) continue;
    const name = msg.clientName || nameMap.get(msg.clientId) || 'Unknown';
    const preview = msg.text.length > 80 ? msg.text.slice(0, 80) + '...' : msg.text;
    events.push({
      id: `message_received-${msg.id}`,
      type: 'message_received',
      clientId: msg.clientId,
      clientName: name,
      timestamp: msg.timestamp,
      title: t.messageReceived(name),
      detail: `"${preview}"`,
      actionType: 'reply',
      metadata: { isRead: msg.isRead },
    });
  }

  // ── Invoices ──
  const now = new Date();
  for (const inv of invoices) {
    const name = inv.clientName || nameMap.get(inv.clientId) || 'Unknown';
    const amount = lang === 'pl' ? `${inv.amount} zł` : `$${inv.amount}`;
    if (inv.status === 'paid' && inv.paidDate) {
      events.push({
        id: `invoice_paid-${inv.id}`,
        type: 'invoice_paid',
        clientId: inv.clientId,
        clientName: name,
        timestamp: inv.paidDate,
        title: t.invoicePaid(name, amount, inv.period),
        actionType: 'view',
      });
    }
    if (inv.status === 'overdue') {
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        events.push({
          id: `invoice_overdue-${inv.id}`,
          type: 'invoice_overdue',
          clientId: inv.clientId,
          clientName: name,
          timestamp: inv.dueDate,
          title: t.invoiceOverdue(name, amount, daysOverdue),
          actionType: 'view',
        });
      }
    }
  }

  // ── Personal Records (min 2 previous entries required) ──
  // Group set logs by clientId + exerciseName
  const exerciseMaxes = new Map<string, { max: number; count: number }>();
  // Sort by date ascending to find chronological max
  const sortedSetLogs = [...workoutSetLogs].sort((a, b) => a.date.localeCompare(b.date));

  for (const log of sortedSetLogs) {
    if (!log.completed || !log.weight) continue;
    const w = typeof log.weight === 'string' ? parseFloat(log.weight) : log.weight;
    if (isNaN(w) || w <= 0) continue;

    const key = `${log.clientId}-${log.exerciseName}`;
    const prev = exerciseMaxes.get(key);

    if (!prev) {
      exerciseMaxes.set(key, { max: w, count: 1 });
    } else {
      prev.count++;
      if (w > prev.max && prev.count >= 2) {
        // New PR! (at least 2 previous entries exist)
        const diff = (w - prev.max).toFixed(1);
        const name = nameMap.get(log.clientId) || 'Unknown';
        const weightStr = w % 1 === 0 ? String(w) : w.toFixed(1);
        events.push({
          id: `personal_record-${log.id}`,
          type: 'personal_record',
          clientId: log.clientId,
          clientName: name,
          timestamp: log.date,
          title: t.personalRecord(name, log.exerciseName, weightStr, diff),
          actionType: 'view',
          metadata: { exercise: log.exerciseName, weight: w, diff: parseFloat(diff) },
        });
      }
      if (w > prev.max) prev.max = w;
    }
  }

  // ── Client joined ──
  for (const client of clients) {
    if (client.startDate) {
      events.push({
        id: `client_joined-${client.id}`,
        type: 'client_joined',
        clientId: client.id,
        clientName: client.name,
        timestamp: client.startDate,
        title: t.clientJoined(client.name, client.plan),
        actionType: 'view',
      });
    }
  }

  // ── Sort by timestamp descending (newest first) ──
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // ── Apply filters ──
  let filtered = events;
  if (clientId) {
    filtered = filtered.filter(e => e.clientId === clientId);
  }
  if (filter && filter.length > 0) {
    filtered = filtered.filter(e => filter.includes(e.type));
  }

  // ── Limit ──
  return filtered.slice(0, limit);
}
