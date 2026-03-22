/**
 * useAIDraft — Generate AI-powered message drafts via anthropic-proxy (Haiku).
 *
 * Shows template draft instantly, then upgrades to AI draft when ready.
 * Falls back to template if API fails. Caches in sessionStorage.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { SmartCoachTrigger } from '../utils/smart-coach-engine';
import type { Client, Message, CheckIn, WorkoutLog } from '../types';

interface AIDraftResult {
  aiDraft: string | null;
  loading: boolean;
  error: string | null;
  generate: () => void;
}

// Simple hash for cache keys
function hashKey(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return 'sc-ai-' + Math.abs(hash).toString(36);
}

function buildPrompt(
  trigger: SmartCoachTrigger,
  client: Client,
  messages: Message[],
  checkIns: CheckIn[],
  workoutLogs: WorkoutLog[],
  lang: 'en' | 'pl',
): { system: string; user: string } {
  // Last 5 messages for conversation context
  const recentMsgs = messages
    .filter((m) => m.clientId === client.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
    .map((m) => `${m.isFromCoach ? 'Coach' : client.name}: "${m.text}"`)
    .reverse()
    .join('\n');

  // Last 3 check-ins for wellness context
  const recentCheckIns = checkIns
    .filter((ci) => ci.clientId === client.id && ci.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map((ci) => {
      const parts = [`Date: ${ci.date}`];
      if (ci.mood != null) parts.push(`Mood: ${ci.mood}/5`);
      if (ci.energy != null) parts.push(`Energy: ${ci.energy}/10`);
      if (ci.stress != null) parts.push(`Stress: ${ci.stress}/10`);
      if (ci.sleepHours != null) parts.push(`Sleep: ${ci.sleepHours}h`);
      if (ci.notes) parts.push(`Notes: "${ci.notes}"`);
      return parts.join(' | ');
    })
    .join('\n');

  // Last 3 workouts
  const recentWorkouts = workoutLogs
    .filter((w) => w.clientId === client.id && w.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map((w) => `${w.date}: ${w.type || 'Workout'} (${w.duration || '?'}min)`)
    .join('\n');

  const system = lang === 'pl'
    ? `Jesteś asystentem trenera fitness. Pisz krótkie, naturalne wiadomości po polsku — tak jak napisałby prawdziwy trener do swojego klienta. 2-3 zdania max. Bez emotikonów. Bezpośrednio, ciepło, konkretnie. Używaj imienia klienta.`
    : `You are a fitness coach's assistant. Write short, natural messages in English — like a real coach would text their client. 2-3 sentences max. No emojis. Direct, warm, specific. Use the client's first name.`;

  const contextParts = [
    `Trigger: ${trigger.type} — ${trigger.insightText}`,
    `Client: ${client.name} (${client.status}, streak: ${client.streak} days, progress: ${client.progress}%)`,
  ];

  if (recentMsgs) contextParts.push(`Recent messages:\n${recentMsgs}`);
  if (recentCheckIns) contextParts.push(`Recent check-ins:\n${recentCheckIns}`);
  if (recentWorkouts) contextParts.push(`Recent workouts:\n${recentWorkouts}`);

  const user = contextParts.join('\n\n') +
    `\n\nWrite a message from the coach to ${client.name}. Reference specific details from the data above to make it personal.`;

  return { system, user };
}

export function useAIDraft(
  trigger: SmartCoachTrigger,
  client: Client | null,
  messages: Message[],
  checkIns: CheckIn[],
  workoutLogs: WorkoutLog[],
  lang: 'en' | 'pl',
): AIDraftResult {
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    if (!client) return;

    // Check cache first
    const cacheKey = hashKey(`${trigger.id}-${lang}-${new Date().toISOString().slice(0, 10)}`);
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setAiDraft(cached);
        return;
      }
    } catch { /* ignore */ }

    // Abort previous request if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const { system, user } = buildPrompt(trigger, client, messages, checkIns, workoutLogs, lang);

      const { data, error: fnError } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          system,
          messages: [{ role: 'user', content: user }],
          model: 'claude-haiku-4-5-20251001',
          temperature: 0.7,
          max_tokens: 200,
        },
      });

      // Check if aborted
      if (controller.signal.aborted) return;

      if (fnError) throw new Error(fnError.message || 'Edge function error');
      if (data?.error) throw new Error(data.error);

      const text = data?.content?.[0]?.text || '';

      if (text) {
        setAiDraft(text);
        try { sessionStorage.setItem(cacheKey, text); } catch { /* ignore */ }
      } else {
        setError('empty');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [trigger, client, messages, checkIns, workoutLogs, lang]);

  return { aiDraft, loading, error, generate };
}
