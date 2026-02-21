# Project Status

> Both Jakub and Kamil update this file. Check here to see where we stand.

## Current Focus

**Target market:** Independent / online fitness coaches (20-50+ clients, English-speaking markets: US, UK, Australia)

**What we're building:** A client management dashboard for fitness coaches — one place to see all clients, track progress, send check-ins, manage programs.

## Jakub — Marketing & Client Acquisition

**Status:** Lead pipeline built, first batch cleaned, preparing for outreach

| Task | Status | Notes |
|------|--------|-------|
| Define ideal coach profile | Done | ICP defined: 15-50 client coaches, $100-300/mo per client, 5 segments identified |
| Define sales angle & pricing | Done | $300-500 setup + $50-100/mo, objection handling ready |
| Research where coaches hang out | Not started | Instagram, TikTok, Facebook groups, coaching platforms |
| Build lead list | In progress | First batch: 390 cleaned leads from Apify (500 raw → 390 usable). Email verification still needed |
| Write outreach templates | Done (draft) | 4-email cold sequence written in directive (problem-aware → social proof → value-add → breakup) |
| Set up Instantly (domains, warmup) | Not started | Need 4 secondary domains, DNS config, inbox warmup |
| Verify emails (ZeroBounce/NeverBounce) | Not started | Required before sending |
| First cold outreach batch | Not started | Blocked by: email verification + Instantly setup + deployed demo URL |

## Kamil — Dashboard Development

**Status:** Frontend MVP built and working

| Task | Status | Notes |
|------|--------|-------|
| Define MVP features | Done | Client list, progress tracking, messaging, analytics, scheduling, settings |
| Choose tech stack | Done | React 19 + TypeScript + Vite, Framer Motion, Recharts, Lucide icons |
| Build prototype | Done | Full 7-page dashboard with polish: overview, clients, client detail, messages, analytics, schedule, settings |
| Deploy demo (with mock data) | Not started | Deploy current frontend to Vercel — mock data IS the demo for prospects |
| Connect backend (database, auth) | Not started | Only needed post-sale when a coach actually signs up |

## Decisions Log

| Date | Decision | Who |
|------|----------|-----|
| 2026-02-20 | Target market: independent online fitness coaches | Jakub + Kamil |
| 2026-02-20 | Project split: Jakub = marketing, Kamil = dashboard | Jakub + Kamil |
| 2026-02-20 | Kamil shipped frontend MVP with React/Vite/TypeScript | Kamil |
| 2026-02-20 | Jakub defined ICP, sales angle, pricing, and cold email sequence | Jakub |
| 2026-02-20 | First lead batch scraped and cleaned (390 leads) | Jakub |
| 2026-02-20 | Backend is post-sale only — mock data dashboard is the sales demo | Jakub + Kamil |

## Priority Order

Backend is NOT needed for sales — the mock data dashboard IS the demo. Build backend only after a coach signs up.

**Critical path to first revenue:**
1. [ ] Kamil: Deploy current dashboard to Vercel (mock data is fine) → gives Jakub a demo URL
2. [ ] Jakub: Verify emails (ZeroBounce/NeverBounce)
3. [ ] Jakub: Set up Instantly (domains, warmup — takes ~2 weeks)
4. [ ] Jakub: Send first cold outreach batch
5. [ ] **Post-sale:** Kamil connects real backend for paying clients
