import { useState, useEffect, useCallback, useRef } from 'react';
import type { Client, Invoice, WorkoutLog, CheckIn, Message, WorkoutProgram } from '../types';
import { buildSnapshot, hashString } from '../utils/dashboard-snapshot';
import { supabase } from '../lib/supabase';

interface BriefingResult {
  briefing: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
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

      const { data, error: fnError } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          system: systemPrompt,
          messages: [{ role: 'user', content: snapshotStr }],
          temperature: 0.6,
          max_tokens: 300,
        },
      });

      if (fnError) throw new Error(fnError.message || 'Edge function error');
      if (data?.error) throw new Error(data.error);

      const text = data?.content?.[0]?.text || '';

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
