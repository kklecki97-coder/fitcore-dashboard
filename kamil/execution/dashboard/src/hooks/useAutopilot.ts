/**
 * useAutopilot — Single source of truth for Smart Coach triggers + AI drafts.
 * Generates triggers, resolves drafts, and manages dismiss/approve state.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateTriggers } from '../utils/smart-coach-engine';
import { resolveAllDrafts } from '../utils/smart-coach-drafts';
import { generateDrafts, generateTemplateDraft } from '../utils/autopilot-drafts';
import type { SmartCoachTrigger } from '../utils/smart-coach-engine';
import type { MessageDraft, CoachAutopilotSettings } from '../utils/autopilot-types';
import { DEFAULT_AUTOPILOT_SETTINGS } from '../utils/autopilot-types';
import type { Client, Message, CheckIn, Invoice, WorkoutLog, WorkoutProgram } from '../types';

// ── Unified dismissed storage (with TTL per priority) ──────────

interface DismissedEntry {
  id: string;
  expiry: number; // timestamp
}

const STORAGE_KEY = 'fitcore-smartcoach-dismissed';

function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries: DismissedEntry[] = JSON.parse(raw);
    const now = Date.now();
    const valid = entries.filter((e) => e.expiry > now);
    if (valid.length !== entries.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid.map((e) => e.id);
  } catch {
    return [];
  }
}

function addDismissed(triggerId: string, priority: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const entries: DismissedEntry[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const expiryMs = priority === 'high' ? 24 * 60 * 60 * 1000 : 72 * 60 * 60 * 1000;
    entries.push({ id: triggerId, expiry: now + expiryMs });
    // Keep last 200 to prevent bloat
    const trimmed = entries.slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // silently fail
  }
}

// ── Clean up old autopilot dismissed key on first load ──
try { localStorage.removeItem('fitcore-autopilot-dismissed'); } catch { /* ignore */ }

// ── Hook ────────────────────────────────────────────────────────

export interface AutopilotState {
  /** All triggers with resolved template drafts (for SmartCoachWidget cards) */
  triggers: SmartCoachTrigger[];
  /** AI-enhanced drafts keyed by triggerId */
  draftsMap: Map<string, MessageDraft>;
  /** Flat list of pending/edited drafts */
  drafts: MessageDraft[];
  loading: boolean;
  settings: CoachAutopilotSettings;
  dismissedIds: string[];
  // Actions
  dismissTrigger: (triggerId: string) => void;
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
  const [rawTriggers, setRawTriggers] = useState<SmartCoachTrigger[]>([]);
  const generatedRef = useRef(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(loadDismissed);

  // ── Step 1: Compute triggers ──
  useEffect(() => {
    if (clients.length === 0) return;
    const result = generateTriggers(
      clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang,
    );
    setRawTriggers(result);
  }, [clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang]);

  // ── Step 1b: Resolve __TEMPLATE__ drafts for card display ──
  const triggers = useMemo(
    () => resolveAllDrafts(rawTriggers, lang),
    [rawTriggers, lang],
  );

  // ── Step 2: Generate AI drafts from draftable triggers ──
  useEffect(() => {
    if (rawTriggers.length === 0 || generatedRef.current) return;

    const draftableTriggers = rawTriggers.filter(t =>
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
            const aiMap = new Map(aiDrafts.map(d => [d.triggerId, d]));
            return prev.map(d => aiMap.get(d.triggerId) || d);
          });
        }
      })
      .catch(err => {
        console.error('AI draft generation failed, keeping template drafts:', err);
      })
      .finally(() => setLoading(false));
  }, [rawTriggers, clients, settings, lang]);

  // ── Drafts map for quick lookup by triggerId ──
  const activeDrafts = useMemo(
    () => drafts.filter(d => d.status === 'pending' || d.status === 'edited'),
    [drafts],
  );

  const draftsMap = useMemo(
    () => new Map(activeDrafts.map(d => [d.triggerId, d])),
    [activeDrafts],
  );

  // ── Actions ──

  const dismissTrigger = useCallback((triggerId: string) => {
    const trigger = rawTriggers.find((t) => t.id === triggerId);
    addDismissed(triggerId, trigger?.priority || 'medium');
    setDismissedIds((prev) => [...prev, triggerId]);
    // Also remove any draft for this trigger
    setDrafts(prev => prev.filter(d => d.triggerId !== triggerId));
  }, [rawTriggers]);

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
        addDismissed(draft.triggerId, draft.priority);
        setDismissedIds(ids => [...ids, draft.triggerId]);
      }
      return prev.filter(d => d.id !== draftId);
    });
  }, []);

  const updateDraftText = useCallback((draftId: string, text: string) => {
    setDrafts(prev => prev.map(d =>
      d.id === draftId ? { ...d, text, status: 'edited' } : d
    ));
  }, []);

  const regenerate = useCallback(() => {
    generatedRef.current = false;
    setDrafts([]);
    const result = generateTriggers(
      clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang,
    );
    setRawTriggers(result);
  }, [clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang]);

  const approveAll = useCallback((): MessageDraft[] => {
    const toApprove: MessageDraft[] = [];
    setDrafts(prev => prev.map(d => {
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
    triggers,
    draftsMap,
    drafts: activeDrafts,
    loading,
    settings,
    dismissedIds,
    dismissTrigger,
    approveDraft,
    skipDraft,
    updateDraftText,
    regenerate,
    approveAll,
  };
}
