/**
 * DEV ONLY — Mock triggers + drafts for previewing the unified Smart Coach widget.
 * Import and use via `useSmartCoachPreview()` on OverviewPage.
 * Remove or disable before production deploy.
 */
import type { SmartCoachTrigger, TriggerType, TriggerPriority } from './smart-coach-engine';
import type { MessageDraft } from './autopilot-types';

function makeTrigger(
  id: string,
  type: TriggerType,
  priority: TriggerPriority,
  clientId: string,
  clientName: string,
  insightText: string,
  icon: string,
  actionType: 'message' | 'view' | 'review',
  draftText: string | null = null,
): SmartCoachTrigger {
  return {
    id,
    type,
    priority,
    clientId,
    clientName,
    insightText,
    draftText,
    icon,
    timestamp: new Date().toISOString(),
    actionType,
  };
}

function makeDraft(
  triggerId: string,
  clientId: string,
  clientName: string,
  triggerType: TriggerType,
  priority: TriggerPriority,
  text: string,
  context: string,
): MessageDraft {
  return {
    id: `draft-${triggerId}`,
    triggerId,
    clientId,
    clientName,
    triggerType,
    priority,
    text,
    context,
    generatedAt: new Date().toISOString(),
    status: 'pending',
  };
}

export interface SmartCoachPreviewData {
  triggers: SmartCoachTrigger[];
  drafts: MessageDraft[];
  draftsMap: Map<string, MessageDraft>;
}

export function generatePreviewData(): SmartCoachPreviewData {
  const triggers: SmartCoachTrigger[] = [
    // ── HIGH PRIORITY ──
    makeTrigger(
      'prev-1', 'inactive', 'high', 'c1', 'Marcus Chen',
      'Marcus Chen hasn\'t logged in for 6 days — last activity was Thursday',
      'Moon', 'message',
      'Hey Marcus, haven\'t seen you in a while — everything ok with training?',
    ),
    makeTrigger(
      'prev-2', 'msg-unanswered', 'high', 'c3', 'Jake Morrison',
      'Jake Morrison sent a message 3 days ago — still unanswered',
      'MessageCircleWarning', 'message',
      'Hey Jake, sorry for the delay! Regarding your message — ',
    ),
    makeTrigger(
      'prev-3', 'wellness-decline', 'high', 'c5', 'David Park',
      'David Park\'s energy dropped from 8 → 3 over the last 3 check-ins',
      'TrendingDown', 'message',
      'I noticed your energy has been dropping, David — how are you feeling? Maybe we should adjust the plan.',
    ),

    // ── MEDIUM PRIORITY ──
    makeTrigger(
      'prev-4', 'program-ending', 'medium', 'c2', 'Sarah Williams',
      'Sarah Williams\'s program \'Rehab Phase 2\' ends in 5 days',
      'Calendar', 'message',
      'Your program Rehab Phase 2 ends in 5 days, Sarah — want me to plan the next block?',
    ),
    makeTrigger(
      'prev-5', 'missed-workout', 'medium', 'c8', 'Aisha Patel',
      'Aisha Patel missed the last 2 scheduled workouts',
      'Dumbbell', 'message',
      'Hey Aisha, I see the last workout hasn\'t happened yet — need any plan adjustments?',
    ),
    makeTrigger(
      'prev-6', 'new-client', 'medium', 'c4', 'Emma Rodriguez',
      'Emma Rodriguez is in her first week — set expectations early',
      'UserPlus', 'message',
      'Hey Emma, how are the first few days going? Remember — consistency over perfection. Hit me up with any questions!',
    ),
    makeTrigger(
      'prev-7', 'invoice-due', 'medium', 'c7', 'Tom Bradley',
      'Tom Bradley\'s invoice ($199) is due in 3 days',
      'Receipt', 'view', null,
    ),
    makeTrigger(
      'prev-8', 'checkin-overdue', 'medium', 'c2', 'Sarah Williams',
      'Sarah Williams has a pending check-in from 4 days ago — needs review',
      'CalendarCheck', 'review', null,
    ),

    // ── LOW PRIORITY (wins) ──
    makeTrigger(
      'prev-9', 'streak', 'low', 'c3', 'Jake Morrison',
      'Jake Morrison hit a 32-day workout streak!',
      'Flame', 'message',
      '32 days straight — that\'s consistency, Jake! This is how you build results.',
    ),
    makeTrigger(
      'prev-10', 'pr', 'low', 'c1', 'Marcus Chen',
      'Marcus Chen new bench press PR: 100kg',
      'Trophy', 'message',
      'AMAZING Marcus! New bench press PR — you\'re crushing it!',
    ),
    makeTrigger(
      'prev-11', 'progress-milestone', 'low', 'c3', 'Jake Morrison',
      'Jake Morrison just crossed 90% of his goal',
      'Target', 'view', null,
    ),
  ];

  const drafts: MessageDraft[] = [];

  for (const t of triggers) {
    if (t.draftText && t.clientId) {
      drafts.push(makeDraft(
        t.id, t.clientId, t.clientName!, t.type, t.priority, t.draftText,
        t.insightText,
      ));
    }
  }

  const draftsMap = new Map(drafts.map(d => [d.triggerId, d]));

  return { triggers, drafts, draftsMap };
}
