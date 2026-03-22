/**
 * Smart Coach Drafts — Template-based message drafts with multiple variants.
 *
 * No API calls. Deterministic variant selection per client per day.
 * Phase 2 will add AI-generated drafts via anthropic-proxy.
 */

import type { TriggerType, SmartCoachTrigger } from './smart-coach-engine';

// ── Template variants ──────────────────────────────────────────

const DRAFT_TEMPLATES: Partial<Record<TriggerType, Record<'en' | 'pl', string[]>>> = {
  'msg-unanswered': {
    pl: [
      'Hej {name}, sorry za zwłokę! Odpowiadając na Twoje pytanie — ',
      '{name}, przepraszam że dopiero teraz — wracam do Twojej wiadomości. ',
      'Hej {name}, wybacz opóźnienie! Jeśli chodzi o to co pisałeś/aś — ',
    ],
    en: [
      "Hey {name}, sorry for the delay! Regarding your message — ",
      "{name}, apologies for the late reply — getting back to you now. ",
      "Hey {name}, sorry about the wait! About what you asked — ",
    ],
  },
  inactive: {
    pl: [
      'Hej {name}, jak leci? Dawno się nie odzywałeś/aś — daj znać czy wszystko ok z treningami!',
      '{name}, co słychać? Widzę że ostatnio cisza — jakiś problem czy po prostu nawał?',
      'Hej {name}, nie widziałem/am Cię od {n} dni — wszystko gra? Daj znać czy coś zmienić w planie.',
      '{name}, tylko szybki check — jak się czujesz? Masz pytania do programu?',
    ],
    en: [
      "Hey {name}, how's it going? Haven't seen you in a while — everything ok with training?",
      "{name}, checking in — I noticed it's been {n} days. Need any adjustments to the plan?",
      "Hey {name}, just a quick one — how are you feeling? Let me know if you need anything.",
      "{name}, haven't heard from you in a bit — everything alright? Happy to adjust anything.",
    ],
  },
  'missed-workout': {
    pl: [
      'Hej {name}, widzę że ostatni trening jeszcze nie poszedł — potrzebujesz modyfikacji planu?',
      '{name}, brakuje mi Twojego treningu — wszystko ok? Mogę dostosować jeśli potrzebujesz.',
      'Hej {name}, trening czeka — dasz radę dziś nadrobić czy przesuwamy?',
    ],
    en: [
      "Hey {name}, I see the last workout hasn't happened yet — need any plan adjustments?",
      '{name}, looks like a session got missed — everything ok? I can modify if needed.',
      'Hey {name}, the session is still open — can you fit it in today or should we reschedule?',
    ],
  },
  'wellness-decline': {
    pl: [
      'Widzę że ostatnio energia spada — jak się czujesz, {name}? Może dostosujemy plan żebyś się nie wypalał/a.',
      '{name}, zauważyłem/am spadek w samopoczuciu — pogadajmy co zmienić żeby było lżej.',
      'Hej {name}, Twoje ostatnie check-iny pokazują spadek energii — chcesz żebyśmy zmodyfikowali obciążenia?',
    ],
    en: [
      "I noticed your energy has been dropping, {name} — how are you feeling? Maybe we should adjust the plan.",
      "{name}, your recent check-ins show a dip in wellness — let's talk about what to change.",
      'Hey {name}, looks like energy has been trending down — want me to modify the training load?',
    ],
  },
  'program-ending': {
    pl: [
      'Twój program {context} kończy się za {n} dni, {name} — chcesz żebyśmy zaplanowali następny blok?',
      '{name}, {context} dobiega końca za {n} dni — mam już pomysł na kolejny etap, pogadamy?',
      'Hej {name}, za {n} dni kończy się {context} — czas planować co dalej!',
    ],
    en: [
      "Your program {context} ends in {n} days, {name} — want me to plan the next block?",
      "{name}, {context} wraps up in {n} days — I have ideas for what's next, let's chat.",
      'Hey {name}, {context} finishes in {n} days — time to plan ahead!',
    ],
  },
  stale: {
    pl: [
      '{name}, dawno nie mieliśmy check-inu — wrzuć krótką aktualizację żebym wiedział/a jak idzie!',
      'Hej {name}, minęło trochę czasu od ostatniego check-inu — jak postępy? Daj znać!',
      '{name}, czekam na Twój check-in — nawet krótki update bardzo mi pomoże w planowaniu.',
    ],
    en: [
      "{name}, it's been a while since your last check-in — drop me a quick update!",
      "Hey {name}, it's been a while since your last check-in — how's progress? Let me know!",
      '{name}, waiting on your check-in — even a quick update helps me plan better.',
    ],
  },
  'new-client': {
    pl: [
      'Hej {name}, jak pierwsze dni? Pamiętaj — na początku chodzi o regularność, nie o perfekcję. Pisz jak masz pytania!',
      '{name}, witaj na pokładzie! Jak wrażenia po pierwszych treningach? Jestem tu jeśli coś jest niejasne.',
      'Hej {name}, pierwszy tydzień za Tobą — jak się czujesz? Daj znać jak mogę pomóc!',
    ],
    en: [
      "Hey {name}, how are the first few days going? Remember — consistency over perfection. Hit me up with any questions!",
      "{name}, welcome aboard! How are the first workouts feeling? I'm here if anything's unclear.",
      'Hey {name}, first week down — how are you feeling? Let me know how I can help!',
    ],
  },
  'paused-long': {
    pl: [
      '{name}, minęło trochę czasu od pauzy — chcesz wrócić do treningów? Mogę przygotować lżejszy plan na start.',
      'Hej {name}, dawno się nie widzieliśmy — gotowy/a żeby wrócić? Mam plan na łagodny restart.',
      '{name}, pamiętam o Tobie — jak będziesz gotowy/a do powrotu, daj znać. Przygotuję coś na start.',
    ],
    en: [
      "{name}, it's been a while since your pause — ready to get back? I can prepare an easier restart plan.",
      "Hey {name}, haven't seen you in a bit — ready to come back? I have a gentle restart plan in mind.",
      "{name}, thinking of you — whenever you're ready to return, let me know. I'll prep something easy to start.",
    ],
  },
  pr: {
    pl: [
      'BRAWO {name}! Nowy rekord w {context} — to jest progres!',
      '{name}, nowy rekord w {context}! Robisz postępy, widać to!',
      'Hej {name}, {context} — widzisz te rezultaty? Tak się robi!',
    ],
    en: [
      "AMAZING {name}! New {context} PR — you're crushing it!",
      '{name}, new {context} PR! Progress is real — keep it going!',
      "Hey {name}, {context} — see those results? That's how it's done!",
    ],
  },
  streak: {
    pl: [
      '{n} dni bez przerwy — to jest konsekwencja, {name}! Tak się buduje formę.',
      '{name}, {n}-dniowy streak! To jest commitment — widzę i doceniam.',
      'Hej {name}, {n} dni z rzędu — maszyna! Nie zwalniaj!',
    ],
    en: [
      "{n} days straight — that's consistency, {name}! This is how you build results.",
      "{name}, {n}-day streak! That's real commitment — I see it and I appreciate it.",
      "Hey {name}, {n} days in a row — you're a machine! Keep it up!",
    ],
  },
  'progress-milestone': {
    pl: [
      'Właśnie przekroczyłeś/aś {n}% celu, {name} — widzisz te postępy? Dalej tak!',
      '{name}, {n}% celu za Tobą! Momentum jest, nie zwalniaj!',
      'Hej {name}, {n}% drogi przebyte — to jest progres którego szukaliśmy!',
    ],
    en: [
      'You just crossed {n}% of your goal, {name} — see that progress? Keep going!',
      "{name}, {n}% done! Momentum is building, don't slow down!",
      "Hey {name}, {n}% of the way there — this is the progress we've been working toward!",
    ],
  },
};

// ── Variant selection ──────────────────────────────────────────

/** Deterministic hash — same client sees same variant per day, different variant next day. */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickVariant(templates: string[], clientId: string): string {
  const dayKey = new Date().toISOString().slice(0, 10);
  const hash = simpleHash(clientId + dayKey);
  return templates[hash % templates.length];
}

// ── Context extraction ─────────────────────────────────────────

/** Extract {n} and {name} values from trigger for template interpolation. */
function extractContext(trigger: SmartCoachTrigger): Record<string, string> {
  const ctx: Record<string, string> = {
    name: trigger.clientName || '',
  };

  // Extract number from insight text (e.g. "6 days", "14 dni", "75%")
  const numMatch = trigger.insightText.match(/(\d+)\s*(dni|days|day|%)/);
  if (numMatch) {
    ctx.n = numMatch[1];
  }

  // For streak triggers, extract streak number
  if (trigger.type === 'streak') {
    const streakMatch = trigger.insightText.match(/(\d+)/);
    if (streakMatch) ctx.n = streakMatch[1];
  }

  // For progress milestone, extract percentage
  if (trigger.type === 'progress-milestone') {
    const pctMatch = trigger.insightText.match(/(\d+)%/);
    if (pctMatch) ctx.n = pctMatch[1];
  }

  // Extract {context} for richer messages
  if (trigger.type === 'pr') {
    // Match lift name from insight: "nowy rekord w wyciskanie: 120kg" or "new bench press PR: 120kg"
    const prMatchPl = trigger.insightText.match(/rekord w (.+?):/);
    const prMatchEn = trigger.insightText.match(/new (.+?) PR:/);
    if (prMatchPl) ctx.context = prMatchPl[1];
    else if (prMatchEn) ctx.context = prMatchEn[1];
  }

  if (trigger.type === 'program-ending') {
    // Match program name in quotes: "'Powerlifting Peak'"
    const progMatch = trigger.insightText.match(/'([^']+)'/);
    if (progMatch) ctx.context = progMatch[1];
  }

  return ctx;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Resolve `__TEMPLATE__` placeholder in trigger.draftText to actual template text.
 * Returns null if no template exists for this trigger type.
 */
export function resolveDraft(
  trigger: SmartCoachTrigger,
  lang: 'en' | 'pl',
): string | null {
  if (trigger.draftText !== '__TEMPLATE__') return trigger.draftText;

  const templates = DRAFT_TEMPLATES[trigger.type];
  if (!templates) return null;

  const variants = templates[lang];
  if (!variants || variants.length === 0) return null;

  const clientId = trigger.clientId || 'system';
  let text = pickVariant(variants, clientId);

  // Interpolate context
  const ctx = extractContext(trigger);
  for (const [key, value] of Object.entries(ctx)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return text;
}

/**
 * Get ALL resolved draft variants for a trigger.
 * Used by modal to let coach cycle through alternatives.
 */
export function getAllDraftVariants(
  trigger: SmartCoachTrigger,
  lang: 'en' | 'pl',
): string[] {
  const templates = DRAFT_TEMPLATES[trigger.type];
  if (!templates) return [];

  const variants = templates[lang];
  if (!variants || variants.length === 0) return [];

  const ctx = extractContext(trigger);
  return variants.map((tpl) => {
    let text = tpl;
    for (const [key, value] of Object.entries(ctx)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return text;
  });
}

/**
 * Process all triggers: replace __TEMPLATE__ placeholders with resolved drafts.
 * Returns new array (does not mutate input).
 */
export function resolveAllDrafts(
  triggers: SmartCoachTrigger[],
  lang: 'en' | 'pl',
): SmartCoachTrigger[] {
  return triggers.map((t) => {
    if (t.draftText !== '__TEMPLATE__') return t;
    return { ...t, draftText: resolveDraft(t, lang) };
  });
}
