/**
 * Autopilot Draft Generator
 * Takes Smart Coach triggers + coach settings → generates personalized message drafts via AI.
 */
import { supabase } from '../lib/supabase';
import type { SmartCoachTrigger } from './smart-coach-engine';
import type { CoachAutopilotSettings, MessageDraft } from './autopilot-types';
import type { Client } from '../types';

// ── Prompt templates per trigger type ──

function buildPrompt(
  trigger: SmartCoachTrigger,
  client: Client,
  settings: CoachAutopilotSettings,
  lang: 'en' | 'pl',
): string {
  const toneDesc: Record<string, string> = {
    motivational: 'energetic, positive, uses exclamation marks, celebrates small wins',
    technical: 'precise, data-driven, references specific numbers and metrics',
    friendly: 'warm, casual, like texting a friend, uses first names',
    formal: 'professional, respectful, structured, polite',
  };

  const phrasesNote = settings.customPhrases.length > 0
    ? `Try to naturally include one of these phrases the coach likes to use: ${settings.customPhrases.join(', ')}`
    : '';

  const contextByType: Record<string, string> = {
    'missed-workout': `Client hasn't trained in several days. Their last workout was noted in the trigger. They have an active program assigned.`,
    'inactive': `Client has been completely silent — no workouts, no messages, no check-ins for multiple days.`,
    'wellness-decline': `Client's wellness metrics (energy, mood, or sleep) have been declining over the last 3 check-ins.`,
    'msg-unanswered': `Client sent a message days ago and the coach hasn't replied yet. This is a catch-up message.`,
    'pr': `Client just hit a personal record! This is a celebration message.`,
    'streak': `Client has maintained a consistent training streak. This is an encouragement message.`,
    'progress-milestone': `Client just crossed a major progress milestone. This is a congratulations message.`,
    'new-client': `This is a new client in their first week. The message should set expectations and make them feel welcome.`,
    'program-ending': `Client's current training program is ending soon. This is a heads-up about planning next steps.`,
    'paused-long': `Client has been on pause for a while. This is a gentle re-engagement message.`,
    'stale': `Client hasn't submitted a check-in in over 2 weeks. This is a check-in reminder.`,
    'checkin-overdue': `Client submitted a check-in but the coach hasn't reviewed it yet. Generate a brief acknowledgment.`,
    'invoice-overdue': `Client has an overdue payment. Generate a polite payment reminder.`,
    'invoice-due': `Client has a payment due soon. Generate a friendly heads-up.`,
    'wellness-up': `Client's wellness metrics are all trending up. This is a positive reinforcement message.`,
    'all-clear': `Everything is on track. No message needed.`,
  };

  return `You are writing a short message from a fitness coach to their client.
Tone: ${toneDesc[settings.tone] || toneDesc.friendly}
Language: ${lang === 'pl' ? 'Polish' : 'English'}
${phrasesNote}

Context about this client:
- Name: ${client.name}
- Plan: ${client.plan}
- Status: ${client.status}
- Progress: ${client.progress}%
- Streak: ${client.streak} days
- Trigger: ${trigger.insightText}
- Situation: ${contextByType[trigger.type] || 'General coaching check-in.'}

Rules:
- Write 2-3 sentences maximum
- Do NOT sound like a bot or automated message
- Do NOT use "Dear" or overly formal greetings
- Do NOT use emojis unless the tone is motivational
- Reference specific details from the context (name, numbers, situation)
- Sound like a real ${settings.tone} coach who knows this client personally
- If the trigger is about a personal record or milestone, be genuinely enthusiastic`;
}

// ── Generate drafts for a batch of triggers ──

export async function generateDrafts(
  triggers: SmartCoachTrigger[],
  clients: Client[],
  settings: CoachAutopilotSettings,
  lang: 'en' | 'pl',
): Promise<MessageDraft[]> {
  // Filter triggers that can have drafts (skip all-clear, invoice-overdue, checkin-overdue which are view-only)
  const draftable = triggers.filter(t =>
    t.clientId &&
    t.draftText === '__TEMPLATE__' &&
    t.type !== 'all-clear'
  );

  if (draftable.length === 0) return [];

  // Cap at maxDraftsPerDay
  const limited = draftable.slice(0, settings.maxDraftsPerDay);

  const clientMap = new Map(clients.map(c => [c.id, c]));
  const drafts: MessageDraft[] = [];

  // Generate drafts in parallel (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < limited.length; i += batchSize) {
    const batch = limited.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (trigger) => {
        const client = clientMap.get(trigger.clientId!);
        if (!client) return null;

        const prompt = buildPrompt(trigger, client, settings, lang);

        try {
          const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
            body: {
              system: prompt,
              messages: [{ role: 'user', content: 'Write the message now.' }],
              temperature: 0.7,
              max_tokens: 150,
            },
          });

          if (error || data?.error) {
            console.error('Autopilot draft generation failed:', error || data?.error);
            return null;
          }

          const text = data?.content?.[0]?.text?.trim() || '';
          if (!text) return null;

          const draft: MessageDraft = {
            id: `draft-${trigger.id}`,
            triggerId: trigger.id,
            clientId: trigger.clientId!,
            clientName: trigger.clientName || client.name,
            triggerType: trigger.type,
            priority: trigger.priority,
            text,
            context: trigger.insightText,
            generatedAt: new Date().toISOString(),
            status: 'pending',
          };

          return draft;
        } catch (err) {
          console.error('Autopilot draft error:', err);
          return null;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        drafts.push(result.value);
      }
    }
  }

  return drafts;
}

// ── Generate a single draft using template (no AI, fallback) ──

export function generateTemplateDraft(
  trigger: SmartCoachTrigger,
  client: Client,
  _settings: CoachAutopilotSettings,
  lang: 'en' | 'pl',
): MessageDraft | null {
  if (!trigger.clientId || trigger.type === 'all-clear') return null;

  const name = client.name.split(' ')[0]; // first name
  const templates: Record<string, Record<'en' | 'pl', string>> = {
    'missed-workout': {
      en: `Hey ${name}, noticed you haven't trained in a few days. Everything ok? Let me know if you need any adjustments to the program.`,
      pl: `Hej ${name}, widzę że nie było treningu od kilku dni. Wszystko ok? Daj znać czy potrzebujesz zmian w planie.`,
    },
    'inactive': {
      en: `Hey ${name}, haven't heard from you in a while. Just checking in — how's everything going?`,
      pl: `Hej ${name}, dawno się nie odzywałeś/aś. Jak tam u Ciebie? Daj znać!`,
    },
    'wellness-decline': {
      en: `Hey ${name}, I noticed your energy and mood have been dipping lately. Want to talk about adjusting the plan?`,
      pl: `Hej ${name}, zauważyłem że energia i nastrój ostatnio spadają. Chcesz pogadać o dostosowaniu planu?`,
    },
    'msg-unanswered': {
      en: `Hey ${name}, sorry for the late reply! What's on your mind?`,
      pl: `Hej ${name}, sorry za późną odpowiedź! O czym chciałeś/aś pogadać?`,
    },
    'pr': {
      en: `${name}! New PR — that's amazing! Your hard work is clearly paying off. Keep pushing!`,
      pl: `${name}! Nowy rekord — to jest mega! Widać że ciężka praca się opłaca. Tak trzymaj!`,
    },
    'streak': {
      en: `${name}, ${client.streak} days in a row — that's consistency right there! Proud of you.`,
      pl: `${name}, ${client.streak} dni z rzędu — to jest konsekwencja! Jestem dumny/a!`,
    },
    'progress-milestone': {
      en: `${name}, you just passed ${client.progress}% of your goal! That's a huge milestone. Let's keep this momentum going.`,
      pl: `${name}, właśnie przekroczyłeś/aś ${client.progress}% celu! To ogromny milestone. Utrzymujemy tempo!`,
    },
    'new-client': {
      en: `Welcome ${name}! First week is all about getting comfortable with the routine. Any questions — just message me.`,
      pl: `Witaj ${name}! Pierwszy tydzień to oswajanie się z planem. Jakiekolwiek pytania — pisz śmiało.`,
    },
    'program-ending': {
      en: `Hey ${name}, your current program is wrapping up soon. Let's chat about what's next!`,
      pl: `Hej ${name}, Twój obecny program niedługo się kończy. Pogadajmy co dalej!`,
    },
    'paused-long': {
      en: `Hey ${name}, it's been a while since you paused. Feeling ready to get back? No pressure — just let me know.`,
      pl: `Hej ${name}, minęło trochę od pauzy. Czujesz się gotowy/a żeby wrócić? Bez presji — daj znać.`,
    },
    'stale': {
      en: `Hey ${name}, haven't seen a check-in from you in a while. How are things going? Quick update would help me plan ahead for you.`,
      pl: `Hej ${name}, dawno nie było check-inu. Jak leci? Krótki update pomoże mi zaplanować dalej.`,
    },
    'wellness-up': {
      en: `${name}, your energy, mood and sleep are all trending up — love to see it! Whatever you're doing, keep it up.`,
      pl: `${name}, energia, nastrój i sen — wszystko idzie w górę! Cokolwiek robisz, nie zmieniaj!`,
    },
  };

  const template = templates[trigger.type];
  if (!template) return null;

  return {
    id: `draft-${trigger.id}`,
    triggerId: trigger.id,
    clientId: trigger.clientId,
    clientName: trigger.clientName || client.name,
    triggerType: trigger.type,
    priority: trigger.priority,
    text: template[lang] || template.en,
    context: trigger.insightText,
    generatedAt: new Date().toISOString(),
    status: 'pending',
  };
}
