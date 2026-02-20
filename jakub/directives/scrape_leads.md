# Directive: Scrape & Build Lead List

## Goal
Find thousands of online fitness coaches with verified emails. Feed them into Instantly for cold outreach.

## Target Numbers
- **Week 1:** 5,000-10,000 raw contacts
- **After cleaning:** 3,000-7,000 verified emails
- **Ongoing:** Add 2,000-5,000 new leads per month

---

## Source 1: Google Maps (Start Here)

The fastest path to a clean list. 67,000+ personal trainers listed in the US alone.

### Option A: Scrap.io (easiest, ~$50 for 10K contacts)
1. Go to scrap.io
2. Search: "personal trainer", "fitness coach", "online fitness coach"
3. Filter by:
   - Country: United States
   - States: California, Texas, Florida, New York, Illinois (highest density)
   - Has email: Yes
   - Has website: Yes (indicates a real business)
   - Rating: 4+ stars (indicates active, good reputation)
4. Export to CSV
5. Columns you need: name, business_name, email, phone, website, address, rating, review_count

### Option B: Apify Google Maps Extractor (more control, pay-per-use)
1. Use actor: `lukaskrivka/google-maps-with-contact-details`
2. Input searches:
   ```
   "personal trainer" in Los Angeles
   "fitness coach" in New York
   "online fitness coach" in Miami
   "nutrition coach" in Chicago
   "transformation coach" in Houston
   ```
3. Settings: maxResults = 500 per search, extractEmails = true
4. Export to CSV/JSON
5. Run `jakub/execution/clean_leads.py` to normalize (to be built)

### What Google Maps gives you
- Real business contact info (publicly listed — CAN-SPAM safe)
- Phone numbers (for follow-up if email doesn't work)
- Websites (to check if they do online coaching)
- Reviews (social proof of active clients)

### Filtering Google Maps leads for ONLINE coaches
Many Google Maps results will be in-person-only trainers. Filter for online coaches by:
- Website mentions "online coaching", "remote", "virtual"
- Bio/description mentions coaching programs, not just gym sessions
- Has Instagram linked (online coaches always have IG)
- Reviews mention "online", "app", "program" (not "gym", "studio")

Script needed: `jakub/execution/filter_online_coaches.py` — takes Google Maps CSV, visits each website, flags online vs in-person coaches.

---

## Source 2: Instagram (largest pool of online coaches)

Online fitness coaches live on Instagram. Many list their email in their bio.

### Step 1: Discover coach profiles by hashtag
- Actor: `apify/instagram-scraper`
- Hashtags to scrape:
  ```
  #onlinecoach
  #fitnesscoach
  #onlinepersonaltrainer
  #transformationcoach
  #macrocoach
  #onlinefitness
  #fitnessbusiness
  #personaltrainer
  #onlinetrainer
  #fitnesscoaching
  ```
- Settings: resultsLimit = 1000 per hashtag
- Output: list of profile usernames

### Step 2: Extract emails from profiles
- Actor: `scraper-mind/instagram-profile-email-scraper`
- Input: list of usernames from Step 1
- Output: username, full_name, biography, email, follower_count, website

### Step 3: Filter for ICP
Keep only profiles where:
- follower_count between 1,000 and 50,000
- email is not empty
- biography contains coaching-related keywords: "coach", "training", "program", "transformation", "clients", "DM", "apply"

Script needed: `jakub/execution/filter_ig_coaches.py` — takes Apify output, applies ICP filters, exports clean CSV.

### Important Notes
- **Residential proxies required** — datacenter IPs get blocked by Instagram
- **Rate limits** — don't scrape more than 5,000 profiles per run
- **Meta shut down Basic Display API (Dec 2024)** — all scraping is web-based now
- **Emails from bios only** — some coaches have business emails visible only to logged-in users; Apify can't always get these

---

## Source 3: TikTok (supplementary)

Growing source, especially younger coaches.

- Actor: `contactminerlabs/tiktok-email-scraper---advanced-cheapest-reliable`
- Search for fitness creators, filter by follower count 1K-100K
- Has `hasEmail` boolean field for easy filtering
- Lower volume than Instagram but less competition (fewer people cold-email TikTok coaches)

---

## Source 4: Apollo.io (B2B database, free tier)

Good for coaches who operate as registered businesses.
1. Sign up at apollo.io (free tier)
2. Search filters:
   - Job Title: "personal trainer", "fitness coach", "online coach", "head coach"
   - Industry: Health, Wellness & Fitness
   - Company Size: 1-10
   - Location: United States
3. Export with verified emails
4. Free tier: 50 email credits/month. Upgrade if needed.

---

## Email Verification (Critical Step)

**Never skip this.** Bad emails = high bounce rate = Instantly domains get burned.

### Tools (pick one)
- **ZeroBounce** — $16 for 2,000 verifications
- **NeverBounce** — $8 for 1,000 verifications
- **MillionVerifier** — $37 for 10,000 verifications (best value at scale)

### Process
1. Upload full email list to verification tool
2. Remove: invalid, catch-all (risky), disposable
3. Keep only: valid emails
4. Target: **<1% bounce rate** after cleaning

---

## Final Lead CSV Format

Before uploading to Instantly, your CSV should have these columns:

| Column | Example | Required |
|--------|---------|----------|
| email | jake@jfitcoaching.com | Yes |
| firstName | Jake | Yes |
| lastName | Thompson | Nice to have |
| companyName | JFit Coaching | Nice to have |
| platform | Instagram | Yes (for personalization) |
| handle | @jfitcoaching | Nice to have |
| website | jfitcoaching.com | Nice to have |
| niche | weight loss | Yes (for segmentation) |
| estimatedClients | 30 | Nice to have |
| segment | scaling_coach | Yes (see icp_and_sales_angle.md) |
| source | google_maps / instagram / apollo | Yes (for tracking) |

---

## Scripts to Build

| Script | Purpose | Status |
|--------|---------|--------|
| `jakub/execution/clean_leads.py` | Normalize CSV columns, deduplicate, merge sources | To build |
| `jakub/execution/filter_online_coaches.py` | Visit websites from Google Maps, flag online vs in-person | To build |
| `jakub/execution/filter_ig_coaches.py` | Apply ICP filters to Apify Instagram output | To build |
| `jakub/execution/verify_emails.py` | Call ZeroBounce/NeverBounce API, remove bad emails | To build |
| `jakub/execution/prep_instantly_csv.py` | Format final CSV for Instantly import | To build |

Build these as needed. Don't build all at once — start with clean_leads.py and prep_instantly_csv.py.
