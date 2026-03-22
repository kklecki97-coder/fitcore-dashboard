# Smart Coach Engine — Unified Implementation Plan

> **Status:** Draft — awaiting review
> **Date:** 2026-03-22
> **Replaces:** `ai-coach-insights-plan.md` + `coach-autopilot-plan.md`
> **Estimated effort:** MVP in 1 session, full scope in 1-2 weeks

---

## 1. What Is Smart Coach Engine?

One unified system that **detects** which clients need attention, **shows** the coach why, and **offers** a ready-to-send message — all in one panel.

**The problem it solves:**
A coach with 30+ clients can't track every check-in, missed workout, and mood trend manually. They either spend 2 hours reviewing each client, or they miss things and clients churn.

**How it works:**
1. A single **Trigger Engine** scans all client data and generates prioritized alerts
2. Each trigger appears as an **insight card** — compact, scannable, actionable
3. High-priority triggers also get a **draft message** — the coach reviews, edits, sends
4. The whole thing lives in a **collapsible widget** on Overview — doesn't dominate the page

**Why one system, not two:**
The original plans (Insights Panel + Autopilot Queue) shared ~70% of trigger logic and would fight for viewport space. This plan merges them: one engine, one UI, two modes per trigger (inform or act).

---

## 2. What We Already Have

| Existing Element | Location | What It Gives Us |
|---|---|---|
| Engagement scoring (0-100) | `utils/engagement.ts` | `calculateEngagement()` with weighted breakdown + trend detection |
| Suggested actions per client | `utils/engagement.ts` | `getSuggestedAction()` — returns motivation/call/adjust recommendation |
| At-Risk Clients filter | `utils/client-analysis.ts` | `filterAtRiskClients()` — paused, no workouts, overdue check-ins |
| Check-in data | Supabase `check_ins` | mood, energy, stress, sleep, nutrition — wellness triggers |
| Workout logs | Supabase `workout_logs` | Missed workouts, completion tracking |
| Client metrics | `Client.metrics` | Weight/BF/lift time-series for trend detection |
| Chat system | `MessagesPage.tsx` + `App.tsx` | `handleSendMessage(msg: Message)` — optimistic update + Supabase insert |
| AI proxy | Edge Function `anthropic-proxy` | Already works for AI Briefing — reuse for draft generation |
| i18n | `i18n/en.ts` / `i18n/pl.ts` | PL/EN support ready |

**~60% of infrastructure exists.** We're wiring it together, not building from scratch.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  TRIGGER ENGINE  (client-side, pure function)           │
│  `utils/smart-coach-engine.ts`                          │
│                                                         │
│  Input:  clients, workoutLogs, checkIns, messages,      │
│          invoices, programs, engagement scores           │
│  Output: SmartCoachTrigger[]                             │
│                                                         │
│  Each trigger = insight + optional draft action          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  SMART COACH WIDGET  (collapsible on OverviewPage)      │
│  `components/SmartCoachWidget.tsx`                       │
│                                                         │
│  Collapsed: badge count + top 2-3 items                 │
│  Expanded: full list grouped by priority                 │
│                                                         │
│  Per trigger:                                            │
│    - View client → navigates to client detail            │
│    - Send message → inline draft, edit, send             │
│    - Dismiss → hide for 24h                              │
│                                                         │
│  Draft generation:                                       │
│    Phase 1: Template-based (zero API)                    │
│    Phase 2: AI-generated via anthropic-proxy             │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Pure function, no side effects** — trigger engine is a pure `generateTriggers()` call, easy to test and memoize
- **Client-side only for triggers** — no API dependency, instant render
- **Template drafts in MVP** — zero API cost, works offline, ships fast
- **One widget, not two panels** — no viewport competition

---

## 4. Trigger Definitions

### Priority: HIGH (act today)

| Trigger | ID | Condition | Insight Text | Draft Action |
|---|---|---|---|---|
| **Unreviewed check-in >48h** | `checkin-overdue` | `reviewStatus === 'pending'` AND check-in date >48h ago | "{name}'s check-in from {day} is unreviewed — {n} days waiting" | No draft — action is to review, not message |
| **Inactive client >3 days** | `inactive` | No workout log, no message from client in >72h AND status === 'active' | "{name} hasn't logged anything in {n} days" | "Hej {name}, jak leci? Dawno się nie odzywałeś/aś — daj znać czy wszystko ok z treningami!" |
| **Unanswered message >48h** | `msg-unanswered` | Client sent message, no coach reply >48h | "{name} messaged {n} days ago — no reply yet" | No draft — action is to reply to existing thread |
| **Declining wellness** | `wellness-decline` | Last 3 check-ins: energy OR mood dropping consistently (each lower than previous) | "{name}: energy {a}→{b}→{c} over last 3 check-ins" | "Widzę że ostatnio energia spada — jak się czujesz? Może dostosujemy plan żebyś się nie wypalał/a." |
| **Overdue invoice** | `invoice-overdue` | `invoice.status === 'overdue'` | "{name} has an overdue invoice ({amount}) — due {n} days ago" | No draft — financial, handle manually |

### Priority: MEDIUM (act this week)

| Trigger | ID | Condition | Insight Text | Draft Action |
|---|---|---|---|---|
| **Program ending soon** | `program-ending` | Active program completing in ≤7 days | "{name}'s '{program}' ends in {n} days — prepare next block" | "Twój program {program} kończy się za {n} dni — chcesz żebyśmy zaplanowali następny blok?" |
| **Missed workout >48h** | `missed-workout` | Last completed workout >48h ago AND client has active program | "{name} hasn't trained in {n} days" | "Hej {name}, widzę że {last_workout_day} trening jeszcze nie poszedł — potrzebujesz modyfikacji planu?" |
| **Stale client** | `stale` | Active client, last check-in >14 days ago | "{name} hasn't checked in for {n} days" | "{name}, dawno nie mieliśmy check-inu — wrzuć krótką aktualizację żebym wiedział/a jak idzie!" |
| **Pending invoice due soon** | `invoice-due` | `status === 'pending'` AND dueDate within 3 days | "{name}'s invoice ({amount}) is due in {n} days" | No draft — financial |
| **New client first week** | `new-client` | `startDate` within last 7 days | "{name} is in first week — set expectations early" | "Hej {name}, jak pierwsze dni? Pamiętaj — na początku chodzi o regularność, nie o perfekcję. Pisz jak masz pytania!" |
| **Paused client >14 days** | `paused-long` | `status === 'paused'` for >14 days | "{name} has been paused for {n} days — re-engagement?" | "{name}, minęło trochę czasu od pauzy — chcesz wrócić do treningów? Mogę przygotować lżejszy plan na start." |

### Priority: LOW (celebrate / reinforce)

| Trigger | ID | Condition | Insight Text | Draft Action |
|---|---|---|---|---|
| **Personal record** | `pr` | Latest lift metric > all previous entries for that lift | "{name} hit a new {lift} PR: {weight}kg (+{diff}kg)" | "BRAWO! {weight}kg w {lift} — to +{diff}kg! Lecisz!" |
| **Streak milestone** | `streak` | `client.streak` === 7, 14, 21, 30, 60, 90 | "{name} is on a {n}-day streak" | "{n} dni bez przerwy — to jest konsekwencja, {name}! Tak się buduje formę." |
| **Progress milestone** | `progress-milestone` | `client.progress` crosses 25%, 50%, 75%, 90% | "{name} just crossed {n}% of their goal" | "Właśnie przekroczyłeś/aś {n}% celu — widzisz te postępy? Dalej tak!" |
| **All caught up** | `all-clear` | Zero HIGH triggers, zero unreviewed check-ins | "All caught up — your clients are in good shape" | No draft |
| **Positive wellness trend** | `wellness-up` | Last 3 check-ins: energy AND mood AND sleep all improving | "{name}: wellness trending up — energy, mood, sleep all improving" | No draft — no message needed, just coach awareness |

### Deduplication & Rate Limiting

- **Trigger ID format:** `{clientId}-{triggerType}-{dateKey}` (dateKey = YYYY-MM-DD)
- **Max 1 trigger per type per client per day** — prevents flooding
- **Max 1 draft message per client per 48h** — if a draft was sent/skipped for client X today, no new draft for X until day after tomorrow
- **Dismissed triggers** stored in `localStorage('fitcore-smartcoach-dismissed')` with expiry (24h for HIGH, 72h for MEDIUM/LOW)

---

## 5. Trigger Engine Implementation

### New file: `src/utils/smart-coach-engine.ts`

```typescript
interface SmartCoachTrigger {
  id: string;                              // deterministic: clientId-type-dateKey
  type: TriggerType;                       // from enum above
  priority: 'high' | 'medium' | 'low';
  clientId?: string;                       // null for system-level triggers (all-clear)
  clientName?: string;
  insightText: string;                     // human-readable insight
  draftText: string | null;                // null = no draft available (manual action needed)
  icon: string;                            // lucide icon name
  timestamp: string;                       // when the trigger condition occurred
  actionType: 'view' | 'message' | 'review'; // what the primary CTA does
}

function generateTriggers(
  clients: Client[],
  messages: Message[],
  checkIns: CheckIn[],
  invoices: Invoice[],
  workoutLogs: WorkoutLog[],
  programs: WorkoutProgram[],
  dismissedIds: string[],
  lang: 'en' | 'pl',
): SmartCoachTrigger[]
```

**Rules:**
- Pure function — no side effects, no API calls
- Returns triggers sorted: HIGH first, then MEDIUM, then LOW
- Within same priority: sorted by timestamp (oldest trigger first = most urgent)
- Filters out dismissed triggers before returning
- Applies per-client rate limiting (max 3 triggers per client to prevent one problematic client dominating the list)
- `all-clear` trigger only appears when zero HIGH triggers exist

**Active conversation guard:**
Before generating a draft for any client, check if there's an active conversation (message sent by client OR coach within last 24h). If yes:
- Trigger still appears (the insight is valuable)
- But `draftText` is set to `null` and `actionType` is set to `'message'`
- UI shows "Active conversation — reply in Messages →" link instead of draft

```typescript
function hasRecentConversation(clientId: string, messages: Message[], hoursThreshold = 24): boolean {
  const cutoff = Date.now() - hoursThreshold * 60 * 60 * 1000;
  return messages.some(m => m.clientId === clientId && new Date(m.timestamp).getTime() > cutoff);
}
```

**Business days for inactivity thresholds:**
Triggers `inactive` and `missed-workout` count business days (Mon-Fri) instead of calendar days. This prevents false alarms on Monday mornings from weekend inactivity. Other triggers (msg-unanswered, checkin-overdue) use calendar days — those are time-sensitive regardless of weekends.

```typescript
function getBusinessDaysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  let count = 0;
  const current = new Date(start);
  while (current < now) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
```

**Reuses existing code:**
- `calculateEngagement()` for engagement-based triggers (drop detection)
- `filterAtRiskClients()` logic folded into trigger conditions (then remove At-Risk card from Overview)

---

## 6. Draft Templates (MVP — Phase 1)

### New file: `src/utils/smart-coach-drafts.ts`

No API calls. Multiple template variants per trigger, deterministically selected per client.

```typescript
const DRAFT_TEMPLATES: Record<TriggerType, Record<'en' | 'pl', string[]>> = {
  inactive: {
    pl: [
      'Hej {name}, jak leci? Dawno się nie odzywałeś/aś — daj znać czy wszystko ok z treningami!',
      '{name}, co słychać? Widzę że ostatnio cisza — jakiś problem czy po prostu nawał?',
      'Hej {name}, nie widziałem/am Cię od {n} dni — wszystko gra? Daj znać czy coś zmienić w planie.',
      '{name}, tylko szybki check — jak się czujesz? Masz pytania do programu?',
    ],
    en: [
      'Hey {name}, how\'s it going? Haven\'t seen you in a while — everything ok with training?',
      '{name}, checking in — I noticed it\'s been {n} days. Need any adjustments to the plan?',
      'Hey {name}, just a quick one — how are you feeling? Let me know if you need anything.',
      '{name}, haven\'t heard from you in a bit — everything alright? Happy to adjust anything.',
    ],
  },
  'missed-workout': {
    pl: [
      'Hej {name}, widzę że {context} trening jeszcze nie poszedł — potrzebujesz modyfikacji planu?',
      '{name}, brakuje mi Twojego treningu {context} — wszystko ok? Mogę dostosować jeśli potrzebujesz.',
      'Hej {name}, {context} trening czeka — dasz radę dziś nadrobić czy przesuwamy?',
    ],
    en: [
      'Hey {name}, I see the {context} workout hasn\'t happened yet — need any plan adjustments?',
      '{name}, looks like {context} got missed — everything ok? I can modify if needed.',
      'Hey {name}, the {context} session is still open — can you fit it in today or should we reschedule?',
    ],
  },
  'wellness-decline': {
    pl: [
      'Widzę że ostatnio energia spada — jak się czujesz? Może dostosujemy plan żebyś się nie wypalał/a.',
      '{name}, zauważyłem/am spadek w samopoczuciu — pogadajmy co zmienić żeby było lżej.',
      'Hej {name}, Twoje ostatnie check-iny pokazują spadek energii — chcesz żebyśmy zmodyfikowali obciążenia?',
    ],
    en: [
      'I noticed your energy has been dropping — how are you feeling? Maybe we should adjust the plan.',
      '{name}, your recent check-ins show a dip in wellness — let\'s talk about what to change.',
      'Hey {name}, looks like energy has been trending down — want me to modify the training load?',
    ],
  },
  'program-ending': {
    pl: [
      'Twój program {context} kończy się za {n} dni — chcesz żebyśmy zaplanowali następny blok?',
      '{name}, {context} dobiega końca za {n} dni — mam już pomysł na kolejny etap, pogadamy?',
      'Hej {name}, za {n} dni kończy się {context} — czas planować co dalej!',
    ],
    en: [
      'Your program {context} ends in {n} days — want me to plan the next block?',
      '{name}, {context} wraps up in {n} days — I have ideas for what\'s next, let\'s chat.',
      'Hey {name}, {context} finishes in {n} days — time to plan ahead!',
    ],
  },
  stale: {
    pl: [
      '{name}, dawno nie mieliśmy check-inu — wrzuć krótką aktualizację żebym wiedział/a jak idzie!',
      'Hej {name}, minęło {n} dni od ostatniego check-inu — jak postępy? Daj znać!',
      '{name}, czekam na Twój check-in — nawet krótki update bardzo mi pomoże w planowaniu.',
    ],
    en: [
      '{name}, it\'s been a while since your last check-in — drop me a quick update!',
      'Hey {name}, {n} days since your last check-in — how\'s progress? Let me know!',
      '{name}, I\'m waiting on your check-in — even a quick update helps me plan better.',
    ],
  },
  'new-client': {
    pl: [
      'Hej {name}, jak pierwsze dni? Pamiętaj — na początku chodzi o regularność, nie o perfekcję. Pisz jak masz pytania!',
      '{name}, witaj na pokładzie! Jak wrażenia po pierwszych treningach? Jestem tu jeśli coś jest niejasne.',
      'Hej {name}, pierwszy tydzień za Tobą — jak się czujesz? Daj znać jak mogę pomóc!',
    ],
    en: [
      'Hey {name}, how are the first few days going? Remember — consistency over perfection. Hit me up with any questions!',
      '{name}, welcome aboard! How are the first workouts feeling? I\'m here if anything\'s unclear.',
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
      '{name}, it\'s been a while since your pause — ready to get back? I can prepare an easier restart plan.',
      'Hey {name}, haven\'t seen you in a bit — ready to come back? I have a gentle restart plan in mind.',
      '{name}, thinking of you — whenever you\'re ready to return, let me know. I\'ll prep something easy to start.',
    ],
  },
  pr: {
    pl: [
      'BRAWO! {context} — to +{n}kg! Lecisz!',
      '{name}, nowy rekord w {context}! +{n}kg — robisz postępy!',
      'Hej {name}, {context} — widzisz te rezultaty? Tak się robi!',
    ],
    en: [
      'AMAZING! {context} — that\'s +{n}kg! You\'re crushing it!',
      '{name}, new PR on {context}! +{n}kg — progress is real!',
      'Hey {name}, {context} — see those results? That\'s how it\'s done!',
    ],
  },
  streak: {
    pl: [
      '{n} dni bez przerwy — to jest konsekwencja, {name}! Tak się buduje formę.',
      '{name}, {n}-dniowy streak! To jest commitment — widzę i doceniam.',
      'Hej {name}, {n} dni z rzędu — maszyna! Nie zwalniaj!',
    ],
    en: [
      '{n} days straight — that\'s consistency, {name}! This is how you build results.',
      '{name}, {n}-day streak! That\'s real commitment — I see it and I appreciate it.',
      'Hey {name}, {n} days in a row — you\'re a machine! Keep it up!',
    ],
  },
  'progress-milestone': {
    pl: [
      'Właśnie przekroczyłeś/aś {n}% celu — widzisz te postępy? Dalej tak!',
      '{name}, {n}% celu za Tobą! Momentum jest, nie zwalniaj!',
      'Hej {name}, {n}% drogi przebyte — to jest progres którego szukaliśmy!',
    ],
    en: [
      'You just crossed {n}% of your goal — see that progress? Keep going!',
      '{name}, {n}% done! Momentum is building, don\'t slow down!',
      'Hey {name}, {n}% of the way there — this is the progress we\'ve been working toward!',
    ],
  },
};

// Deterministic variant selection — same client sees same variant per day,
// different clients see different variants
function pickVariant(templates: string[], clientId: string): string {
  const dayKey = new Date().toISOString().slice(0, 10);
  const hash = simpleHash(clientId + dayKey);
  return templates[hash % templates.length];
}

function getDraftText(
  trigger: SmartCoachTrigger,
  lang: 'en' | 'pl',
): string | null
```

**Why templates with variants:**
- Zero API cost — works even without anthropic-proxy
- Instant — no loading state, no failed API calls
- Multiple variants prevent "wall of identical messages" when coach has 10+ triggers
- Deterministic selection — same client sees same text on refresh, different text next day
- Phase 2 adds AI generation for coaches who want fully personalized drafts

### Phase 2: AI Draft Generation (post-MVP)

When coach enables "AI Drafts" in settings:
- Template is replaced by `anthropic-proxy` call
- Same prompt structure as existing AI Briefing
- Tone preset (motivational/technical/friendly/formal) + custom phrases
- ~200 tokens per draft, ~$0.02/day for 15 drafts with Haiku
- Fallback: if API fails, show template draft instead

---

## 7. UI — Smart Coach Widget

### New files:
- `src/components/SmartCoachWidget.tsx` — main widget (collapsed/expanded)
- `src/components/SmartCoachCard.tsx` — individual trigger card

### Collapsed State (default)

```
┌──────────────────────────────────────────────────────┐
│  ⚡ Smart Coach              3 urgent · 5 this week  │
│                                                       │
│  🔴 Marcus Chen — check-in unreviewed (3 days)       │
│  🔴 David Park — no activity in 6 days        [Send] │
│  🟡 Jake Morrison — program ends in 5 days           │
│                                                       │
│                          [Show all 12 ▾]              │
└──────────────────────────────────────────────────────┘
```

**Collapsed rules:**
- Shows header with count badges (urgent count + this week count)
- Shows top 3 triggers max (highest priority first)
- Each card is single-line: icon + client name + short text + optional [Send] button
- "Show all N ▾" button to expand
- If zero triggers: "All caught up — your clients are on track ✓" (single line, no expand)

### Expanded State

```
┌──────────────────────────────────────────────────────┐
│  ⚡ Smart Coach              3 urgent · 5 this week  │
│                                                [▴]   │
│                                                       │
│  ─── URGENT ──────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ⚠️  Marcus Chen                                  │ │
│  │ Check-in from Monday unreviewed — 3 days        │ │
│  │                        [Review check-in →]      │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 💤  David Park                                   │ │
│  │ No activity in 6 days — reach out               │ │
│  │ ┌─────────────────────────────────────────────┐ │ │
│  │ │ "Hej David, jak leci? Dawno się nie          │ │ │
│  │ │  odzywałeś — daj znać czy wszystko ok..."    │ │ │
│  │ └─────────────────────────────────────────────┘ │ │
│  │           [✏️ Edit]  [✅ Send]  [✕ Dismiss]     │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📉  David Park                                   │ │
│  │ Energy: 7→5→3 last 3 check-ins — burnout risk  │ │
│  │ ┌─────────────────────────────────────────────┐ │ │
│  │ │ "Widzę że energia spada — jak się czujesz?   │ │ │
│  │ │  Może dostosujemy plan..."                    │ │ │
│  │ └─────────────────────────────────────────────┘ │ │
│  │           [✏️ Edit]  [✅ Send]  [✕ Dismiss]     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ─── THIS WEEK ───────────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📋  Jake Morrison                                │ │
│  │ 'Powerlifting Peak' ends in 5 days              │ │
│  │ ┌─────────────────────────────────────────────┐ │ │
│  │ │ "Twój program Powerlifting Peak kończy się   │ │ │
│  │ │  za 5 dni — zaplanujmy następny blok?"       │ │ │
│  │ └─────────────────────────────────────────────┘ │ │
│  │           [✏️ Edit]  [✅ Send]  [✕ Dismiss]     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ─── WINS ────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🏆  Jake Morrison                                │ │
│  │ New deadlift PR: 220kg (+10kg)                  │ │
│  │ ┌─────────────────────────────────────────────┐ │ │
│  │ │ "BRAWO! 220kg w deadlift — to +10kg! Lecisz!"│ │ │
│  │ └─────────────────────────────────────────────┘ │ │
│  │           [✏️ Edit]  [✅ Send]  [✕ Dismiss]     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│                                        [Collapse ▴]  │
└──────────────────────────────────────────────────────┘
```

### Card Behavior

| Element | Behavior |
|---|---|
| **Client name** | Click → `onViewClient(clientId)` — navigates to client detail |
| **Draft text** | Shown inline below insight text. Editable on click (turns into textarea) |
| **Edit button** | Focuses textarea with draft text for editing |
| **Send button** | Calls `onSendMessage(msg)` with draft text → message appears in client's chat. Card animates out. |
| **Dismiss button** | Saves trigger ID + expiry to localStorage. Card fades out. |
| **Review check-in →** | For `checkin-overdue`: navigates to check-in review page |

### Visual Design (matching dark luxe theme)

- **GlassCard container** — same as existing cards, no special treatment
- **Priority color bar** — 3px left border (red/amber/green matching category)
- **Client avatar** — existing `getAvatarColor()` + `getInitials()` circle
- **Draft block** — slightly darker inner card, monospace-ish feel, 14px font
- **Action buttons** — ghost buttons, accent color on hover
- **Collapsed cards** — single line with truncated text, no draft preview

### Mobile Behavior

- Widget is **collapsed by default** on mobile
- Badge count always visible in header
- Expanded: cards stack vertically, full width
- Draft text uses full-width textarea on edit
- Swipe-to-dismiss on individual cards (nice-to-have, not MVP)

### Empty State

- Zero triggers: single-line widget, no expand button
- Text: "All caught up — your clients are on track" (EN) / "Wszystko ogarnięte — Twoi klienci są na dobrej drodze" (PL)

---

## 8. Placement on Overview Page

### Changes to OverviewPage layout:

```
BEFORE:                              AFTER:
┌──────────────────────────┐         ┌──────────────────────────┐
│ Greeting + Date          │         │ Greeting + Date          │
│ Daily Quote              │         │ Daily Quote              │
│ 4 Stat Cards             │         │ 4 Stat Cards             │
│ AI Dashboard Summary     │         │ ⚡ Smart Coach Widget    │  ← NEW (collapsible)
│ Revenue Chart            │         │ AI Dashboard Summary     │
│ At-Risk + Top Performers │         │ Revenue Chart            │
│ Recent Messages          │         │ Top Performers           │  ← At-Risk REMOVED (absorbed by Smart Coach)
└──────────────────────────┘         │ Recent Messages          │
                                     └──────────────────────────┘
```

**What changes:**
- Smart Coach Widget goes after stat cards (highest-value position)
- **At-Risk Clients card is REMOVED** — its logic is absorbed into trigger engine (inactive, missed workout, paused). No duplication.
- Top Performers stays — it serves a different purpose (celebration, not alerting)
- AI Dashboard Summary stays below widget — still useful for prose overview
- Recent Messages stays — different function (reading messages vs. sending)

---

## 9. State Management

```typescript
// In OverviewPage or dedicated hook useSmartCoach.ts

// Trigger computation (memoized)
const triggers = useMemo(
  () => generateTriggers(clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang),
  [clients, messages, checkIns, invoices, workoutLogs, programs, dismissedIds, lang]
);

// Widget state
const [isExpanded, setIsExpanded] = useState(false);
const [dismissedIds, setDismissedIds] = useState<string[]>(() =>
  loadDismissed() // from localStorage, filtering expired entries
);
const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});

// Actions
const handleDismiss = (triggerId: string) => { /* add to localStorage with 24h/72h expiry */ };
const handleSend = (trigger: SmartCoachTrigger) => {
  const text = editedTexts[trigger.id] || trigger.draftText;
  if (!text || !trigger.clientId) return;

  const msg: Message = {
    id: crypto.randomUUID(),
    clientId: trigger.clientId,
    clientName: trigger.clientName || '',
    clientAvatar: '',
    text,
    timestamp: new Date().toISOString(),
    isRead: true,
    isFromCoach: true,
    deliveryStatus: 'sent',
  };
  onSendMessage(msg);      // existing handler from App.tsx — optimistic + Supabase
  handleDismiss(trigger.id); // auto-dismiss after sending
};
```

**No new Supabase tables for MVP.** Everything runs on existing data + localStorage.

---

## 10. Files to Create

| File | Type | Purpose |
|---|---|---|
| `src/utils/smart-coach-engine.ts` | Logic | Trigger detection — pure function, all rules |
| `src/utils/smart-coach-drafts.ts` | Logic | Template-based draft text generation |
| `src/components/SmartCoachWidget.tsx` | UI | Collapsible widget with priority sections |
| `src/components/SmartCoachCard.tsx` | UI | Individual trigger card (insight + draft + actions) |

**4 files total.** No hooks file needed for MVP — state lives in OverviewPage or a simple `useSmartCoach` custom hook if it gets unwieldy.

## 11. Files to Modify

| File | Change |
|---|---|
| `src/components/OverviewPage.tsx` | Add `<SmartCoachWidget>`, remove At-Risk Clients section |
| `src/i18n/en.ts` | Add Smart Coach translations |
| `src/i18n/pl.ts` | Add Smart Coach translations |

**3 files modified.** No changes to App.tsx, types.ts, or Supabase schema for MVP.

---

## 12. Implementation Steps

### Phase 1: MVP (1 session)

**Step 1: Trigger engine** (`smart-coach-engine.ts`)
- Start with 5 core triggers: `inactive`, `checkin-overdue`, `missed-workout`, `streak`, `pr`
- Pure function, deterministic, i18n ready
- Include deduplication and per-client rate limiting

**Step 2: Draft templates** (`smart-coach-drafts.ts`)
- Template strings for triggers that have drafts (inactive, missed-workout, streak, pr)
- Simple `{name}`, `{n}`, `{context}` interpolation
- PL + EN versions

**Step 3: Widget UI** (`SmartCoachWidget.tsx` + `SmartCoachCard.tsx`)
- Collapsed/expanded toggle
- Priority grouping (HIGH/MEDIUM/LOW mapped to URGENT/THIS WEEK/WINS)
- Send/Edit/Dismiss actions on cards with drafts
- View client link on all cards

**Step 4: Integration**
- Add widget to OverviewPage after stat cards
- Wire `onSendMessage` and `onViewClient` callbacks
- Remove At-Risk Clients card (logic absorbed)
- Add i18n strings

### Phase 2: Full Triggers (next session)

- Add remaining triggers: `wellness-decline`, `msg-unanswered`, `invoice-overdue`, `invoice-due`, `program-ending`, `stale`, `new-client`, `paused-long`, `progress-milestone`, `wellness-up`, `all-clear`
- Refine thresholds based on real data testing
- Mobile polish + animations (framer-motion staggered entry)

### Phase 3: AI Drafts (future)

- Add coach settings: tone preset + custom phrases
- Call `anthropic-proxy` for AI-generated drafts instead of templates
- Fallback to templates when API is unavailable
- Cache drafts in sessionStorage keyed by trigger ID
- Settings stored in Supabase (new `coach_autopilot_settings` table)

### Phase 4: Connections (future)

- "Draft message →" link from insights to pre-filled chat
- Dismiss/snooze with custom duration
- Smart grouping (bundle multiple triggers for same client)
- Analytics: track send/edit/skip rates per trigger type

---

## 13. What This Does NOT Include (MVP)

| Excluded | Reason |
|---|---|
| AI-generated drafts | Templates are sufficient for MVP; API adds cost and failure modes |
| Auto-send without review | Too risky before coach builds trust |
| Server-side cron triggers | Client-side from loaded data is sufficient |
| Settings/configuration UI | Hardcoded thresholds, hardcoded tone |
| "Send All" batch action | Too easy to send without reading; individual review is safer |
| Push notifications | Separate feature, doesn't block core value |
| Learning loop from edits | Requires ML pipeline, overkill for MVP |
| Weight plateau detection | Requires 4+ data points most early clients won't have |
| Revenue growth insight | Already visible in stat cards — not actionable |
| Anniversary trigger | Nice-to-have, zero MVP value |
| Custom thresholds UI | Hardcode sensible defaults, iterate based on feedback |
| Supabase schema changes | Everything runs on existing tables + localStorage |

---

## 14. Edge Cases & Considerations

### Data Quality
- **Sparse check-ins:** Wellness decline requires 3+ check-ins. If client has <3, skip that trigger. Don't generate insight from insufficient data.
- **No workout logs:** If client has no assigned program, `missed-workout` trigger doesn't fire (they might be nutrition-only clients).
- **Stale `lastActive`:** If `lastActive` isn't updated reliably, use `max(lastWorkoutLog.date, lastMessage.timestamp, lastCheckIn.date)` as proxy.

### Scale
- **5 clients:** Widget shows 2-4 triggers. Looks clean, not empty (LOW priority wins ensure there's always something positive).
- **30 clients:** Widget shows 3 items collapsed, ~15-20 expanded. Scrollable, manageable.
- **100 clients:** Per-client cap (max 3 triggers per client) limits total to ~50-60 max. Priority sorting ensures most urgent are visible first. Collapsed view keeps it scannable.

### Performance
- `generateTriggers()` iterates clients × rules. With 100 clients × 15 rules = 1500 checks. Each check is O(1) or O(n) on small arrays (check-ins per client). Total: <50ms on any modern device. No performance concern.
- Memoized with `useMemo` — only recomputes when data changes.

### False Positives
- **Coach communicated off-platform:** "Dismiss" button handles this. Trigger comes back after 24h only if still true.
- **Client on vacation:** Coach can dismiss. Future: "Snooze 7 days" option.
- **Weekend inactivity:** Consider adding day-of-week awareness in Phase 2 (don't flag Friday→Monday gap as 3 days inactive on Monday morning).

---

## 15. Interaction with Existing Components

| Existing Component | What Happens |
|---|---|
| **At-Risk Clients card** | REMOVED — absorbed by HIGH priority triggers |
| **Top Performers card** | KEPT — serves celebration purpose, no overlap with triggers |
| **AI Dashboard Summary** | KEPT — moves below Smart Coach Widget. Still useful for prose overview. |
| **Recent Messages** | KEPT — reading ≠ sending. No overlap. |
| **Stat Cards** | KEPT — aggregate numbers, Smart Coach is per-client detail. |
| **Revenue Chart** | KEPT — no overlap. |

---

## 16. Summary

| Aspect | Detail |
|--------|--------|
| **New files** | 4 (engine + drafts + widget + card) |
| **Modified files** | 3 (OverviewPage + i18n EN/PL) |
| **API calls** | None in MVP (template drafts) |
| **New dependencies** | None (uses existing lucide, framer-motion, GlassCard) |
| **New Supabase tables** | None in MVP |
| **Data needed** | Already available in OverviewPage props |
| **MVP effort** | 1 session — 5 triggers, template drafts, collapsible widget |
| **Full scope effort** | 1-2 weeks — all triggers, AI drafts, settings, polish |

**One engine. One widget. Inform and act in the same place.**
