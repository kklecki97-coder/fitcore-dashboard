/**
 * useAutopilot — Orchestrates: triggers → drafts → state management.
 * Connects Smart Coach Engine triggers with AI draft generation.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { generateTriggers } from '../utils/smart-coach-engine';
import { generateDrafts, generateTemplateDraft } from '../utils/autopilot-drafts';
import type { SmartCoachTrigger } from '../utils/smart-coach-engine';
import type { MessageDraft, CoachAutopilotSettings } from '../utils/autopilot-types';
import { DEFAULT_AUTOPILOT_SETTINGS } from '../utils/autopilot-types';
import type { Client, Message, CheckIn, Invoice, WorkoutLog, WorkoutProgram } from '../types';

const DISMISSED_KEY = 'fitcore-autopilot-dismissed';

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  try {
    // Keep only last 200 dismissed IDs to prevent localStorage bloat
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-200)));
  } catch { /* ignore */ }
}

export interface AutopilotState {
  drafts: MessageDraft[];
  loading: boolean;
  settings: CoachAutopilotSettings;
  triggers: SmartCoachTrigger[];
  // Actions
  approveDraft: (draftId: string) => MessageDraft | null;
  skipDraft: (draftId: string) => void;
  updateDraftText: (draftId: string, text: string) => void;
  regenerate: () => void;
  approveAll: () => MessageDraft[];
}

export function useAutopilot(
  clients: Client[],
  messages: Message[],
  checkIns: CheckIn[],
  invoices: Invoice[],
  workoutLogs: WorkoutLog[],
  programs: WorkoutProgram[],
  lang: 'en' | 'pl',
): AutopilotState {
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings] = useState<CoachAutopilotSettings>(DEFAULT_AUTOPILOT_SETTINGS);
  const [triggers, setTriggers] = useState<SmartCoachTrigger[]>([]);
  const generatedRef = useRef(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(loadDismissed);

  // ── Step 1: Compute triggers from Smart Coach Engine ──
  useEffect(() => {
    if (clients.length === 0) return;
    const result = generateTriggers(
      clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang,
    );
    setTriggers(result);
  }, [clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang]);

  // ── Step 2: Generate drafts from triggers ──
  useEffect(() => {
    if (triggers.length === 0 || generatedRef.current) return;

    const draftableTriggers = triggers.filter(t =>
      t.clientId && t.draftText === '__TEMPLATE__'
    );

    if (draftableTriggers.length === 0) return;

    generatedRef.current = true;

    // Phase 1 (instant): Generate template-based drafts immediately
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const templateDrafts: MessageDraft[] = [];
    for (const trigger of draftableTriggers) {
      const client = clientMap.get(trigger.clientId!);
      if (!client) continue;
      const draft = generateTemplateDraft(trigger, client, settings, lang);
      if (draft) templateDrafts.push(draft);
    }
    setDrafts(templateDrafts);

    // Phase 2 (async): Replace with AI-generated drafts
    setLoading(true);
    generateDrafts(draftableTriggers, clients, settings, lang)
      .then(aiDrafts => {
        if (aiDrafts.length > 0) {
          setDrafts(prev => {
            // Replace template drafts with AI drafts where available
            const aiMap = new Map(aiDrafts.map(d => [d.triggerId, d]));
            return prev.map(d => aiMap.get(d.triggerId) || d);
          });
        }
      })
      .catch(err => {
        console.error('AI draft generation failed, keeping template drafts:', err);
      })
      .finally(() => setLoading(false));
  }, [triggers, clients, settings, lang]);

  // ── Actions ──

  const approveDraft = useCallback((draftId: string): MessageDraft | null => {
    let approved: MessageDraft | null = null;
    setDrafts(prev => prev.map(d => {
      if (d.id === draftId) {
        approved = { ...d, status: 'approved' };
        return approved;
      }
      return d;
    }));
    return approved;
  }, []);

  const skipDraft = useCallback((draftId: string) => {
    setDrafts(prev => {
      const draft = prev.find(d => d.id === draftId);
      if (draft) {
        const newDismissed = [...dismissedIds, draft.triggerId];
        setDismissedIds(newDismissed);
        saveDismissed(newDismissed);
      }
      return prev.filter(d => d.id !== draftId);
    });
  }, [dismissedIds]);

  const updateDraftText = useCallback((draftId: string, text: string) => {
    setDrafts(prev => prev.map(d =>
      d.id === draftId ? { ...d, text, status: 'edited' } : d
    ));
  }, []);

  const regenerate = useCallback(() => {
    generatedRef.current = false;
    setDrafts([]);
    // Trigger re-computation by re-running triggers
    const result = generateTriggers(
      clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang,
    );
    setTriggers(result);
  }, [clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang]);

  const approveAll = useCallback((): MessageDraft[] => {
    const toApprove: MessageDraft[] = [];
    setDrafts(prev => prev.map(d => {
      // Only auto-approve medium and low priority
      if (d.status === 'pending' && d.priority !== 'high') {
        const approved = { ...d, status: 'approved' as const };
        toApprove.push(approved);
        return approved;
      }
      return d;
    }));
    return toApprove;
  }, []);

  return {
    drafts: drafts.filter(d => d.status === 'pending' || d.status === 'edited'),
    loading,
    settings,
    triggers,
    approveDraft,
    skipDraft,
    updateDraftText,
    regenerate,
    approveAll,
  };
}
