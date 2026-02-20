# Directive: Find Online Fitness Coaches

## Goal
Build a qualified lead list of independent online fitness coaches who need a client management dashboard.

## Ideal Coach Profile

- **Type:** Independent / online fitness coach (not gym employees or big franchise trainers)
- **Client count:** 20-50+ active clients (enough pain to need a tool, enough revenue to pay for one)
- **Revenue model:** Monthly coaching packages ($100-300/client/month) — transformation programs, macro coaching, workout programming with check-ins
- **Current tools:** Juggling spreadsheets, WhatsApp/Telegram groups, Google Docs, or basic apps like Trainerize/TrueCoach (often frustrated with price or rigidity)
- **Geography:** US first (67K+ trainers on Google Maps alone — California 25K, Texas 17K, Florida 15K), then UK, Australia, Canada
- **Online presence:** Active on Instagram, TikTok, YouTube, or Facebook groups

## Lead Sources (Priority Order)

### Tier 1: Google Maps (start here — highest ROI)
Fitness coaches who list themselves on Google Maps have publicly posted their business info. Legally clean, highly relevant.

**Tools:**
- **Scrap.io** — Real-time extraction from Google Maps. ~$50 per 10K contacts. Filter by reviews, social media, geography.
- **Apify Google Maps Email Extractor** (`lukaskrivka/google-maps-with-contact-details`) — Scrapes listings then visits websites to extract verified emails.

**Search queries:** "personal trainer", "fitness coach", "online fitness coach", "nutrition coach", "transformation coach", "body recomposition coach"

### Tier 2: Instagram (largest pool of online coaches)
Most online fitness coaches live on Instagram. Many list email in bio.

**Tools:**
- **Apify Instagram Scraper** (`apify/instagram-scraper`) — Discover profiles by hashtag (#fitnesscoach, #onlinecoach, #personaltrainer, #fitnesstransformation)
- **Apify Instagram Profile Email Scraper** (`scraper-mind/instagram-profile-email-scraper`) — Extract emails from bios

**Workflow:** Hashtag discovery → profile scraping → email extraction → filter for those with emails

**Note:** Residential proxies required. Meta shut down Basic Display API Dec 2024, so scraping is web-based only.

### Tier 3: TikTok
Growing source, especially for newer/younger coaches.
- **Apify TikTok Email Scraper** (`contactminerlabs/tiktok-email-scraper---advanced-cheapest-reliable`) — Extracts emails from bios, has `hasEmail` boolean filter
- Sweet spot: 1K-100K followers (big enough to have clients, small enough to not have a full team)

### Tier 4: B2B Databases
- **Apollo.io** — 275M+ contacts. Free tier available. Use filters: job title = personal trainer / fitness coach
- **Influencers.club** — Pre-built personal trainer database scraped from 340M+ social profiles

### Tier 5: Niche Directories
- Trainerize, TrueCoach, PTminder directories — coaches here already use software tools and may be ready to switch or add a CRM layer

## Week 1 Recommended Stack
Start with just two sources:
1. **Scrap.io for Google Maps** — Get 5,000-10,000 US-based personal trainer contacts (~$25-50)
2. **Apify Instagram Profile Email Scraper** — Scrape 2,000-5,000 fitness coach profiles from hashtags

This gives you 7,000-15,000 contacts to start testing email sequences.

## Process

1. **Scrape leads** — Use tools above, export to CSV
2. **Clean & verify emails** — Use ZeroBounce or NeverBounce (aim for <1% bounce rate)
3. **Segment lists** — By niche (weight loss, bodybuilding, general fitness), by size (solo vs small team), by geography
4. **Log to Google Sheet** — Name, email, platform, handle/URL, niche, estimated client count, source, status
5. **Feed into Instantly** — See `jakub/directives/cold_email_outreach.md`

## Output
- Google Sheet with qualified, verified leads
- CSV exports for Instantly import
- Deliverables live in Google Sheets, not locally

## Tools
- `jakub/execution/` — Scripts for scraping and lead enrichment (to be built as needed)
- Scrap.io, Apify, Apollo.io for lead sourcing
- ZeroBounce / NeverBounce for email verification
- Google Sheets API for logging

## Edge Cases
- Some coaches use pseudonyms or brand names — log both real name and brand
- Coaches with <10 clients may not be worth the effort yet — skip for now
- Canadian leads: CASL is stricter than CAN-SPAM — only email if their contact is clearly publicly listed for business purposes
- EU/UK leads: requires GDPR legitimate interest basis — start with US only, expand later
