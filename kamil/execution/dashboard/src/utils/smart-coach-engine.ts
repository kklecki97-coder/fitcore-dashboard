/**
 * Smart Coach Engine — Trigger detection for coach insights + draft actions.
 *
 * Pure function: same data → same triggers. No side effects, no API calls.
 */

import type { Client, Message, CheckIn, Invoice, WorkoutLog, WorkoutProgram } from '../types';

// ── Trigger types ──────────────────────────────────────────────

export type TriggerType =
  | 'checkin-overdue'
  | 'inactive'
  | 'msg-unanswered'
  | 'wellness-decline'
  | 'invoice-overdue'
  | 'program-ending'
  | 'missed-workout'
  | 'stale'
  | 'invoice-due'
  | 'new-client'
  | 'paused-long'
  | 'pr'
  | 'streak'
  | 'progress-milestone'
  | 'all-clear'
  | 'wellness-up';

export type TriggerPriority = 'high' | 'medium' | 'low';
export type TriggerAction = 'view' | 'message' | 'review';

export interface SmartCoachTrigger {
  id: string;
  type: TriggerType;
  priority: TriggerPriority;
  clientId?: string;
  clientName?: string;
  insightText: string;
  draftText: string | null;
  icon: string;
  timestamp: string;
  actionType: TriggerAction;
}

// ── Helpers ────────────────────────────────────────────────────

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / MS_PER_DAY);
}

/** Count Mon-Fri days between a past date and now. */
export function getBusinessDaysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  if (start >= now) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur < now) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** Check if client has any message (from client or coach) in the last N hours. */
export function hasRecentConversation(
  clientId: string,
  messages: Message[],
  hoursThreshold = 24,
): boolean {
  const cutoff = Date.now() - hoursThreshold * MS_PER_HOUR;
  return messages.some(
    (m) => m.clientId === clientId && new Date(m.timestamp).getTime() > cutoff,
  );
}

/**
 * Parse relative time strings like "2 hours ago", "1 day ago", "30 min ago"
 * into actual Date objects. Falls back to new Date(str) for ISO strings.
 */
function parseDate(str: string | undefined | null): Date | null {
  if (!str) return null;

  // Try relative time patterns: "X hours ago", "X min ago", "X day(s) ago", "X week(s) ago"
  const relMatch = str.match(/^(\d+)\s*(hour|min|minute|day|week|month)s?\s*ago$/i);
  if (relMatch) {
    const n = parseInt(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    const now = Date.now();
    if (unit === 'min' || unit === 'minute') return new Date(now - n * 60 * 1000);
    if (unit === 'hour') return new Date(now - n * MS_PER_HOUR);
    if (unit === 'day') return new Date(now - n * MS_PER_DAY);
    if (unit === 'week') return new Date(now - n * 7 * MS_PER_DAY);
    if (unit === 'month') return new Date(now - n * 30 * MS_PER_DAY);
  }

  // Try ISO / standard date parse
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Get the most recent date from a set of date strings (ignoring invalid ones). */
function latestDate(...dates: (string | undefined | null)[]): Date {
  let max = 0;
  for (const d of dates) {
    const parsed = parseDate(d);
    if (!parsed) continue;
    const t = parsed.getTime();
    if (t > max) max = t;
  }
  return new Date(max || 0);
}

// ── Trigger generation ────────────────────────────────────────

export function generateTriggers(
  clients: Client[],
  messages: Message[],
  checkIns: CheckIn[],
  invoices: Invoice[],
  workoutLogs: WorkoutLog[],
  programs: WorkoutProgram[],
  dismissedIds: string[],
  lang: 'en' | 'pl',
): SmartCoachTrigger[] {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const triggers: SmartCoachTrigger[] = [];
  const dismissedSet = new Set(dismissedIds);

  const activeClients = clients.filter((c) => c.status === 'active' || c.status === 'paused');

  // Pre-index data by clientId for O(1) lookup instead of O(n) per client
  const msgByClient = new Map<string, Message[]>();
  for (const m of messages) {
    if (!msgByClient.has(m.clientId)) msgByClient.set(m.clientId, []);
    msgByClient.get(m.clientId)!.push(m);
  }
  const ciByClient = new Map<string, CheckIn[]>();
  for (const ci of checkIns) {
    if (ci.status !== 'completed') continue;
    if (!ciByClient.has(ci.clientId)) ciByClient.set(ci.clientId, []);
    ciByClient.get(ci.clientId)!.push(ci);
  }
  for (const arr of ciByClient.values()) {
    arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  const wlByClient = new Map<string, WorkoutLog[]>();
  for (const w of workoutLogs) {
    if (!w.completed) continue;
    if (!wlByClient.has(w.clientId)) wlByClient.set(w.clientId, []);
    wlByClient.get(w.clientId)!.push(w);
  }
  for (const arr of wlByClient.values()) {
    arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  const invByClient = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    if (!invByClient.has(inv.clientId)) invByClient.set(inv.clientId, []);
    invByClient.get(inv.clientId)!.push(inv);
  }
  // Pre-index all check-ins (including non-completed) for pending review check
  const allCiByClient = new Map<string, CheckIn[]>();
  for (const ci of checkIns) {
    if (!allCiByClient.has(ci.clientId)) allCiByClient.set(ci.clientId, []);
    allCiByClient.get(ci.clientId)!.push(ci);
  }

  for (const client of activeClients) {
    const clientTriggers: SmartCoachTrigger[] = [];
    const cMessages = msgByClient.get(client.id) ?? [];
    const cCheckIns = ciByClient.get(client.id) ?? [];
    const cWorkouts = wlByClient.get(client.id) ?? [];
    const cInvoices = invByClient.get(client.id) ?? [];
    const cAllCheckIns = allCiByClient.get(client.id) ?? [];

    const recentConvoCutoff = Date.now() - 24 * MS_PER_HOUR;
    const recentConvo = cMessages.some((m) => new Date(m.timestamp).getTime() > recentConvoCutoff);

    // Helper: if recent conversation, suppress draft and switch action to message link
    const applyConvoGuard = (t: SmartCoachTrigger): SmartCoachTrigger => {
      if (recentConvo && t.draftText) {
        return {
          ...t,
          draftText: null,
          actionType: 'message',
          insightText:
            t.insightText +
            (lang === 'pl' ? ' (aktywna konwersacja)' : ' (active conversation)'),
        };
      }
      return t;
    };

    const mkId = (type: TriggerType) => `${client.id}-${type}-${today}`;

    // ── HIGH: Unreviewed check-in >48h ──
    // Only completed check-ins can be "pending review" — scheduled ones haven't happened yet
    const pendingCheckIns = cAllCheckIns.filter(
      (ci) =>
        ci.status === 'completed' &&
        ci.reviewStatus === 'pending' &&
        daysBetween(new Date(ci.date), now) >= 2,
    );
    if (pendingCheckIns.length > 0) {
      const oldest = pendingCheckIns.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )[0];
      const days = daysBetween(new Date(oldest.date), now);
      clientTriggers.push({
        id: mkId('checkin-overdue'),
        type: 'checkin-overdue',
        priority: 'high',
        clientId: client.id,
        clientName: client.name,
        insightText:
          lang === 'pl'
            ? `Check-in ${client.name} z ${new Date(oldest.date).toLocaleDateString(lang)} czeka na review — ${days} dni`
            : `${client.name}'s check-in from ${new Date(oldest.date).toLocaleDateString('en')} is unreviewed — ${days} days`,
        draftText: null,
        icon: 'CalendarCheck',
        timestamp: oldest.date,
        actionType: 'review',
      });
    }

    // ── HIGH: Inactive client >3 business days ──
    if (client.status === 'active') {
      const lastClientMsg = cMessages
        .filter((m) => !m.isFromCoach)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      const lastActivity = latestDate(
        client.lastActive,
        cWorkouts[0]?.date,
        lastClientMsg?.timestamp,
        cCheckIns[0]?.date,
      );
      // Guard: skip if no real activity data (epoch zero) or activity predates client start
      const hasRealActivity = lastActivity.getTime() > 0;
      const startDate = client.startDate ? new Date(client.startDate) : null;
      const activityBeforeStart = startDate && lastActivity < startDate;
      if (!hasRealActivity || activityBeforeStart) {
        // New client with no logs yet — don't flag as inactive
      } else {
      const bizDays = getBusinessDaysSince(lastActivity.toISOString());
      if (bizDays >= 3) {
        clientTriggers.push(
          applyConvoGuard({
            id: mkId('inactive'),
            type: 'inactive',
            priority: 'high',
            clientId: client.id,
            clientName: client.name,
            insightText:
              lang === 'pl'
                ? `${client.name} — brak aktywności od ${bizDays} dni`
                : `${client.name} hasn't logged anything in ${bizDays} days`,
            draftText: '__TEMPLATE__', // replaced by drafts module
            icon: 'Moon',
            timestamp: lastActivity.toISOString(),
            actionType: 'message',
          }),
        );
      }
      } // end else (has real activity)
    }

    // ── HIGH: Unanswered message >48h ──
    const clientMsgs = cMessages
      .filter((m) => !m.isFromCoach)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const coachMsgs = cMessages
      .filter((m) => m.isFromCoach)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (clientMsgs.length > 0) {
      const lastClientMsgTime = new Date(clientMsgs[0].timestamp).getTime();
      const lastCoachMsgTime = coachMsgs.length > 0 ? new Date(coachMsgs[0].timestamp).getTime() : 0;
      if (lastClientMsgTime > lastCoachMsgTime) {
        const hoursAgo = (now.getTime() - lastClientMsgTime) / MS_PER_HOUR;
        if (hoursAgo >= 48) {
          const daysAgo = Math.floor(hoursAgo / 24);
          clientTriggers.push(
          applyConvoGuard({
            id: mkId('msg-unanswered'),
            type: 'msg-unanswered',
            priority: 'high',
            clientId: client.id,
            clientName: client.name,
            insightText:
              lang === 'pl'
                ? `${client.name} napisał/a ${daysAgo} dni temu — brak odpowiedzi`
                : `${client.name} messaged ${daysAgo} days ago — no reply yet`,
            draftText: '__TEMPLATE__',
            icon: 'MessageCircleWarning',
            timestamp: clientMsgs[0].timestamp,
            actionType: 'message',
          }));
        }
      }
    }

    // ── Dedupe: if msg-unanswered fired, suppress inactive (same root cause) ──
    const hasMsgUnanswered = clientTriggers.some((t) => t.type === 'msg-unanswered');
    if (hasMsgUnanswered) {
      const inactiveIdx = clientTriggers.findIndex((t) => t.type === 'inactive');
      if (inactiveIdx !== -1) clientTriggers.splice(inactiveIdx, 1);
    }

    // ── HIGH: Declining wellness ──
    if (cCheckIns.length >= 3) {
      const last3 = cCheckIns.slice(0, 3); // newest first
      const energies = last3.map((ci) => ci.energy).filter((e): e is number => e !== null);
      const moods: number[] = last3.map((ci) => ci.mood).filter((m) => m !== null) as number[];

      // Detect decline: newest-first array, at least one real drop, no recovery
      // vals[0]=newest, vals[2]=oldest → decline means newest ≤ middle < oldest
      // 3→5→8 (newest=3,mid=5,old=8) ✓  5→5→8 ✓  5→5→5 ✗  8→5→3 ✗
      const isDecline = (vals: number[]) =>
        vals.length >= 3 && vals[0] <= vals[1] && vals[2] > vals[1];

      if (isDecline(energies) || isDecline(moods)) {
        const metric = isDecline(energies) ? 'energy' : 'mood';
        const vals = isDecline(energies) ? energies : moods;
        // vals are newest-first, display oldest→newest
        const display = `${vals[2]}→${vals[1]}→${vals[0]}`;
        clientTriggers.push(
          applyConvoGuard({
            id: mkId('wellness-decline'),
            type: 'wellness-decline',
            priority: 'high',
            clientId: client.id,
            clientName: client.name,
            insightText:
              lang === 'pl'
                ? `${client.name}: ${metric === 'energy' ? 'energia' : 'nastrój'} ${display} — spadek w ostatnich 3 check-inach`
                : `${client.name}: ${metric} ${display} over last 3 check-ins`,
            draftText: '__TEMPLATE__',
            icon: 'TrendingDown',
            timestamp: last3[0].date,
            actionType: 'message',
          }),
        );
      }
    }

    // ── HIGH: Overdue invoice ──
    const overdueInvoices = cInvoices.filter((inv) => inv.status === 'overdue');
    if (overdueInvoices.length > 0) {
      const inv = overdueInvoices[0];
      const days = daysBetween(new Date(inv.dueDate), now);
      clientTriggers.push({
        id: mkId('invoice-overdue'),
        type: 'invoice-overdue',
        priority: 'high',
        clientId: client.id,
        clientName: client.name,
        insightText:
          lang === 'pl'
            ? `${client.name} ma zaległą fakturę (${inv.amount} zł) — ${days} dni po terminie`
            : `${client.name} has an overdue invoice ($${inv.amount}) — ${days} days past due`,
        draftText: null,
        icon: 'AlertTriangle',
        timestamp: inv.dueDate,
        actionType: 'view',
      });
    }

    // ── MEDIUM: Program ending soon ──
    const activePrograms = programs.filter(
      (p) => p.status === 'active' && p.clientIds.includes(client.id),
    );
    for (const prog of activePrograms) {
      const startDate = new Date(prog.createdAt);
      const endDate = new Date(startDate.getTime() + prog.durationWeeks * 7 * MS_PER_DAY);
      const daysLeft = daysBetween(now, endDate);
      if (endDate > now && daysLeft <= 7) {
        clientTriggers.push(
          applyConvoGuard({
            id: mkId('program-ending'),
            type: 'program-ending',
            priority: 'medium',
            clientId: client.id,
            clientName: client.name,
            insightText:
              lang === 'pl'
                ? `Program '${prog.name}' dla ${client.name} kończy się za ${daysLeft} dni`
                : `${client.name}'s '${prog.name}' ends in ${daysLeft} days`,
            draftText: '__TEMPLATE__',
            icon: 'Calendar',
            timestamp: endDate.toISOString(),
            actionType: 'message',
          }),
        );
      }
    }

    // ── MEDIUM: Missed workout >2 business days ──
    if (client.status === 'active' && activePrograms.length > 0) {
      const lastWorkoutDate = cWorkouts[0]?.date;
      if (lastWorkoutDate) {
        const bizDays = getBusinessDaysSince(lastWorkoutDate);
        if (bizDays >= 2) {
          clientTriggers.push(
            applyConvoGuard({
              id: mkId('missed-workout'),
              type: 'missed-workout',
              priority: 'medium',
              clientId: client.id,
              clientName: client.name,
              insightText:
                lang === 'pl'
                  ? `${client.name} nie trenował/a od ${bizDays} dni`
                  : `${client.name} hasn't trained in ${bizDays} days`,
              draftText: '__TEMPLATE__',
              icon: 'Dumbbell',
              timestamp: lastWorkoutDate,
              actionType: 'message',
            }),
          );
        }
      }
    }

    // ── MEDIUM: Stale client (no check-in >14 days) ──
    if (client.status === 'active') {
      const lastCheckIn = cCheckIns[0];
      if (lastCheckIn) {
        const days = daysBetween(new Date(lastCheckIn.date), now);
        if (days >= 14) {
          clientTriggers.push(
            applyConvoGuard({
              id: mkId('stale'),
              type: 'stale',
              priority: 'medium',
              clientId: client.id,
              clientName: client.name,
              insightText:
                lang === 'pl'
                  ? `${client.name} nie miał/a check-inu od ${days} dni`
                  : `${client.name} hasn't checked in for ${days} days`,
              draftText: '__TEMPLATE__',
              icon: 'Clock',
              timestamp: lastCheckIn.date,
              actionType: 'message',
            }),
          );
        }
      }
    }

    // ── MEDIUM: Pending invoice due soon ──
    const dueSoon = cInvoices.filter((inv) => {
      if (inv.status !== 'pending') return false;
      const daysUntil = daysBetween(now, new Date(inv.dueDate));
      return new Date(inv.dueDate) > now && daysUntil <= 3;
    });
    if (dueSoon.length > 0) {
      const inv = dueSoon[0];
      const daysUntil = daysBetween(now, new Date(inv.dueDate));
      clientTriggers.push({
        id: mkId('invoice-due'),
        type: 'invoice-due',
        priority: 'medium',
        clientId: client.id,
        clientName: client.name,
        insightText:
          lang === 'pl'
            ? `Faktura ${client.name} (${inv.amount} zł) — termin za ${daysUntil} dni`
            : `${client.name}'s invoice ($${inv.amount}) is due in ${daysUntil} days`,
        draftText: null,
        icon: 'Receipt',
        timestamp: inv.dueDate,
        actionType: 'view',
      });
    }

    // ── MEDIUM: New client first week ──
    if (client.startDate) {
      const daysSinceStart = daysBetween(new Date(client.startDate), now);
      if (daysSinceStart <= 7 && daysSinceStart >= 0) {
        clientTriggers.push(
          applyConvoGuard({
            id: mkId('new-client'),
            type: 'new-client',
            priority: 'medium',
            clientId: client.id,
            clientName: client.name,
            insightText:
              lang === 'pl'
                ? `${client.name} — pierwszy tydzień, ustal oczekiwania`
                : `${client.name} is in first week — set expectations early`,
            draftText: '__TEMPLATE__',
            icon: 'UserPlus',
            timestamp: client.startDate,
            actionType: 'message',
          }),
        );
      }
    }

    // ── MEDIUM: Paused client >14 days ──
    if (client.status === 'paused') {
      // Use lastActive as proxy for when they paused
      const pausedDate = parseDate(client.lastActive);
      const daysPaused = pausedDate ? daysBetween(pausedDate, now) : 0;
      if (daysPaused >= 14) {
        clientTriggers.push(
          applyConvoGuard({
            id: mkId('paused-long'),
            type: 'paused-long',
            priority: 'medium',
            clientId: client.id,
            clientName: client.name,
            insightText:
              lang === 'pl'
                ? `${client.name} na pauzie od ${daysPaused} dni — re-engagement?`
                : `${client.name} has been paused for ${daysPaused} days — re-engagement?`,
            draftText: '__TEMPLATE__',
            icon: 'PauseCircle',
            timestamp: pausedDate?.toISOString() || now.toISOString(),
            actionType: 'message',
          }),
        );
      }
    }

    // ── LOW: Personal Record ──
    const lifts = ['benchPress', 'squat', 'deadlift'] as const;
    const liftLabels: Record<string, Record<'en' | 'pl', string>> = {
      benchPress: { en: 'bench press', pl: 'wyciskanie' },
      squat: { en: 'squat', pl: 'przysiad' },
      deadlift: { en: 'deadlift', pl: 'martwy ciąg' },
    };
    for (const lift of lifts) {
      const vals = client.metrics[lift];
      if (vals.length >= 2) {
        const latest = vals[vals.length - 1];
        const prevMax = Math.max(...vals.slice(0, -1));
        if (latest > prevMax && prevMax > 0) {
          const diff = latest - prevMax;
          clientTriggers.push(
            applyConvoGuard({
              id: `${client.id}-pr-${lift}-${today}`,
              type: 'pr',
              priority: 'low',
              clientId: client.id,
              clientName: client.name,
              insightText:
                lang === 'pl'
                  ? `${client.name} — nowy rekord w ${liftLabels[lift].pl}: ${latest}kg (+${diff}kg)`
                  : `${client.name} hit a new ${liftLabels[lift].en} PR: ${latest}kg (+${diff}kg)`,
              draftText: '__TEMPLATE__',
              icon: 'Trophy',
              timestamp: now.toISOString(),
              actionType: 'message',
            }),
          );
        }
      }
    }

    // ── LOW: Streak milestone ──
    const streakMilestones = [7, 14, 21, 30, 60, 90];
    if (streakMilestones.includes(client.streak)) {
      clientTriggers.push(
        applyConvoGuard({
          id: mkId('streak'),
          type: 'streak',
          priority: 'low',
          clientId: client.id,
          clientName: client.name,
          insightText:
            lang === 'pl'
              ? `${client.name} — streak ${client.streak} dni!`
              : `${client.name} is on a ${client.streak}-day streak`,
          draftText: '__TEMPLATE__',
          icon: 'Flame',
          timestamp: now.toISOString(),
          actionType: 'message',
        }),
      );
    }

    // ── LOW: Progress milestone ──
    const progressMilestones = [25, 50, 75, 90];
    for (const milestone of progressMilestones) {
      if (client.progress >= milestone && client.progress < milestone + 5) {
        clientTriggers.push(
          applyConvoGuard({
            id: `${client.id}-progress-${milestone}-${today}`,
            type: 'progress-milestone',
            priority: 'low',
            clientId: client.id,
            clientName: client.name,
            insightText:
              lang === 'pl'
                ? `${client.name} przekroczył/a ${milestone}% celu`
                : `${client.name} just crossed ${milestone}% of their goal`,
            draftText: '__TEMPLATE__',
            icon: 'Target',
            timestamp: now.toISOString(),
            actionType: 'message',
          }),
        );
        break; // only one milestone per client
      }
    }

    // ── LOW: Positive wellness trend ──
    if (cCheckIns.length >= 3) {
      const last3 = cCheckIns.slice(0, 3);
      const energies = last3.map((ci) => ci.energy).filter((e) => e !== null) as number[];
      const moods: number[] = last3.map((ci) => ci.mood).filter((m) => m !== null) as number[];
      const sleeps = last3.map((ci) => ci.sleepHours).filter((s) => s !== null) as number[];

      const isRising = (vals: number[]) =>
        vals.length >= 3 && vals[0] > vals[1] && vals[1] > vals[2];

      if (isRising(energies) && isRising(moods) && isRising(sleeps)) {
        clientTriggers.push({
          id: mkId('wellness-up'),
          type: 'wellness-up',
          priority: 'low',
          clientId: client.id,
          clientName: client.name,
          insightText:
            lang === 'pl'
              ? `${client.name}: energia, nastrój i sen — wszystko w górę!`
              : `${client.name}: wellness trending up — energy, mood, sleep all improving`,
          draftText: null,
          icon: 'HeartPulse',
          timestamp: last3[0].date,
          actionType: 'view',
        });
      }
    }

    // Per-client cap: max 3 triggers
    clientTriggers.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
    triggers.push(...clientTriggers.slice(0, 3));
  }

  // Filter dismissed
  const filtered = triggers.filter((t) => !dismissedSet.has(t.id));

  // Sort: HIGH → MEDIUM → LOW, within same priority by timestamp (oldest first = most urgent)
  filtered.sort((a, b) => {
    const pw = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (pw !== 0) return pw;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  // Add all-clear if no HIGH triggers
  const hasHigh = filtered.some((t) => t.priority === 'high');
  if (!hasHigh && activeClients.length > 0) {
    const activeCount = clients.filter((c) => c.status === 'active').length;
    const checkedInThisWeek = new Set(
      checkIns
        .filter((ci) => daysBetween(new Date(ci.date), now) <= 7)
        .map((ci) => ci.clientId),
    ).size;
    const onStreak = clients.filter((c) => c.streak > 0).length;

    filtered.unshift({
      id: `system-all-clear-${today}`,
      type: 'all-clear',
      priority: 'low',
      insightText:
        lang === 'pl'
          ? `${activeCount} aktywnych · ${checkedInThisWeek} check-in w tym tygodniu · ${onStreak} na streaku`
          : `${activeCount} active · ${checkedInThisWeek} checked in this week · ${onStreak} on streak`,
      draftText: null,
      icon: 'CheckCircle2',
      timestamp: now.toISOString(),
      actionType: 'view',
    });
  }

  return filtered;
}

function priorityWeight(p: TriggerPriority): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}
