# Directive: Find Online Fitness Coaches (Hub)

## Goal
Build a qualified lead list of online fitness coaches and convert them into dashboard clients.

## Related Directives
- **`icp_and_sales_angle.md`** — Who exactly to target, pricing, the pitch, objection handling, segmentation
- **`scrape_leads.md`** — Step-by-step scraping pipeline (Google Maps, Instagram, TikTok, Apollo), email verification, CSV format for Instantly
- **`enrich_leads.md`** — Website scraping (Tavily) + AI personalization (GPT-5-mini) pipeline. Generates opening lines and pain points for emails.
- **`cold_email_outreach.md`** — Instantly setup, 4-email sequence templates, sending schedule, legal compliance

## Quick Summary

| Step | What | Directive |
|------|------|-----------|
| 1 | Define who you're looking for | `icp_and_sales_angle.md` |
| 2 | Scrape leads + verify emails | `scrape_leads.md` |
| 3 | Enrich leads (scrape websites + AI personalization) | `enrich_leads.md` |
| 4 | Send cold emails via Instantly | `cold_email_outreach.md` |
| 5 | Handle responses + close | `icp_and_sales_angle.md` (objection handling) |

## ICP at a Glance
- Online fitness coaches, 15-50 clients, charging $100-300/mo per client
- US first, then UK/Australia/Canada
- Struggling with spreadsheets, WhatsApp, or overpriced tools like Trainerize
- See full profile in `icp_and_sales_angle.md`

## Lead Targets
- **Week 1:** 5,000-10,000 raw contacts from Google Maps + Instagram
- **After cleaning:** 3,000-7,000 verified emails
- **Ongoing:** 2,000-5,000 new leads per month
- See full scraping pipeline in `scrape_leads.md`

## All-in-One Pipeline Script

### Script
```
python3 jakub/execution/find_and_enrich_leads.py [options]
```

Searches for fitness coach leads by US city via the Apify Leads Finder actor (`code_crafter~leads-finder`), deduplicates against existing Supabase leads, cleans, pushes to Supabase, then runs the full enrichment pipeline (website scraping → AI enrichment → push to Instantly).

### Options
| Flag | Default | Description |
|------|---------|-------------|
| `--cities N` | 25 | Number of cities to search |
| `--leads-per-city N` | 200 | Leads requested per city |
| `--skip-enrich` | false | Skip enrichment + Instantly push |
| `--skip-instantly` | false | Enrich but don't push to Instantly |
| `--dataset ID` | none | Resume from existing Apify dataset (skip actor run) |
| `--dry-run` | false | Show config without running |

### How It Works
1. Fetches all existing emails from Supabase for dedup
2. Runs Apify Leads Finder with all cities in one request (job titles: personal trainer, fitness coach, nutrition coach, etc.)
3. Deduplicates against existing DB + within batch
4. Cleans: rejects wrong industry, non-US, disqualifying keywords
5. Pushes clean leads to Supabase `leads` table
6. Runs `scrape_websites.py` → `enrich_with_ai.py` → `push_to_instantly.py`

### Cities
Targets 25 mid-to-large US cities (avoids mega-cities already covered by national search):
Denver, Nashville, Austin, Charlotte, San Diego, Tampa, Portland, Minneapolis, Raleigh, Columbus, Indianapolis, Jacksonville, Salt Lake City, Kansas City, Scottsdale, Boise, Richmond, Savannah, Memphis, New Orleans, Tucson, Oklahoma City, Omaha, Albuquerque, El Paso

### Cost
| Component | Cost per 1k leads |
|-----------|--------------------|
| Apify Leads Finder | ~$1.50 |
| Tavily website scraping | ~$2.00 |
| GPT-5-nano enrichment | ~$10.00 |

### Learnings
- Apify Leads Finder is slow (~20-40 min for 5,000 leads) because it verifies emails
- `count` parameter is a target, not a hard limit — actor may return more or fewer
- Actor can time out on large runs (default 3,000s). Use `--dataset` to resume from partial results
- `email_status` must be lowercase array: `["validated"]`
- City-based search avoids duplicates from national searches
- ~50% of raw leads pass cleaning (wrong industry, corporate, non-fitness)
- AI enrichment further filters: confidence < 4 leads don't get opening lines → don't go to Instantly

### Examples
```bash
# Full run (25 cities, ~5000 leads, full pipeline)
python3 jakub/execution/find_and_enrich_leads.py

# Test with 2 cities
python3 jakub/execution/find_and_enrich_leads.py --cities 2 --leads-per-city 50 --skip-enrich

# Resume from a timed-out run
python3 jakub/execution/find_and_enrich_leads.py --dataset Yc8vjXz4KCfq7g3lI
```

## Before First Outreach — Checklist
- [x] Scrape first batch of leads (Apify Leads Finder)
- [x] Push to Supabase + enrich (website scraping + AI)
- [x] Push to Instantly campaign
- [ ] Confirm delivery timeline with Kamil (how fast can he build a dashboard?)
- [ ] Get a demo/mockup from Kamil (even screenshots or a Loom)
- [ ] Set up a simple landing page (Notion, Carrd, or similar)
- [ ] Instantly domains warmed up and ready (you handle this)
