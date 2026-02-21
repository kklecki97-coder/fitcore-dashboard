# Directive: Enrich Leads (Website Scraping + AI Personalization)

## Goal
Take raw leads from Supabase (with websites), scrape their sites for business details, then generate personalized email opening lines and pain points using AI. This is what makes our cold emails specific instead of generic.

## Pipeline Overview

| Step | What | Script | Cost |
|------|------|--------|------|
| 1 | Scrape websites for business info | `execution/scrape_websites.py --use-tavily --use-ai --use-linkedin` | ~$0.003/lead |
| 2 | Generate opening lines + pain points | `execution/enrich_with_ai.py` | ~$0.01/lead |
| 3 | Export to CSV for Instantly | (TBD) | Free |

**Total cost per lead: ~$0.013-0.016** (~$65-80 per 5,000 leads, depending on LinkedIn fallback usage)

---

## Step 1: Website Scraping

### Script
```
python3 jakub/execution/scrape_websites.py --use-tavily --use-ai --use-linkedin [--limit 10] [--rerun]
```

### How It Works

Uses a **4-step fallback chain** to get the best data possible for every lead:

1. **Tavily Crawl** (best) — Crawls multiple pages of the site (homepage, /about, /services, /pricing, /programs). Renders JavaScript, so works on Wix, Squarespace, WordPress sites that plain HTTP can't read. Returns clean text from up to 5 pages.

2. **Tavily Extract** (fallback) — Single-page extraction. Used when Crawl fails (some sites block crawlers or have weird setups).

3. **urllib fallback** — Plain HTTP fetch + HTML parsing. Free but misses JS-rendered content and only gets the homepage.

4. **LinkedIn fallback** (via Apify) — When ALL website scraping methods fail, scrapes the lead's LinkedIn profile using the `dev_fusion~linkedin-profile-scraper` Apify actor. Extracts headline, about section, experience descriptions, company details. Converts this into the same fields as website scraping (coaching_services, website_description, tools_detected, etc.). Costs ~$0.003/lead.

### What It Extracts

From the scraped text (website or LinkedIn), GPT-4o-mini extracts:
- **coaching_services** — What they offer (personal training, nutrition coaching, group classes, etc.)
- **tools_detected** — Software they use (Calendly, Square, Trainerize, MindBody, etc.)
- **pricing_details** — Any pricing found on the site
- **website_description** — 1-2 sentence summary of the business (from LinkedIn: headline + about)
- **offers_online_coaching** — true/false
- **social_links** — Instagram, Facebook, TikTok handles (from LinkedIn: linkedin profile URL)
- **niche** — Specific coaching niche if any
- **notable_detail** — One interesting fact about the business

### Key Learnings

- **Tavily Crawl works on ~40-60% of sites**, Extract picks up some more, urllib catches basic HTML sites.
- **LinkedIn fallback recovers ~90% of website failures** — most leads have a LinkedIn URL in the database (all 3,332 current leads have `/in/` profile URLs).
- **LinkedIn data quality**: Headlines and about sections often contain niche, target audience, and service descriptions. Experience sections sometimes have detailed job descriptions. Pricing and tools are rarely on LinkedIn.
- **Combined failure rate with LinkedIn fallback: near 0%** — tested on 10 leads, 9/10 had website failures, all 9 recovered via LinkedIn.
- **select_paths** in Tavily Crawl targets relevant subpages: `.*about.*`, `.*service.*`, `.*program.*`, `.*pricing.*`, `.*coach.*`, `.*train.*`
- **JS-rendered sites** (Wix, Squarespace, many WordPress themes) return empty or boilerplate text with plain urllib. Tavily handles these correctly.
- **Cost**: Tavily ~$0.002/lead, LinkedIn ~$0.003/lead (only used when website fails).
- **Rate limiting**: No hard rate limit hit in testing. 0.5s delay between website scrapes, 0.3s after LinkedIn (Apify already takes time).
- **API keys**: Stored in `.env` as `TAVILY_API_KEY` and `APIFY_API_KEY`.

### Test Results (10 leads, with LinkedIn fallback)

| Metric | Result |
|--------|--------|
| Leads scraped | 10/10 (100%) |
| Website success | 1/10 (urllib) |
| LinkedIn fallback used | 9/10 |
| Total failures | 0 |
| Services detected (LinkedIn) | 6/9 leads had services extracted |

---

## Step 2: AI Enrichment

### Script
```
python3 jakub/execution/enrich_with_ai.py [--limit 10] [--concurrency 20] [--rerun]
```

### How It Works

Sends each lead's data (name, company, title, team size, website data from Step 1) to **GPT-5-mini** which generates:

- **opening_line** — One conversational sentence referencing a specific detail about their business
- **pain_point** — One sentence about a specific operational problem they likely have (different angle than opening line)
- **confidence_score** — 1-10 rating of how good a fit this lead is
- **estimated_clients** — Best guess at client count
- **skip_reason** — If score < 4, explains why

### Two-Tier Prompting

| Data Quality | Fields Filled | Prompt Strategy |
|-------------|---------------|-----------------|
| RICH | 2+ of services/tools/pricing/description | Reference specific details from their site |
| MODERATE | 1 field | Build around the one detail we have |
| SPARSE | 0 fields | Use job title and company name, don't fake specificity |

### Opening Line Rules

The AI prompt enforces:
- **Conversational tone** — must sound like a person typed it, not a bot
- **No pasted website copy** — paraphrase naturally, never paste program names in ALL CAPS
- **No banned phrases** — "I noticed", "I saw", "love your", em-dashes, etc.
- **Different angles** — opening line and pain point must cover different aspects
- **Specific > generic** — a line that could apply to 50% of coaches is rejected

### Confidence Scoring

| Score | Meaning | Action |
|-------|---------|--------|
| 9-10 | Perfect fit: solo online coach, 20-50 clients, no CRM | Track A emails |
| 7-8 | Good fit: small team, online coaching, visible pain | Track A emails |
| 5-6 | Maybe: not enough data to tell | Track A emails (cautious) |
| 3-4 | Probably not: big gym, wrong niche | Exclude or Track B |
| 1-2 | Definitely not: MLM, not fitness, medical | Exclude |

### Cost
- GPT-5-mini: ~$0.01/lead
- 20 concurrent requests (configurable with `--concurrency`)
- 5,000 leads: ~$50

---

## Running the Full Pipeline

```bash
# Step 1: Scrape websites (with Tavily + AI + LinkedIn fallback)
python3 jakub/execution/scrape_websites.py --use-tavily --use-ai --use-linkedin --limit 100

# Step 2: Enrich with AI (opening lines + pain points)
python3 jakub/execution/enrich_with_ai.py --limit 100

# To re-run on already processed leads:
python3 jakub/execution/scrape_websites.py --use-tavily --use-ai --use-linkedin --rerun --limit 100
python3 jakub/execution/enrich_with_ai.py --rerun --limit 100
```

### Before Running on All Leads
- Always test on 10-20 leads first
- Check opening lines manually — do they sound human?
- Check pain points — are they specific or generic?
- Check scores — are they realistic?
- Only then run on full batch

---

## Data Cleaning Notes

### Company Names
Strip suffixes before using in emails: LLC, Llc, Inc., Corp., Ltd., Co.
These look robotic in cold emails ("Hey, built something for Smithbuilt Fitness Inc." vs "Smithbuilt Fitness").

### First Names
Many leads in Supabase have empty `first_name`. Current workaround: derive from email (e.g., "wes@gritfitness.com" → "Wes"). This is unreliable — some emails use last names or initials. Needs a proper fix before full campaign launch.

### Required Fields for Email
A lead needs ALL of these to enter the email sequence:
- `first_name` (not empty, not a last name)
- `company_name` (cleaned of suffixes)
- `ai_opening_line` (not empty)
- `ai_pain_point` (not empty)
- `ai_confidence_score` >= 5 (for Track A)
