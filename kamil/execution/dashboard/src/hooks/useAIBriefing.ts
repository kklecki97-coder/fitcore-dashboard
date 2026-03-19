import { useState, useEffect, useCallback, useRef } from 'react';
import type { Client, Invoice, WorkoutLog, CheckIn, Message, WorkoutProgram } from '../types';

interface BriefingResult {
  briefing: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function buildSnapshot(
  clients: Client[],
  invoices: Invoice[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  messages: Message[],
  programs: WorkoutProgram[],
) {
  const now = new Date();
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

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'briefing-' + hash;
}

export function useAIBriefing(
  clients: Client[],
  invoices: Invoice[],
  workoutLogs: WorkoutLog[],
  checkIns: CheckIn[],
  messages: Message[],
  programs: WorkoutProgram[],
  lang: string,
): BriefingResult {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const lastLangRef = useRef(lang);

  const fetchBriefing = useCallback(async (force = false) => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError('no-key');
      return;
    }

    const snapshot = buildSnapshot(clients, invoices, workoutLogs, checkIns, messages, programs);
    const snapshotStr = JSON.stringify({ ...snapshot, lang });
    const cacheKey = hashString(snapshotStr);

    // Check cache unless forced
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setBriefing(cached);
          return;
        }
      } catch { /* ignore */ }
    }

    setLoading(true);
    setError(null);

    try {
      const systemPrompt = `You are FitCore AI, a business analytics assistant for fitness coaches.
Respond in ${lang === 'pl' ? 'Polish' : 'English'}.
Given the coach's current business data, write a concise 3-5 sentence business briefing.
Be direct and actionable. Mention specific numbers. Highlight what needs attention and what's going well.
Do not use bullet points - write flowing prose. Do not use emojis.
Sound like a sharp business advisor, not a chatbot.
If all numbers are zero, give an encouraging message about getting started.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          system: systemPrompt,
          messages: [{ role: 'user', content: snapshotStr }],
          temperature: 0.6,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || '';

      if (text) {
        setBriefing(text);
        try { sessionStorage.setItem(cacheKey, text); } catch { /* ignore */ }
      } else {
        setError('empty');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [clients, invoices, workoutLogs, checkIns, messages, programs, lang]);

  // Auto-fetch on mount and when language changes
  useEffect(() => {
    if (clients.length === 0) return;
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchBriefing();
    } else if (lastLangRef.current !== lang) {
      lastLangRef.current = lang;
      fetchBriefing(false); // will miss cache because lang is in hash
    }
  }, [fetchBriefing, clients.length, lang]);

  const refresh = useCallback(() => {
    fetchBriefing(true);
  }, [fetchBriefing]);

  return { briefing, loading, error, refresh };
}
