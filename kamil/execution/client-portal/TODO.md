# Client Portal - TODO

## Home Page Changes

- [ ] Remove weight display (88.1kg) from the "This Week" card - weight belongs in Progress, not the weekly calendar
- [ ] Remove "2/3 workouts" header text from the "This Week" card - unnecessary extra text, the calendar cells already show completion
- [ ] Add a new "Progress" summary card on the Home page with key highlights (weight trend, PRs, streak) - a quick glance before drilling into the full Progress tab

## Progress Page Overhaul

- [ ] Redesign the Progress page - current version looks terrible, needs a full visual rework
- [ ] Match the visual quality and style of the rest of the client portal (glass cards, dark theme, clean typography)
- [ ] Review what data is most important to show and how to present it (charts, trends, PRs, goals)

## Workout Flow Redesign

- [ ] Redesign the workout experience - add a proper "Start Workout" flow
- [ ] Click start → guided workout session (exercise by exercise, set by set)
- [ ] Rethink the structure and process of logging a workout (not just a static list)

## Future (After Mock-up Phase)

- [ ] Connect client portal to real Supabase data (flip USE_MOCK_DATA = false)
- [ ] Connect client portal to coach dashboard (sync programs, check-ins, messages)
- [ ] Deploy to client.fitcore.tech
