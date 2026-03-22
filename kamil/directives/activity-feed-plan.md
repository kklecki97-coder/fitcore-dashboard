# Live Activity Feed — Implementation Plan

> **Status:** Draft — awaiting review
> **Date:** 2026-03-22
> **Estimated effort:** MVP in 1 session
> **Replaces:** Recent Messages section on Overview

---

## 1. What Is It?

A real-time, chronological stream of **everything happening with your clients** — workouts, check-ins, messages, payments, PRs, missed workouts — all in one scrollable feed on the Overview page.

**The problem:**
Current Overview has "Recent Messages" — shows only 5 last client messages. Coach has no visibility into workouts completed, check-ins submitted, payments received, or PRs hit unless they navigate to each page separately. The information exists in the system but is scattered across 5 different pages.

**The solution:**
One unified feed that merges all event types into a chronological timeline. Coach opens dashboard and sees WHAT HAPPENED — like a news feed for their coaching business.

---

## 2. What We Already Have (Everything)

| Infrastructure | Status | Detail |
|---|---|---|
| **workout_logs table** | READY | Client logs workout → saved to Supabase |
| **workout_set_logs table** | READY | Per-set data (reps, weight, RPE) |
| **check_ins table** | READY | Client submits check-in with wellness metrics |
| **messages table** | READY | Bidirectional coach-client messaging |
| **invoices table** | READY | Payment tracking with status |
| **client_metrics table** | READY | Time-series weight/BF/lift data |
| **Realtime: messages** | READY | `coach-messages` channel — INSERT/UPDATE |
| **Realtime: check_ins** | READY | `coach-checkins` channel — INSERT/UPDATE |
| **Realtime: workout_logs** | READY | `coach-workout-logs` channel — INSERT |
| **Realtime: workout_set_logs** | MISSING | No subscription — need to add |
| **Realtime: invoices** | MISSING on dashboard | Client portal has it, dashboard doesn't |
| **activity_log table** | EXISTS BUT EMPTY | Schema exists, never written to |

**~90% of infrastructure is ready.** This is primarily a frontend feature with minor realtime additions.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  EXISTING REALTIME SUBSCRIPTIONS (App.tsx)               │
│                                                          │
│  coach-messages    → INSERT/UPDATE on messages           │
│  coach-checkins    → INSERT/UPDATE on check_ins          │
│  coach-workout-logs → INSERT on workout_logs             │
│  + NEW: coach-invoices → UPDATE on invoices (paid)       │
│  + NEW: coach-set-logs → INSERT on workout_set_logs      │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  ACTIVITY FEED ENGINE (pure function)                    │
│  `utils/activity-feed.ts`                                │
│                                                          │
│  Input:  messages[], checkIns[], workoutLogs[],          │
│          invoices[], clients[], workoutSetLogs[]         │
│  Output: FeedEvent[] (sorted by timestamp, newest first) │
│                                                          │
│  Merges all data sources into unified event format       │
│  Detects PRs by comparing set logs to historical maxes   │
│  Groups related events (3 sets → 1 workout summary)      │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  ACTIVITY FEED UI                                        │
│  `components/ActivityFeed.tsx`                            │
│                                                          │
│  Scrollable timeline with event-type icons/colors        │
│  Relative timestamps ("2 min ago", "Yesterday")          │
│  Inline actions (Reply, Review, View)                    │
│  Real-time: new events slide in at top with animation    │
│  Filter chips: All | Workouts | Check-ins | Messages     │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Event Types

| Event Type | Icon | Color | Source | Timestamp Field | Detail Shown |
|---|---|---|---|---|---|
| `workout_completed` | Dumbbell | Green | `workout_logs` (completed=true) | `date` | "{name} completed {type} ({duration}min)" |
| `workout_missed` | Dumbbell | Red | `workout_logs` (completed=false) | `date` | "{name} missed {type}" |
| `checkin_submitted` | ClipboardCheck | Cyan | `check_ins` (INSERT) | `date` | "{name} submitted check-in · Mood: {mood}/5 · Energy: {energy}/10" |
| `checkin_reviewed` | ClipboardCheck | Green | `check_ins` (reviewStatus→reviewed) | now | "You reviewed {name}'s check-in" |
| `message_received` | MessageSquare | Blue | `messages` (isFromCoach=false) | `timestamp` | "{name}: '{text preview...}'" |
| ~~`message_sent`~~ | — | — | — | — | **Excluded from MVP** — coach-sent messages are noise in the feed. Phase 2 optional toggle. |
| `invoice_paid` | DollarSign | Green | `invoices` (status→paid) | `paidDate` | "{name} paid {amount} ({period})" |
| `invoice_overdue` | DollarSign | Red | `invoices` (status=overdue, dueDate passed) | `dueDate` | "{name}'s invoice ({amount}) is overdue" |
| `personal_record` | Trophy | Gold | `workout_set_logs` (weight > previous max) | `date` | "{name} new PR — {exercise} {weight}kg (+{diff}kg)" |
| `client_joined` | UserPlus | Cyan | `clients` (new row) | `startDate` | "{name} joined as {plan} client" |

---

## 5. Data Model

### New file: `src/utils/activity-feed.ts`

```typescript
type FeedEventType =
  | 'workout_completed'
  | 'workout_missed'
  | 'checkin_submitted'
  | 'checkin_reviewed'
  | 'message_received'
  // 'message_sent' excluded from MVP — coach's own messages are noise
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'personal_record'
  | 'client_joined';

interface FeedEvent {
  id: string;                    // deterministic: `${type}-${sourceId}`
  type: FeedEventType;
  clientId: string;
  clientName: string;
  timestamp: string;             // ISO string for sorting
  title: string;                 // main text line
  detail?: string;               // optional second line (wellness scores, message preview)
  actionType?: 'reply' | 'review' | 'view';  // CTA button type
  metadata?: Record<string, any>; // extra data for rendering (amount, PR diff, etc.)
}

function buildFeed(
  clients: Client[],
  messages: Message[],
  checkIns: CheckIn[],
  workoutLogs: WorkoutLog[],
  workoutSetLogs: WorkoutSetLog[],
  invoices: Invoice[],
  lang: 'en' | 'pl',
  options?: {
    limit?: number;              // default 50
    filter?: FeedEventType[];    // show only these types
    clientId?: string;           // filter by client
  }
): FeedEvent[]
```

### Logic rules:
- **Sorted by timestamp descending** (newest first)
- **Default limit: 50 events** — prevents rendering hundreds of items
- **Message preview truncated to 80 chars**
- **PR detection:** Compare each `workout_set_log` weight against historical max for same `exerciseName` + `clientId`. If new max → generate `personal_record` event. **Minimum 2 previous entries required** — first-time exercises are NOT flagged as PRs (otherwise every first set would be a "record")
- **Deduplication:** Coach-sent messages appear only if they want "sent" events shown (filter toggle)
- **Grouping (Phase 2):** Multiple sets in same workout could group into one "completed workout" event

---

## 6. Relative Timestamps

### New utility: `src/utils/relative-time.ts`

```typescript
function relativeTime(isoString: string, lang: 'en' | 'pl'): string
```

| Time Diff | EN Output | PL Output |
|---|---|---|
| <1 min | "Just now" | "Przed chwila" |
| 1-59 min | "5 min ago" | "5 min temu" |
| 1-23 hours | "2h ago" | "2h temu" |
| Yesterday | "Yesterday" | "Wczoraj" |
| 2-6 days | "3 days ago" | "3 dni temu" |
| 7+ days | "Mar 15" | "15 mar" |

- Updates every 60 seconds via `setInterval` (not per-event, one global tick)
- **Important:** `clearInterval` in `useEffect` cleanup to prevent memory leaks on unmount
- Same relative time util can be reused across dashboard (messages, check-ins, etc.)

---

## 7. UI Design

### Replaces: Recent Messages card on Overview

```
┌──────────────────────────────────────────────────────────┐
│  ⚡ Activity Feed                                  Live  │
│  [All] [Workouts] [Check-ins] [Messages] [Payments]      │
│ ─────────────────────────────────────────────────────────│
│                                                           │
│  🟢 2 min ago                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 🏋️ Marcus Chen completed Upper Body (45 min)        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  💬 15 min ago                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Sarah Williams: "Knee feels much better, I think    │ │
│  │ I can go back to squats next week..."               │ │
│  │                                          [Reply →]  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  📊 1h ago                                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Jake Morrison submitted check-in                    │ │
│  │ Mood: 4/5 · Energy: 8/10 · Weight: 92.1kg          │ │
│  │                                        [Review →]   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  🏆 2h ago                                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Jake Morrison — new PR! Deadlift 220kg (+10kg)      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  💰 3h ago                                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Tom Bradley paid $199 (Feb 2026)                    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  🔴 5h ago                                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ David Park missed Leg Day                           │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ── Yesterday ─────────────────────────────────────────  │
│                                                           │
│  📊 Yesterday 18:30                                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Tom Bradley submitted check-in                      │ │
│  │ Mood: 3/5 · Energy: 5/10                            │ │
│  │                                        [Review →]   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│                        [Load more ▾]                      │
└──────────────────────────────────────────────────────────┘
```

### Visual Design (dark luxe theme)

- **Full width card** at bottom of Overview (replaces Recent Messages, same `gridColumn: '1 / -1'` position)
- **Event cards:** Subtle glass-morphism, left color bar matching event type
- **Color coding:**
  - Green: workout completed, invoice paid, check-in reviewed
  - Cyan/Blue: check-in submitted, message received, client joined
  - Gold: personal record
  - Red: missed workout, overdue invoice
  - Gray: coach-sent message
- **Client avatar** on each card (existing `getAvatarColor` + `getInitials`)
- **"Live" indicator:** Small pulsing green dot next to header — shows realtime is active
- **Day separators:** "Today", "Yesterday", "Mar 20" dividers between event groups
- **New event animation:** New events slide in from top with framer-motion, subtle glow pulse on entry

### Filter Chips
- **All** (default) — everything EXCEPT coach-sent messages (coach's own messages are noise in the feed)
- **Workouts** — completed + missed
- **Check-ins** — submitted + reviewed
- **Messages** — received only (coach-sent always hidden — coach doesn't need to see their own messages in the feed)
- **Payments** — paid + overdue
- Active filter highlighted with accent color
- Filter state in `useState` — not persisted

### Mobile Behavior
- Show **5 events** collapsed, "Show more" expands to 20
- Filter chips scroll horizontally (overflow-x)
- Event cards full width, compact padding
- Action buttons (Reply, Review) take full width on tap

### Empty State
- Zero events: "No activity yet — events will appear here as your clients train, check in, and message you"
- With filter active + zero results: "No {filter} events recently"

---

## 8. Placement on Overview

```
BEFORE:                              AFTER:
┌──────────────────────────┐         ┌──────────────────────────┐
│ Greeting + Date          │         │ Greeting + Date          │
│ Daily Quote              │         │ Daily Quote              │
│ 4 Stat Cards             │         │ 4 Stat Cards             │
│ AI Dashboard Summary     │         │ AI Dashboard Summary     │
│ Revenue Chart            │         │ Revenue Chart            │
│ At-Risk + Top Performers │         │ At-Risk + Top Performers │
│ Recent Messages          │  ──→    │ ⚡ Activity Feed          │
└──────────────────────────┘         └──────────────────────────┘
```

**Recent Messages is REMOVED** — Activity Feed shows messages AND everything else. No duplication.

Top Performers and At-Risk stay (until Smart Coach Engine replaces At-Risk in the future).

---

## 9. Realtime Integration

### What already works (zero changes needed):
- `coach-messages` channel → messages INSERT/UPDATE → `allMessages` state updates → feed re-renders
- `coach-checkins` channel → check_ins INSERT/UPDATE → `allCheckIns` state updates → feed re-renders
- `coach-workout-logs` channel → workout_logs INSERT → `allWorkoutLogs` state updates → feed re-renders

### What needs adding to App.tsx:

**1. Invoice realtime (UPDATE only — we care about paid status):**
```typescript
// coach-invoices channel — UPDATE on invoices (status changes)
supabase
  .channel('coach-invoices')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invoices' },
    (payload) => {
      const r = payload.new;
      setAllInvoices(prev => prev.map(inv =>
        inv.id === r.id
          ? { ...inv, status: r.status, paidDate: r.paid_date }
          : inv
      ));
    }
  )
  .subscribe();
```

**2. Workout set logs realtime (INSERT — for PR detection):**
```typescript
// coach-set-logs channel — INSERT on workout_set_logs
supabase
  .channel('coach-set-logs')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workout_set_logs' },
    (payload) => {
      const r = payload.new;
      setAllWorkoutSetLogs(prev => [...prev, {
        id: r.id,
        date: r.date,
        clientId: r.client_id,
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        setNumber: r.set_number,
        reps: r.reps,
        weight: r.weight,
        completed: r.completed,
        rpe: r.rpe,
      }]);
    }
  )
  .subscribe();
```

**3. Initial fetch for workout_set_logs:**
`App.tsx` must load historical set logs on mount (same as messages, check-ins, etc.). Without historical data, PR detection has nothing to compare against. Add `loadWorkoutSetLogs()` in the main `useEffect` data loading block:
```typescript
const loadWorkoutSetLogs = async (clientsList: Client[]) => {
  const { data, error } = await supabase
    .from('workout_set_logs')
    .select('*')
    .order('date');
  if (error) { console.error('loadWorkoutSetLogs failed:', error); return; }
  if (data) {
    setAllWorkoutSetLogs(data.map(r => ({
      id: r.id, date: r.date, clientId: r.client_id,
      exerciseId: r.exercise_id, exerciseName: r.exercise_name,
      setNumber: r.set_number, reps: r.reps, weight: r.weight,
      completed: r.completed, rpe: r.rpe,
    })));
  }
};
```
**Verify before coding:** Check if `App.tsx` already loads set logs. If yes, this is already covered. If not, add it.

### How feed stays live:
- Feed is computed via `useMemo` from existing state arrays (`allMessages`, `allCheckIns`, etc.)
- When realtime subscription fires → state updates → `useMemo` dependencies change → feed recomputes
- New event appears at top with slide-in animation
- **No polling, no manual refresh needed** — pure reactive

---

## 10. Real-time Behavior

- New events simply appear at the top of the feed with a slide-in animation
- No scroll tracking, no visibility API — keep it simple for MVP
- ~~"New event indicator" with scroll position tracking~~ → **Phase 2** (overengineered for MVP)

---

## 11. Files to Create

| File | Type | Purpose |
|---|---|---|
| `src/utils/activity-feed.ts` | Logic | Build unified event list from all data sources |
| `src/utils/relative-time.ts` | Utility | "2 min ago", "Yesterday" timestamp formatting |
| `src/components/ActivityFeed.tsx` | UI | Feed widget with filters, day separators, event cards |

**3 files total.**

## 12. Files to Modify

| File | Change |
|---|---|
| `src/components/OverviewPage.tsx` | Replace Recent Messages with `<ActivityFeed>`. Pass all data arrays as props. |
| `src/App.tsx` | Add 2 realtime subscriptions (invoices UPDATE, set_logs INSERT). Pass `workoutSetLogs` to OverviewPage. |
| `src/i18n/en.ts` | Feed translations (event texts, filter labels, empty state, relative time) |
| `src/i18n/pl.ts` | Feed translations (PL) |

**4 files modified.**

---

## 13. Implementation Steps

### Step 1: Relative time utility (`relative-time.ts`)
- Pure function, i18n ready (EN/PL)
- Handles: just now, minutes, hours, yesterday, days, dates
- Global 60-second refresh tick

### Step 2: Feed engine (`activity-feed.ts`)
- `buildFeed()` pure function
- Merge all data sources into `FeedEvent[]`
- PR detection from set logs
- Sort by timestamp descending
- Limit + filter support
- i18n text generation

### Step 3: Feed UI (`ActivityFeed.tsx`)
- Filter chips at top
- Scrollable event list with day separators
- Event cards with type-specific icon, color, layout
- Inline actions (Reply → navigate to messages, Review → navigate to check-ins)
- Client avatar on each card
- "Load more" pagination
- Framer-motion entry animations
- Mobile responsive

### Step 4: Integration
- Add `<ActivityFeed>` to OverviewPage, remove Recent Messages
- Add invoice + set log realtime subscriptions to App.tsx
- Wire `onNavigate`, `onViewClient` callbacks
- Add i18n strings

### Step 5: Polish
- "Live" pulsing indicator
- New event slide-in animation
- Day separator styling
- Empty states
- Mobile filter chip horizontal scroll

---

## 14. What This Does NOT Include (MVP)

| Excluded | Reason |
|---|---|
| Infinite scroll | "Load more" button is simpler and more predictable |
| Event grouping (3 sets → 1 workout) | Adds complexity, can iterate later |
| Push notifications | Separate feature |
| Event persistence/read status | Feed is computed from existing data, no new table needed |
| Client avatar images | Uses existing `getInitials` + `getAvatarColor` — no photo uploads needed |
| activity_log table writes | We compute feed from existing tables — no need to write to a separate events table |
| Sound/vibration on new event | Nice-to-have Phase 2 |
| "New event" indicator with scroll tracking | Requires scroll position + visibility API — overengineered for MVP |
| Coach-sent messages in feed | Coach's own messages are noise — only client-sent messages appear |

---

## 15. Performance

- `buildFeed()` iterates: messages + checkIns + workoutLogs + invoices + setLogs
- With 30 clients, ~1000 total records across all tables → <20ms to compute
- `useMemo` ensures recompute only when data changes
- Rendering limited to 50 events (paginated)
- Day separator grouping is O(n) single pass
- **No performance concern** up to 100+ clients

---

## 16. Future Enhancements (Phase 2+)

1. **Event grouping** — "Marcus completed 4 exercises (Upper Body)" instead of 4 separate set events
2. **Click to expand** — Show set details inline (reps × weight for each set)
3. **Client filter** — Click client avatar to filter feed to just that client
4. **Sound notification** — Optional subtle sound on new event (toggle in settings)
5. **Export feed** — Download activity report as PDF for client review meetings
6. **activity_log table** — Write events to DB for historical queries beyond loaded data
7. **Feed on Client Detail page** — Reuse same component filtered to one client
8. **"New events" sticky indicator** — When user scrolls down, show "↑ 3 new events" bar at top with scroll-to-top action
9. **Toggle coach-sent messages** — Optional toggle to show coach's own messages in feed for coaches who want full conversation visibility

---

## 17. Interaction with Existing & Planned Components

| Component | What Happens |
|---|---|
| **Recent Messages** | REMOVED — absorbed by Activity Feed (messages are one event type) |
| **At-Risk Clients** | KEPT — different purpose (alerts vs timeline). Smart Coach Engine will absorb this later. |
| **Top Performers** | KEPT — no overlap |
| **AI Dashboard Summary** | KEPT — prose overview, different from event timeline |
| **Smart Coach Engine (future)** | COMPLEMENTARY — Smart Coach says "David inactive 3 days". Activity Feed shows exactly when David last trained and what he did. Different angle, same data. |
| **Revenue Chart** | KEPT — aggregate view vs individual payment events in feed |

---

## 18. Summary

| Aspect | Detail |
|--------|--------|
| **New files** | 3 (feed engine + relative time + UI component) |
| **Modified files** | 4 (OverviewPage + App.tsx + i18n EN/PL) |
| **New Supabase tables** | None |
| **New realtime subscriptions** | 2 (invoices UPDATE + set_logs INSERT) |
| **API calls** | None — pure client-side from existing data |
| **Dependencies** | None new (uses existing lucide, framer-motion, GlassCard) |
| **MVP effort** | 1 session |

**Real data. Real-time. One feed. Everything that matters.**
