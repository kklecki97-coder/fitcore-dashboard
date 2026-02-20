# Directive: Find Online Fitness Coaches

## Goal
Build a qualified lead list of independent online fitness coaches who need a client management dashboard.

## Ideal Coach Profile

- **Type:** Independent / online fitness coach (not gym employees or big franchise trainers)
- **Client count:** 20-50+ active clients (enough pain to need a tool, enough revenue to pay for one)
- **Revenue model:** Monthly coaching packages ($100-300/client/month) — transformation programs, macro coaching, workout programming with check-ins
- **Current tools:** Juggling spreadsheets, WhatsApp/Telegram groups, Google Docs, or basic apps like Trainerize/TrueCoach (often frustrated with price or rigidity)
- **Geography:** English-speaking first (US, UK, Australia, Canada)
- **Online presence:** Active on Instagram, TikTok, YouTube, or Facebook groups

## Where to Find Them

### Social Media (highest volume)
1. **Instagram** — Search hashtags: #onlinecoach, #fitnesscoach, #onlinepersonaltrainer, #transformationcoach, #macrocoach
   - Look for coaches with 1K-50K followers (big enough to have clients, small enough to not have a team)
   - Check bio for "DM me" or "link in bio" to coaching application
2. **TikTok** — Same hashtags, look for coaches posting client transformations
3. **Facebook Groups** — "Online Fitness Coaches", "Fitness Business Owners", "Online Personal Training Business"

### Coaching Platforms (they already pay for tools)
- **Trainerize** directory
- **TrueCoach** community
- **PTminder** users
- Coaches complaining about these tools = warm leads

### Podcasts & YouTube
- Coaches who run their own podcast/channel about fitness business
- They're entrepreneurial and invest in their business

## Process

1. **Research phase** — Identify 50 coaches that match the profile
2. **Qualify** — Check they actually have clients (testimonials, transformations, active engagement)
3. **Log to spreadsheet** — Name, platform, handle/URL, estimated client count, current tools (if visible), email if available
4. **Write outreach message** — See `jakub/directives/outreach_templates.md` (to be created)
5. **Send first batch** — 10-15 personalized DMs or emails
6. **Track responses** — Log in spreadsheet, follow up after 3 days

## Output
- Google Sheet with qualified leads (name, platform, handle, email, status, notes)
- Deliverable lives in Google Sheets, not locally

## Tools
- `jakub/execution/` — Scripts for scraping, lead enrichment (to be built as needed)
- Google Sheets API for logging leads

## Edge Cases
- Don't scrape emails aggressively — prioritize DMs first, emails for follow-up
- Some coaches use pseudonyms or brand names — log both real name and brand
- Coaches with <10 clients may not be worth the effort yet — skip for now
