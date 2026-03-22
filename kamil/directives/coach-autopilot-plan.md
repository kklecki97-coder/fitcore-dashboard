# Coach Autopilot — Implementation Plan

> **Status:** Draft — awaiting review
> **Author:** Kamil (kklecki97-coder)
> **Date:** 2026-03-22
> **Estimated effort:** 2-3 weeks (MVP)

---

## 1. What Is Coach Autopilot?

AI that observes client patterns and proactively generates personalized messages on behalf of the coach — motivations, corrections, alerts — in the coach's communication style.

**The problem:** A coach with 30+ clients can't message each one daily. Clients who don't get attention for 3-4 days lose motivation and churn. This is the #1 reason for churn in online coaching — the client feels ignored. The coach knows they should write, but doesn't have time. So they send generic "good job!" or nothing at all.

**The solution:** Every morning the coach opens their dashboard and sees 15 ready-to-send messages for clients who need attention. They review, click Send, and close the laptop. What used to take 2 hours takes 30 seconds. Clients think the coach spends hours on them.

---

## 2. What We Already Have (Foundation)

Before building anything new, here's what exists in the codebase that Autopilot builds on:

| Existing Element | Location | What It Gives Autopilot |
|---|---|---|
| Engagement scoring (0-100) | `utils/engagement.ts` | Algorithm with breakdown: workouts 45%, check-ins 25%, streak 20%, messages 10% — ready-made "client is dropping" trigger |
| Check-in data | Supabase `check_ins` table | mood, energy, stress, sleep, steps, nutrition — ready-made wellness triggers |
| Workout logs + set logs | Supabase `workout_logs`, `workout_set_logs` | Missed workouts, PRs, streak breaks — ready-made triggers |
| Client metrics | Supabase `client_metrics` | Weight/BF/strength time-series — ready-made trends |
| Chat system | `MessagesPage.tsx` + `messages` table | Existing send mechanism + message templates + delivery status |
| AI proxy | Edge Function `anthropic-proxy` | Already works for AI Briefing and AI Program Creator — reuse for draft generation |
| i18n | `i18n/en.ts` / `i18n/pl.ts` | PL/EN support ready |
| Engagement insights | `generateEngagementInsight()` + `getSuggestedAction()` | Already generates one-liner recommendations per client |

**Conclusion:** ~60% of the data infrastructure already exists. We're not building from scratch.

---

## 3. Architecture — 3 Layers

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: TRIGGER ENGINE                            │
│  "Who needs attention and why?"                     │
│                                                     │
│  Input:  workout_logs, check_ins, client_metrics,   │
│          messages, engagement scores                 │
│  Output: AutopilotTrigger[]                         │
│  Runs:   Client-side on OverviewPage render         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  LAYER 2: DRAFT GENERATOR                           │
│  "What to say to this client?"                      │
│                                                     │
│  Input:  trigger + client history + coach tone       │
│  Output: MessageDraft (text + metadata)              │
│  Calls:  anthropic-proxy edge function               │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  LAYER 3: AUTOPILOT QUEUE UI                        │
│  "Coach reviews and sends"                          │
│                                                     │
│  Approve  → send via existing handleSendMessage      │
│  Edit     → modify text → send                       │
│  Skip     → dismiss                                  │
│  Send All → batch approve (with safety checks)       │
└─────────────────────────────────────────────────────┘
```

---

## 4. Layer 1 — Trigger Engine

### New file: `utils/autopilot-triggers.ts`

### Types

```typescript
type TriggerType =
  | 'missed_workout'      // No workout logged for >48h
  | 'personal_record'     // PR in any lift
  | 'checkin_decline'     // Energy/mood/sleep declining 2+ weeks
  | 'checkin_positive'    // All wellness metrics trending up
  | 'inactive'            // No activity >72h (no logs, messages, or check-ins)
  | 'streak_milestone'    // 7, 14, 21, 30 day streak
  | 'engagement_drop'     // Score dropped >15 points in a week
  | 'payment_upcoming'    // Invoice due within 5 days
  | 'anniversary';        // 1/3/6/12 month collaboration milestone

type TriggerPriority = 'high' | 'medium' | 'low';

interface AutopilotTrigger {
  id: string;                    // deterministic: `${clientId}-${type}-${dateKey}`
  clientId: string;
  type: TriggerType;
  priority: TriggerPriority;
  context: Record<string, any>;  // trigger-specific data
  createdAt: string;
}
```

### Trigger Logic

All triggers are computed client-side from data already loaded in `App.tsx`:

| Trigger | Data Source | Condition | Priority |
|---|---|---|---|
| `missed_workout` | `workout_logs` | Last completed log >48h ago AND client has assigned program | **high** |
| `personal_record` | `workout_set_logs` | Max weight for exercise > previous max | medium |
| `checkin_decline` | `check_ins` | energy OR mood OR sleep declining 2+ consecutive check-ins | **high** |
| `checkin_positive` | `check_ins` | All wellness metrics up vs previous check-in | low |
| `inactive` | `workout_logs` + `messages` | Zero activity >72h (no workout, no message sent by client) | **high** |
| `streak_milestone` | `Client.streak` | streak === 7, 14, 21, or 30 | low |
| `engagement_drop` | `calculateEngagement()` | Score dropped >15 points vs 2 weeks ago | **high** |
| `payment_upcoming` | `invoices` | status=pending, dueDate within 5 days | medium |
| `anniversary` | `Client.startDate` | Exactly 1/3/6/12 months from start date | low |

### Deduplication

Each trigger generates a deterministic ID: `${clientId}-${type}-${dateKey}` (dateKey = YYYY-MM-DD).

If a draft for this ID was already approved or skipped, it won't appear again. Dismissed IDs stored in `localStorage('fitcore-autopilot-dismissed')`.

---

## 5. Layer 2 — Draft Generator

### New file: `utils/autopilot-drafts.ts`

### Tone Presets (instead of style cloning)

Style cloning from chat history is too complex for MVP and unreliable with little data. Instead, the coach selects a **Tone Preset** + adds custom phrases:

```typescript
type CoachTone = 'motivational' | 'technical' | 'friendly' | 'formal';

interface CoachAutopilotSettings {
  enabled: boolean;
  tone: CoachTone;
  language: 'pl' | 'en';
  customPhrases: string[];      // e.g., "Dawaj gaz!", "Keep pushing!"
  maxDraftsPerDay: number;      // default: 20
  autoSendLowPriority: boolean; // auto-approve positive/milestone messages
}
```

**Why this is better for MVP:**
- Works from day 1 (no training data needed)
- Coach has explicit control over voice
- Custom phrases add personalization without ML
- Can evolve into full style cloning in Phase 2

### Prompt Template Structure

Each trigger type has a dedicated prompt. Example for `missed_workout`:

```
You are writing a message from a fitness coach to their client.
Tone: {motivational|technical|friendly|formal}
Language: {PL|EN}
Coach's phrases to naturally include: {customPhrases}

Context:
- Client name: Marek
- Last workout: 3 days ago (Wednesday, Leg Day)
- Current program: PPL 4x/week
- Recent engagement score: 58/100 (declining from 72)
- Last check-in mood: 3/5

Write a short (2-3 sentences) personal message checking in on the client.
Do NOT sound like a bot or automated message.
Do NOT use "Dear" or overly formal greetings.
Sound like a {tone} coach who knows this client personally.
Reference specific details from the context.
```

### API Integration

- Calls existing `anthropic-proxy` Supabase Edge Function (same as AI Briefing)
- ~200 tokens per draft = ~$0.02/day for 15 drafts with Claude Haiku
- Batch mode: group triggers by priority, generate in parallel (max 5 concurrent calls)
- Cache drafts in `sessionStorage` keyed by trigger ID

### Draft Output

```typescript
interface MessageDraft {
  id: string;              // matches trigger ID
  triggerId: string;
  clientId: string;
  clientName: string;
  triggerType: TriggerType;
  priority: TriggerPriority;
  text: string;            // generated message
  context: string;         // human-readable trigger reason (e.g., "Missed workout — 3 days")
  generatedAt: string;
  status: 'pending' | 'approved' | 'edited' | 'skipped';
}
```

---

## 6. Layer 3 — Autopilot Queue UI

### New components: `AutopilotQueue.tsx` + `AutopilotDraftCard.tsx`

### Location

Widget on `OverviewPage.tsx` — top of page, before the stats grid. Collapsible, with badge showing draft count.

### UI Layout

```
┌──────────────────────────────────────────────────────┐
│  Autopilot Queue                          15 drafts  │
│ ─────────────────────────────────────────────────────│
│                                                       │
│  HIGH PRIORITY                                        │
│ ┌───────────────────────────────────────────────────┐│
│ │  Marek K.            Missed workout (3 days)      ││
│ │                                                   ││
│ │  "Hej Marek, wszystko ok? Widzę że środowy        ││
│ │   trening jeszcze nie poszedł — daj znać czy      ││
│ │   potrzebujesz modyfikacji planu."                 ││
│ │                                                   ││
│ │                      [✅ Send]  [✏️ Edit]  [❌ Skip]││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│  MEDIUM                                               │
│ ┌───────────────────────────────────────────────────┐│
│ │  Ania W.             Personal Record (Squat 85kg) ││
│ │                                                   ││
│ │  "BRAWO! 85kg w przysiadzie — to +5kg w 2         ││
│ │   tygodnie. Lecisz!"                              ││
│ │                                                   ││
│ │                      [✅ Send]  [✏️ Edit]  [❌ Skip]││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│  LOW                                                  │
│ ┌───────────────────────────────────────────────────┐│
│ │  Tomek R.            7-day streak milestone        ││
│ │  "Tydzień bez przerwy — to jest konsekwencja..."  ││
│ │                      [✅ Send]  [✏️ Edit]  [❌ Skip]││
│ └───────────────────────────────────────────────────┘│
│                                                       │
│  [Send All Approved ▸]              [Generate More ↻] │
└──────────────────────────────────────────────────────┘
```

### Interactions

| Action | Behavior |
|---|---|
| **Send** | Calls existing `onSendMessage()` → insert to `messages` table → appears in client's chat |
| **Edit** | Opens inline textarea with draft text, after editing → Send |
| **Skip** | Saves trigger ID to localStorage dismissed list, card fades out |
| **Send All** | Sends MEDIUM + LOW only. HIGH priority always requires individual review. Confirmation dialog: "Send 12 messages to 12 clients?" Max 10 per batch. |
| **Generate More** | Re-runs trigger scan + draft generation for clients not yet covered |

### State Management

- Drafts stored in React state (ephemeral, not persisted to Supabase)
- Dismissed triggers in `localStorage('fitcore-autopilot-dismissed')`
- Autopilot settings in Supabase table `coach_autopilot_settings`
- On page reload: triggers re-computed, dismissed ones filtered out, drafts regenerated for remaining

---

## 7. Settings

### New section in SettingsPage.tsx

Under a new "Autopilot" tab/section:

| Setting | UI Element | Default |
|---|---|---|
| Enable Autopilot | Toggle switch | OFF |
| Tone | Radio group with 4 options + preview text | friendly |
| Custom Phrases | Tag/chip input | empty |
| Max Drafts Per Day | Slider (5-50) | 20 |
| Auto-Send Low Priority | Toggle (sends milestone/positive msgs without review) | OFF |

### New Supabase Table

```sql
CREATE TABLE coach_autopilot_settings (
  coach_id    UUID PRIMARY KEY REFERENCES auth.users(id),
  enabled     BOOLEAN DEFAULT false,
  tone        TEXT DEFAULT 'friendly'
                CHECK (tone IN ('motivational', 'technical', 'friendly', 'formal')),
  custom_phrases TEXT[] DEFAULT '{}',
  max_drafts_per_day INT DEFAULT 20,
  auto_send_low_priority BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coach_autopilot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own settings"
  ON coach_autopilot_settings
  FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);
```

---

## 8. Files to Create

| File | Type | Purpose |
|---|---|---|
| `src/utils/autopilot-types.ts` | Types | Shared TypeScript interfaces for autopilot |
| `src/utils/autopilot-triggers.ts` | Logic | Trigger detection engine — scans all client data |
| `src/utils/autopilot-drafts.ts` | Logic | Prompt building + anthropic-proxy API call + draft formatting |
| `src/components/AutopilotQueue.tsx` | UI | Queue widget with priority sections |
| `src/components/AutopilotDraftCard.tsx` | UI | Single draft card (send/edit/skip actions) |
| `src/hooks/useAutopilot.ts` | Hook | Orchestrates: load settings → compute triggers → generate drafts → manage state |

All files go in `kamil/execution/dashboard/src/`.

## 9. Files to Modify

| File | Change |
|---|---|
| `src/components/OverviewPage.tsx` | Add `<AutopilotQueue>` widget at top of page |
| `src/components/SettingsPage.tsx` | Add Autopilot settings section |
| `src/App.tsx` | Load autopilot settings from Supabase, pass to OverviewPage |
| `src/types.ts` | Add autopilot-related types (or import from autopilot-types) |
| `src/i18n/en.ts` | English translations for autopilot UI |
| `src/i18n/pl.ts` | Polish translations for autopilot UI |

---

## 10. What We're NOT Building in MVP

| Feature | Why Not Now |
|---|---|
| Style cloning from chat history | Not enough data on day 1; tone presets are sufficient and ship faster |
| Learning loop from coach edits | Requires ML pipeline; overkill for MVP — revisit after 100+ edits collected |
| Full auto-send without review | Too risky before coach builds trust in the system |
| Server-side cron triggers | Client-side calculation from already-loaded data is sufficient; add cron when we need triggers while coach is offline |
| Push notifications for new drafts | Separate feature, doesn't block Autopilot value |
| Draft confidence score | Phase 2 — requires edit-rate data to calibrate |
| Multi-channel (email, SMS) | Chat-only for now; channels can be added later |

---

## 11. Build Timeline

### Week 1 — Engine

| Day | Task |
|---|---|
| 1-2 | `autopilot-types.ts` + `autopilot-triggers.ts` + unit tests for each trigger |
| 3-4 | `autopilot-drafts.ts` — prompt templates for all 9 trigger types + anthropic-proxy integration |
| 5 | `useAutopilot.ts` hook — orchestration: settings → triggers → drafts → state |

### Week 2 — UI + Integration

| Day | Task |
|---|---|
| 1-2 | `AutopilotDraftCard.tsx` + `AutopilotQueue.tsx` — full UI with animations |
| 3 | Integration with `OverviewPage.tsx` + wire up `onSendMessage` |
| 4 | Settings section in `SettingsPage.tsx` + Supabase table migration |
| 5 | i18n translations (PL/EN) + UI polish + edge cases |

### Week 3 — Testing + Buffer

| Day | Task |
|---|---|
| 1-2 | End-to-end testing with real Supabase data |
| 3 | Bug fixes + UX tweaks based on testing |
| 4-5 | Buffer for unexpected issues |

---

## 12. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI generates inappropriate draft (e.g., congratulating injured client) | Medium | High | HIGH priority triggers always require manual review; never auto-send |
| Coach clicks "Send All" without reading | Medium | Medium | Send All excludes HIGH priority; max 10 per batch; confirmation dialog |
| Too many triggers for coach with 50+ clients | Low | Medium | `maxDraftsPerDay` limit; priority sorting; pagination in queue |
| anthropic-proxy rate limits or latency | Low | Medium | Batch generation; sessionStorage cache; graceful fallback to template messages |
| Client discovers messages are AI-generated | Low | High | Drafts include real client data context; coach reviews before send; positioned as "coach's assistant" not "replacement" |
| Low-quality drafts reduce coach trust | Medium | Medium | Start with Autopilot OFF by default; coach explicitly opts in; easy to disable |

---

## 13. Success Metrics

After launch, track these to validate the feature:

| Metric | How to Measure | Target |
|---|---|---|
| Adoption rate | % of coaches who enable Autopilot | >50% within 30 days |
| Approval rate | % of drafts sent (not skipped) | >60% |
| Edit rate | % of drafts edited before sending | <40% (lower = better drafts) |
| Messages sent per coach per day | Before vs. after Autopilot | 2-3x increase |
| Client response rate | % of autopilot messages that get a reply | >40% |
| Time spent on messaging | Self-reported or session time on Messages page | 50% reduction |

---

## 14. Phase 2 — Future Enhancements

After MVP is live and validated:

1. **Style learning** — Analyze coach's sent messages to fine-tune tone beyond presets
2. **Confidence scoring** — Rate each draft 1-5 based on historical edit/skip rates for similar triggers
3. **Auto-send with confidence threshold** — Only auto-send drafts with confidence >4/5
4. **Scheduled delivery** — Coach sets preferred send time (e.g., 8am) and drafts queue up
5. **Multi-channel** — Extend to email and SMS (requires integration work)
6. **Smart batching** — Don't message same client twice in 24h; spread messages throughout the day
7. **Analytics dashboard** — Track which trigger types get best client response rates
8. **Client sentiment analysis** — Analyze client replies to improve future drafts

---

## 15. Summary

Coach Autopilot is a 3-layer system (triggers → drafts → queue) that:

- **Detects** which clients need attention using data we already collect
- **Generates** personalized message drafts using AI in the coach's chosen tone
- **Presents** a review queue where the coach approves, edits, or skips

It turns 2 hours of daily messaging into 30 seconds of review. The coach stays in control, the client feels seen, and retention improves.

**We build on top of existing infrastructure** — engagement scoring, check-in data, workout logs, chat system, and the anthropic-proxy edge function are all already in place.

**MVP scope is intentionally limited** — no style cloning, no auto-send, no cron jobs. Ship the core loop fast, validate with real coaches, then iterate.
