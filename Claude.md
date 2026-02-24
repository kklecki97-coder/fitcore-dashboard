# Fitness Project — Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.
> Contributors: kubamika16 (Jakub), kklecki97-coder (Kamil)

## Project Overview

We sell custom dashboards to fitness coaches worldwide. Coaches need better tools to manage clients, track progress, and run their business — we build those dashboards for them.

**Two workstreams, one repo:**
- **Jakub** — Marketing, cold outreach, emails, finding and closing clients
- **Kamil** — Building the dashboard product, integrations, deployment

## Boundary Rule

Each person works in their own directory. This keeps changes isolated so one side never breaks the other.

- Jakub works in `jakub/` only
- Kamil works in `kamil/` only
- Shared resources (client handoff, shared SOPs) go in `shared/`

**Do not modify files outside your directory unless coordinating with the other person.**

## Directory Structure

```
Fitness Project/
├── Claude.md              # Project instructions (shared)
├── .env                   # API keys and environment variables
├── .gitignore
│
├── jakub/                 # Jakub — marketing & client acquisition
│   ├── directives/        # SOPs: outreach templates, email campaigns, lead gen
│   ├── execution/         # Scripts: scraping, emailing, CRM, lead tracking
│   └── .tmp/              # Intermediate files (gitignored)
│
├── kamil/                 # Kamil — dashboard product development
│   ├── directives/        # SOPs: dashboard features, client onboarding, deployment
│   ├── execution/         # Scripts: dashboard, integrations, APIs
│   └── .tmp/              # Intermediate files (gitignored)
│
└── shared/                # Shared between both
    └── directives/        # SOPs that span both sides (e.g. client handoff process)
```

## The 3-Layer Architecture

Each workstream follows the same 3-layer pattern independently:

**Layer 1: Directive (What to do)**
- SOPs written in Markdown, live in `{person}/directives/`
- Define goals, inputs, tools/scripts to use, outputs, and edge cases

**Layer 2: Orchestration (Decision making)**
- This is you (the AI agent). Read directives, call execution tools, handle errors.
- You're the glue between intent and execution.

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in `{person}/execution/`
- Environment variables and API tokens stored in `.env`
- Reliable, testable, fast.

## Operating Principles

**1. Check for tools first**
Before writing a script, check the relevant `execution/` folder. Only create new scripts if none exist.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test again (check with user first if it uses paid credits)
- Update the directive with what you learned

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, or common errors — update the directive. Don't create or overwrite directives without asking.

**4. Stay in your lane**
When working for Jakub, only touch `jakub/`. When working for Kamil, only touch `kamil/`. Shared resources go in `shared/`.

## Self-annealing Loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test — make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

- **Deliverables**: Google Sheets, Slides, or other cloud-based outputs
- **Intermediates**: Temporary files in `{person}/.tmp/` — never committed, always regenerated
- `.env` — Environment variables and API keys
- `credentials.json`, `token.json` — Google OAuth credentials (gitignored)

## Outreach Pipeline Dashboard

Jakub's internal tool for managing daily Instagram outreach. React + TypeScript + Vite app that connects to Supabase (`instagram_leads` table).

- **Location:** `jakub/execution/pipeline-dashboard/`
- **Run:** `cd jakub/execution/pipeline-dashboard && npm run dev`
- **Main file:** `jakub/execution/pipeline-dashboard/src/App.tsx`
- **Two views:** Daily Tasks (engage batch + DM batch) and Pipeline (stats, funnel, activity chart, lead list)
- **DM generation script:** `jakub/execution/generate_dm_drafts.py` — generates AI DM drafts and stores them in Supabase
- **Directive:** `jakub/directives/instagram_dm_outreach.md`

## Deployment (Vercel)

**Deploys are manual only.** Pushing to GitHub does NOT auto-deploy. You must trigger a deploy explicitly.

**Live URLs:**
- **fitcore.tech** → Landing page (`kamil/execution/landing/`)
- **app.fitcore.tech** → Dashboard (`kamil/execution/dashboard/`)

**How to deploy:**

Option 1 — Script:
```bash
./shared/deploy.sh dashboard   # Deploy dashboard only
./shared/deploy.sh landing     # Deploy landing page only
./shared/deploy.sh both        # Deploy both
```

Option 2 — Direct curl (if script doesn't work):
```bash
# Dashboard → app.fitcore.tech
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_jZJeht6JKlqGLVDJADp2NzZ4zOM4/QZtTnlqMWJ"

# Landing → fitcore.tech
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_Dlf42hGmT1GjUyETDiW2wzpVi5pM/IxIr1xhCsN"
```

**Important:**
- Always push your changes to GitHub FIRST, then trigger the deploy
- Vercel pulls from `main` branch of `jakub-mika-test/Fitness-Project`
- Dashboard root directory: `kamil/execution/dashboard`
- Landing root directory: `kamil/execution/landing`
- The `build` command must pass (`npm run build`) or the deploy fails

## Summary

Two independent workstreams, one shared repo. Jakub finds the clients, Kamil builds the product. The 3-layer architecture (directives → orchestration → execution) applies within each workstream. Stay in your lane, self-anneal, and ship.
