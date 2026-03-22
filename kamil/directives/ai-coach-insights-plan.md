# AI Coach Insights Panel — Implementation Plan

> **Goal**: Replace the current generic AI Dashboard Summary with an actionable, data-driven insights panel that tells the coach exactly what needs attention and why — no external API needed, pure client-side logic.

---

## 1. What It Is

An **"AI Coach Insights"** panel on the Overview page that analyzes all available client data and generates **prioritized, actionable insights** — grouped by urgency. The coach opens the dashboard in the morning and immediately knows:
- What's urgent (act now)
- What's trending (act soon)
- What's going well (celebrate)

This is NOT a chatbot or generic summary. It's a **smart alert system** that reads patterns humans would miss when juggling 20-50 clients.

---

## 2. Current State (What We Have)

### Existing AI Summary (`useAIBriefing` hook)
- Calls Supabase edge function → Anthropic API
- Generates a 3-5 sentence prose briefing
- Falls back to 4 bullet stats when API is unavailable
- Cached in sessionStorage by data hash

### Available Data (already passed to OverviewPage)
| Data | Interface | Key Fields for Insights |
|------|-----------|------------------------|
| `clients[]` | Client | status, lastActive, progress, streak, nextCheckIn, metrics (weight[], bodyFat[], lifts[]), goals, plan, monthlyRate |
| `messages[]` | Message | isRead, isFromCoach, timestamp, clientId |
| `checkIns[]` | CheckIn | reviewStatus, mood, energy, stress, sleepHours, weight, bodyFat, nutritionScore, steps, date |
| `invoices[]` | Invoice | status (paid/pending/overdue), dueDate, amount |
| `workoutLogs[]` | WorkoutLog | clientId, date, completed |
| `programs[]` | WorkoutProgram | status, durationWeeks, clientIds, createdAt |

---

## 3. Insight Categories & Triggers

### Category A: URGENT (Red — act today)
| Insight | Trigger Logic | Example Output |
|---------|---------------|----------------|
| **Overdue check-in not reviewed** | `checkIn.reviewStatus === 'pending'` older than 48h | "Marcus Chen's check-in from Monday is still unreviewed — 3 days waiting" |
| **Client hasn't been active >5 days** | `lastActive` diff > 5 days AND status === 'active' | "David Park hasn't logged anything in 6 days — reach out before he goes silent" |
| **Overdue invoice** | `invoice.status === 'overdue'` | "Lisa Thompson has an overdue invoice ($199) — due 5 days ago" |
| **Unanswered client message >48h** | Client sent message, no coach reply within 48h | "Sarah Williams messaged 3 days ago — no reply yet" |
| **Declining wellness trend** | Last 3 check-ins show energy OR mood dropping consistently | "David Park: energy dropped from 7→5→3 over last 3 check-ins — possible burnout" |

### Category B: ATTENTION (Amber — act this week)
| Insight | Trigger Logic | Example Output |
|---------|---------------|----------------|
| **Program ending soon** | Active program with `durationWeeks` completing in ≤7 days | "Jake Morrison's 'Powerlifting Peak' ends in 5 days — prepare next block" |
| **Stale client (no progress update)** | Active client, last check-in >14 days ago | "Tom Bradley hasn't checked in for 16 days — schedule a check-in" |
| **Weight plateau detected** | Last 4+ weight entries within ±0.5kg range | "Aisha Patel's weight has been flat at 68kg for 4 weeks — review nutrition plan" |
| **New client first week** | Client `startDate` within last 7 days | "Emma Rodriguez is in her first week — send a welcome check-in to set expectations" |
| **Paused client re-engagement** | Status === 'paused' for >14 days | "Lisa Thompson has been paused for 3 weeks — worth a re-engagement message?" |
| **Pending invoices approaching due** | `invoice.status === 'pending'` AND dueDate within 3 days | "Tom Bradley's invoice ($199) is due in 2 days" |

### Category C: WINS (Green — celebrate & reinforce)
| Insight | Trigger Logic | Example Output |
|---------|---------------|----------------|
| **PR / Personal Record** | Latest lift metric > all previous entries | "Jake Morrison hit a new deadlift PR: 220kg — up 10kg from last month!" |
| **Consistency streak** | Client streak > 14 days | "Marcus Chen is on a 21-day streak — acknowledge the consistency" |
| **Progress milestone** | Client progress crosses 25%, 50%, 75%, 90% threshold | "Sarah Williams just crossed 75% of her goal — time to celebrate" |
| **All check-ins reviewed** | Zero pending check-ins | "You're all caught up on check-ins — nice work, coach" |
| **Revenue growth** | This month > last month by >10% | "Revenue is up 15% vs last month — momentum is building" |
| **Perfect compliance** | Check-in nutritionScore ≥ 8 AND steps ≥ 8000 for 3+ weeks | "Tom Bradley has been nailing nutrition for 3 weeks straight" |

---

## 4. Architecture

### New Files
```
src/
├── utils/
│   └── coach-insights.ts          # Pure logic — generates insights from data
├── components/
│   └── CoachInsightsPanel.tsx      # UI component for the insights panel
```

### `coach-insights.ts` — Core Engine
```typescript
interface CoachInsight {
  id: string;                              // unique, deterministic
  category: 'urgent' | 'attention' | 'win';
  icon: string;                            // lucide icon name
  title: string;                           // short headline
  description: string;                     // actionable detail
  clientId?: string;                       // if client-specific (for click-to-navigate)
  clientName?: string;
  timestamp?: string;                      // when the trigger happened
  priority: number;                        // sort weight within category (lower = more urgent)
}

function generateInsights(
  clients: Client[],
  messages: Message[],
  checkIns: CheckIn[],
  invoices: Invoice[],
  workoutLogs: WorkoutLog[],
  programs: WorkoutProgram[],
  lang: 'en' | 'pl',
): CoachInsight[]
```

**Key design decisions:**
- **Pure function, no side effects** — easy to test, easy to memoize with `useMemo`
- **Deterministic** — same data = same insights (no randomness)
- **Client-side only** — no API calls, instant render
- **i18n ready** — all strings go through lang parameter
- **Sorted by priority** — urgents first, then attention, then wins
- **Deduplication** — if a client triggers multiple insights, they stack but don't flood

### `CoachInsightsPanel.tsx` — UI Component
```
┌─────────────────────────────────────────────────┐
│  ⚡ Coach Insights                    [Filters] │
│                                                  │
│  🔴 URGENT (3)                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ ⚠️ Marcus Chen                              │ │
│  │ Check-in from Monday unreviewed — 3 days   │ │
│  │                                   [View →] │ │
│  └────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │ 💤 David Park                               │ │
│  │ No activity in 6 days — reach out          │ │
│  │                                   [View →] │ │
│  └────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │ 📉 David Park                               │ │
│  │ Energy: 7→5→3 last 3 check-ins            │ │
│  │                                   [View →] │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  🟡 THIS WEEK (2)                               │
│  ┌────────────────────────────────────────────┐ │
│  │ 📋 Jake Morrison                            │ │
│  │ 'Powerlifting Peak' ends in 5 days         │ │
│  │                                   [View →] │ │
│  └────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │ 👋 Emma Rodriguez                           │ │
│  │ First week — send welcome check-in         │ │
│  │                                   [View →] │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  🟢 WINS (2)                                    │
│  ┌────────────────────────────────────────────┐ │
│  │ 🏆 Jake Morrison                            │ │
│  │ New deadlift PR: 220kg (+10kg)             │ │
│  └────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │ 🔥 Marcus Chen                              │ │
│  │ 21-day streak — acknowledge it             │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 5. Placement on Overview Page

**Replace current AI Summary card** with the new Insights Panel:

```
Before:                          After:
┌──────────────────────┐         ┌──────────────────────┐
│ Greeting + Date      │         │ Greeting + Date      │
│ Daily Quote          │         │ Daily Quote          │
│ 4 Stat Cards         │         │ 4 Stat Cards         │
│ AI Dashboard Summary │  ──→    │ ⚡ Coach Insights    │
│ Revenue Chart        │         │ AI Dashboard Summary │ (keep, move below insights)
│ At-Risk + Performers │         │ Revenue Chart        │
│ Recent Messages      │         │ At-Risk + Performers │
└──────────────────────┘         │ Recent Messages      │
                                 └──────────────────────┘
```

- **Insights Panel** goes right after stat cards (highest value position)
- **AI Summary** stays but moves below insights (still useful for prose overview)
- On mobile: insights are collapsible (show top 3, expand for more)

---

## 6. UI/UX Details

### Visual Design (matching existing dark luxe theme)
- **GlassCard** container with subtle glow on urgent count
- Category headers: colored dots (red/amber/green) + count badge
- Each insight card: glass-morphism mini-card with:
  - Left: category color bar (3px vertical accent)
  - Client avatar (existing `getAvatarColor` + `getInitials`)
  - Title (bold) + description (secondary text)
  - Right: "View →" link (navigates to client detail via `onViewClient`)
- **Filter chips** at top: "All" | "Urgent" | "This Week" | "Wins" (toggle visibility)

### Mobile Behavior
- Show only **Urgent** category expanded by default
- "This Week" and "Wins" collapsed with count badges
- Tap to expand each category
- Max 3 insights per category visible, "Show more" button

### Animations
- Staggered entry animation (framer-motion, matching existing pattern)
- Category sections slide in sequentially
- Insight cards fade in with slight x-offset (already used in at-risk list)

### Empty States
- No urgent: "Nothing urgent — your clients are in good shape"
- No wins: (hide section entirely)
- No insights at all: "All quiet today. Your clients are on track."

---

## 7. Interaction with Autopilot Queue

This plan is designed to **complement, not overlap** with the Autopilot Queue:

| | Coach Insights | Autopilot Queue |
|--|----------------|-----------------|
| **Purpose** | INFORM the coach | ACT for the coach |
| **Output** | Text insight + link to client | Draft message ready to send |
| **Data source** | Client-side analysis | AI-generated via API |
| **Action required** | Coach reads + decides | Coach approves/edits/skips |
| **Placement** | Overview page (top) | Separate section or tab |

### Connection point
An insight like *"David Park: energy dropping 3 weeks"* in the Insights Panel could have a small **"Draft message →"** link that jumps to the Autopilot Queue where a draft message about this issue is waiting. This creates a natural **insight → action** flow.

But this connection is Phase 2 — build each independently first, connect later.

---

## 8. Implementation Steps

### Step 1: Build the insight engine (`coach-insights.ts`)
- Pure TypeScript function
- All 15+ trigger rules from Section 3
- i18n support (EN/PL)
- Unit-testable with mock data
- Returns sorted `CoachInsight[]`

### Step 2: Build the UI component (`CoachInsightsPanel.tsx`)
- Accepts `insights: CoachInsight[]` + `onViewClient` callback
- Category grouping with collapsible sections
- Filter chips
- Mobile responsive
- Framer-motion animations matching existing style

### Step 3: Integrate into OverviewPage
- Add `useMemo` call to `generateInsights()` with existing data
- Place `CoachInsightsPanel` after stat cards, before AI Summary
- Keep existing AI Summary card below (no removal)

### Step 4: Add i18n strings
- Add all insight text templates to EN and PL translation files
- Category headers, empty states, filter labels

### Step 5: Polish & edge cases
- Test with 0 clients (empty state)
- Test with 50+ clients (performance, scrolling)
- Test with all-green data (only wins)
- Test with crisis data (all urgent)
- Mobile testing on various breakpoints

---

## 9. What This Does NOT Include

- No external API calls (unlike current AI Summary)
- No message drafting (that's Autopilot Queue's job)
- No new data models or Supabase changes
- No new pages or routes
- No settings/configuration UI (hardcoded thresholds for now)

---

## 10. Future Enhancements (Phase 2, not in scope)

- **"Draft message →"** link connecting to Autopilot Queue
- **Dismiss/snooze** individual insights (localStorage persistence)
- **Custom thresholds** (settings: "flag inactive after X days")
- **Insight history** — "last week you had 5 urgent, this week 2 — improving"
- **Smart grouping** — if one client triggers 3 insights, bundle them

---

## Summary

| Aspect | Detail |
|--------|--------|
| **New files** | 2 (engine + component) |
| **Modified files** | 1 (OverviewPage.tsx) + i18n files |
| **API calls** | None (pure client-side) |
| **Dependencies** | None new (uses existing lucide, framer-motion, GlassCard) |
| **Data needed** | Already available in OverviewPage props |
| **Effort** | ~1 session to build core, ~1 session to polish |
