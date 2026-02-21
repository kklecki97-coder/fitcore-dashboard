"""
find_and_enrich_leads.py — All-in-one pipeline: Find leads by US city via Apify,
deduplicate against Supabase, clean, push to Supabase, then run enrichment + Instantly push.

Usage:
    # Full run — ~25 cities, 200 leads each, full enrichment + push to Instantly
    python3 jakub/execution/find_and_enrich_leads.py

    # Test with 2 cities, 50 leads each
    python3 jakub/execution/find_and_enrich_leads.py --cities 2 --leads-per-city 50

    # Just find + dedup + push to Supabase (skip enrichment + Instantly)
    python3 jakub/execution/find_and_enrich_leads.py --skip-enrich

    # Find + enrich but don't push to Instantly
    python3 jakub/execution/find_and_enrich_leads.py --skip-instantly

    # Resume from an existing Apify dataset (skip the Apify run)
    python3 jakub/execution/find_and_enrich_leads.py --dataset Yc8vjXz4KCfq7g3lI

    # Dry run — show what would happen without calling Apify
    python3 jakub/execution/find_and_enrich_leads.py --dry-run

Apify actor: code_crafter~leads-finder ($1.50/1k leads)
Filters: personal trainer, fitness coach, nutrition coach, etc.
         Industry: health, wellness & fitness
         Company size: 1-10, 11-20, 21-50
         Email: validated only
         Location: per-city (avoids duplicates from national search)

Cost estimate for full run (~5,000 raw leads):
    Apify:    ~$7.50
    Tavily:   ~$5.00  (website scraping)
    GPT-5:    ~$25.00 (AI enrichment)
    Total:    ~$37.50 → ~2,000-2,500 net new enriched leads
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request


# ---------------------------------------------------------------------------
# ENV
# ---------------------------------------------------------------------------

def load_env(path=".env"):
    env = {}
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    return env


# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

# US cities to search — mid-to-large, avoiding mega-cities already covered by national search
CITIES = [
    # Mid-size (not yet done)
    "Raleigh", "Columbus", "Indianapolis", "Jacksonville", "Salt Lake City",
    "Kansas City", "Scottsdale", "Richmond", "Memphis", "New Orleans",
    "Oklahoma City", "El Paso",
    # New batch — more cities not yet searched
    "Washington", "Baltimore", "Las Vegas", "Orlando", "Cincinnati",
    "Pittsburgh", "St. Louis", "Cleveland", "Milwaukee", "Louisville",
    "Virginia Beach", "Sacramento", "Colorado Springs", "Honolulu",
    "Fort Worth", "Fresno", "Mesa", "Long Beach", "Bakersfield",
    "Aurora", "Chandler", "Gilbert", "Irvine", "Plano",
    "Henderson", "Stockton", "Riverside", "Santa Ana", "Anaheim",
    # Already done — keep at bottom for --cities N filtering
    "Los Angeles", "New York", "Chicago", "Houston", "Phoenix",
    "Dallas", "San Francisco", "Miami", "Atlanta", "Seattle",
    "Boston", "Philadelphia", "San Antonio", "San Jose", "Detroit",
    "Charlotte", "San Diego", "Tampa", "Portland", "Minneapolis",
    "Boise", "Savannah", "Tucson", "Omaha", "Albuquerque",
    "Austin", "Denver", "Nashville",
]

# Job titles (same as original Apify run)
JOB_TITLES = [
    "personal trainer",
    "fitness coach",
    "online fitness coach",
    "nutrition coach",
    "health coach",
    "transformation coach",
    "online coach",
]

# Reject keywords (from clean_leads.py)
REJECT_KEYWORDS = [
    "day spa", "eating disorder", "swim club", "swimming", "gymnastics",
    "martial arts", "dance studio", "chiropractic", "chiropractor",
    "physical therapy", "physiotherapy", "massage therapy", "salon",
    "beauty", "barbershop", "veterinary", "dental", "dentist",
    "real estate", "insurance", "accounting", "law firm", "attorney",
    "restaurant", "cafe", "coffee shop", "tattoo", "piercing",
    "reiki", "acupuncture", "mental health care", "psychiatr",
    "counseling & mental health",
]

# Good job titles (from clean_leads.py)
GOOD_TITLES = [
    "personal trainer", "fitness coach", "coach", "trainer",
    "owner", "founder", "nutrition coach", "health coach",
    "strength coach", "conditioning", "wellness coach",
]

# Online coaching keywords
ONLINE_KEYWORDS = [
    "online coach", "online training", "online personal training",
    "virtual", "remote training", "online fitness", "online program",
    "transformation coach", "macro coach", "nutrition coach",
    "online coaching", "1:1 coaching", "one on one coaching",
    "personalized coaching", "custom program", "individualized",
]


# ---------------------------------------------------------------------------
# APIFY API (reused from find_instagram_leads.py)
# ---------------------------------------------------------------------------

def apify_request(api_key, method, path, data=None):
    """Make a request to the Apify API."""
    url = f"https://api.apify.com/v2/{path}"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        print(f"  [ERROR] Apify API {e.code}: {error_body[:500]}")
        return None
    except Exception as e:
        print(f"  [ERROR] Apify request failed: {e}")
        return None


def run_apify_actor(api_key, actor_id, run_input, poll_interval=10, timeout=600):
    """Run an Apify actor and wait for it to finish. Returns dataset items."""
    api_actor_id = actor_id.replace("/", "~")

    result = apify_request(api_key, "POST", f"acts/{api_actor_id}/runs", run_input)
    if not result or "data" not in result:
        print("  [ERROR] Failed to start actor run")
        return []

    run_id = result["data"]["id"]
    dataset_id = result["data"]["defaultDatasetId"]
    print(f"  Run started: {run_id}")

    # Poll until finished
    elapsed = 0
    while elapsed < timeout:
        time.sleep(poll_interval)
        elapsed += poll_interval
        status_result = apify_request(api_key, "GET", f"acts/{api_actor_id}/runs/{run_id}")
        if not status_result or "data" not in status_result:
            print("  [ERROR] Failed to check run status")
            return []

        status = status_result["data"]["status"]
        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break
        print(f"  Status: {status} ({elapsed}s)...")

    if status != "SUCCEEDED":
        print(f"  [ERROR] Actor run {status}")
        return []

    print(f"  Actor finished ({elapsed}s)")

    # Fetch dataset items
    items = []
    offset = 0
    page_limit = 1000
    while True:
        dataset_result = apify_request(
            api_key, "GET",
            f"datasets/{dataset_id}/items?offset={offset}&limit={page_limit}&format=json"
        )
        if not dataset_result:
            break
        if isinstance(dataset_result, list):
            items.extend(dataset_result)
            if len(dataset_result) < page_limit:
                break
            offset += page_limit
        else:
            break

    return items


# ---------------------------------------------------------------------------
# SUPABASE HELPERS
# ---------------------------------------------------------------------------

def sb_get(sb_url, sb_key, endpoint):
    """GET from Supabase REST API."""
    req = urllib.request.Request(
        f"{sb_url}/rest/v1/{endpoint}",
        headers={"apikey": sb_key, "Authorization": f"Bearer {sb_key}"}
    )
    return json.loads(urllib.request.urlopen(req).read())


def sb_post_batch(sb_url, sb_key, table, rows):
    """POST batch of rows to Supabase. Returns (inserted, skipped)."""
    body = json.dumps(rows).encode("utf-8")
    full_url = f"{sb_url}/rest/v1/{table}?on_conflict=email"
    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=ignore-duplicates",
    }

    req = urllib.request.Request(full_url, data=body, headers=headers, method="POST")
    try:
        urllib.request.urlopen(req)
        return len(rows), 0
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        if "duplicate" in error_body.lower() or e.code == 409:
            return 0, len(rows)
        print(f"  [ERROR] Supabase POST: {e.code} - {error_body[:200]}")
        return 0, 0
    except Exception as e:
        print(f"  [ERROR] Supabase POST: {e}")
        return 0, 0


def fetch_existing_emails(sb_url, sb_key):
    """Fetch all existing emails from leads table."""
    emails = set()
    offset = 0
    while True:
        rows = sb_get(sb_url, sb_key, f"leads?select=email&limit=1000&offset={offset}")
        for r in rows:
            if r.get("email"):
                emails.add(r["email"].lower().strip())
        if len(rows) < 1000:
            break
        offset += 1000
    return emails


# ---------------------------------------------------------------------------
# LEAD CLEANING (from clean_leads.py)
# ---------------------------------------------------------------------------

def is_valid_email(email):
    if not email or email.strip() == "" or email.strip().lower() == "null":
        return False
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()) is not None


def check_reject(lead):
    """Return rejection reason or None if lead is OK."""
    email = lead.get("email", "")
    if not is_valid_email(email):
        return "no_email"

    # Check industry
    industry = (lead.get("industry", "") or "").lower()
    if industry and "fitness" not in industry and "health" not in industry and "wellness" not in industry:
        title = (lead.get("job_title", "") or "").lower()
        if not any(t in title for t in GOOD_TITLES):
            return f"wrong_industry:{industry}"

    # Check reject keywords
    description = (lead.get("company_description", "") or "").lower()
    keywords = (lead.get("keywords", "") or "").lower()
    company_name = (lead.get("company_name", "") or "").lower()
    headline = (lead.get("headline", "") or "").lower()
    combined = f"{description} {keywords} {company_name} {headline}"

    for reject in REJECT_KEYWORDS:
        if reject in combined:
            return f"rejected_keyword:{reject}"

    # US only
    country = (lead.get("country", "") or "").strip()
    if country and country != "United States":
        return f"wrong_country:{country}"

    return None


def score_online(lead):
    """Score how likely this is an online coach."""
    description = (lead.get("company_description", "") or "").lower()
    keywords = (lead.get("keywords", "") or "").lower()
    headline = (lead.get("headline", "") or "").lower()
    title = (lead.get("job_title", "") or "").lower()
    combined = f"{description} {keywords} {headline} {title}"

    score = 0
    for kw in ONLINE_KEYWORDS:
        if kw in combined:
            score += 1

    if score >= 2:
        return "likely_online"
    elif score == 1:
        return "maybe_online"
    return "likely_inperson"


def classify_segment(lead):
    """Classify lead into a segment."""
    description = (lead.get("company_description", "") or "").lower()
    keywords = (lead.get("keywords", "") or "").lower()
    title = (lead.get("job_title", "") or "").lower()
    combined = f"{description} {keywords} {title}"

    company_size = lead.get("company_size", "")
    try:
        size = int(company_size) if company_size else 0
    except ValueError:
        size = 0

    if any(kw in combined for kw in ["nutrition", "macro", "meal plan"]):
        return "nutrition_coach"
    if any(kw in combined for kw in ["trainerize", "truecoach", "ptminder", "mindbody"]):
        return "tool_frustrated"
    if size >= 20:
        return "scaling_coach"
    if any(kw in combined for kw in ["premium", "luxury", "elite", "high end", "vip"]):
        return "premium_coach"
    return "general_coach"


def clean_and_map_lead(raw):
    """Clean a raw Apify lead and map to Supabase schema. Returns dict or None."""
    reason = check_reject(raw)
    if reason:
        return None, reason

    email = (raw.get("email", "") or "").strip().lower()
    online_status = score_online(raw)
    segment = classify_segment(raw)

    return {
        "email": email,
        "first_name": (raw.get("first_name", "") or "").strip(),
        "last_name": (raw.get("last_name", "") or "").strip(),
        "company_name": (raw.get("company_name", "") or "").strip(),
        "website": (raw.get("company_website", "") or "").strip(),
        "linkedin": (raw.get("linkedin", "") or "").strip(),
        "job_title": (raw.get("job_title", "") or "").strip(),
        "city": (raw.get("city", "") or "").strip(),
        "state": (raw.get("state", "") or "").strip(),
        "country": (raw.get("country", "") or "").strip(),
        "company_size": str(raw.get("company_size", "") or "").strip(),
        "platform": "apify_leads_finder",
        "online_status": online_status,
        "segment": segment,
    }, None


# ---------------------------------------------------------------------------
# PIPELINE STEP RUNNER
# ---------------------------------------------------------------------------

def run_pipeline_step(name, cmd, cwd):
    """Run a subprocess and stream output. Returns True on success."""
    print(f"\n{'='*60}")
    print(f"PIPELINE STEP: {name}")
    print(f"{'='*60}")
    print(f"  Command: {' '.join(cmd)}")
    print(f"  Working dir: {cwd}")
    print()

    proc = subprocess.run(cmd, cwd=cwd, capture_output=False)

    if proc.returncode != 0:
        print(f"\n  [WARNING] {name} exited with code {proc.returncode}")
        return False

    print(f"\n  {name} completed successfully")
    return True


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def fetch_apify_dataset(api_key, dataset_id):
    """Fetch all items from an existing Apify dataset."""
    items = []
    offset = 0
    page_limit = 1000
    while True:
        result = apify_request(
            api_key, "GET",
            f"datasets/{dataset_id}/items?offset={offset}&limit={page_limit}&format=json"
        )
        if not result:
            break
        if isinstance(result, list):
            items.extend(result)
            if len(result) < page_limit:
                break
            offset += page_limit
        else:
            break
    return items


def main():
    # Parse args
    args = sys.argv[1:]
    max_cities = len(CITIES)
    leads_per_city = 200
    skip_enrich = False
    skip_instantly = False
    dry_run = False
    audit_only = False
    dataset_id = None

    i = 0
    while i < len(args):
        if args[i] == "--cities" and i + 1 < len(args):
            max_cities = int(args[i + 1])
            i += 2
        elif args[i] == "--leads-per-city" and i + 1 < len(args):
            leads_per_city = int(args[i + 1])
            i += 2
        elif args[i] == "--skip-enrich":
            skip_enrich = True
            i += 1
        elif args[i] == "--skip-instantly":
            skip_instantly = True
            i += 1
        elif args[i] == "--dry-run":
            dry_run = True
            i += 1
        elif args[i] == "--audit-only":
            audit_only = True
            i += 1
        elif args[i] == "--dataset" and i + 1 < len(args):
            dataset_id = args[i + 1]
            i += 2
        else:
            print(f"Unknown argument: {args[i]}")
            i += 1

    # Load env
    env = load_env()
    apify_key = env.get("APIFY_API_KEY")
    sb_url = env.get("SUPABASE_URL")
    sb_key = env.get("SUPABASE_KEY")

    if not apify_key:
        print("ERROR: APIFY_API_KEY not found in .env")
        sys.exit(1)
    if not sb_url or not sb_key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY required in .env")
        sys.exit(1)

    cities = CITIES[:max_cities]
    estimated_raw = len(cities) * leads_per_city
    estimated_cost = estimated_raw * 0.0015

    print("=" * 60)
    print("LEAD PIPELINE — Find by City → Dedup → Clean → Enrich → Push")
    print("=" * 60)
    if dataset_id:
        print(f"  Mode:            Resume from dataset {dataset_id}")
    else:
        print(f"  Cities:          {len(cities)}")
        print(f"  Leads/city:      {leads_per_city}")
        print(f"  Est. raw leads:  ~{estimated_raw}")
        print(f"  Est. Apify cost: ~${estimated_cost:.2f}")
    print(f"  Skip enrichment: {skip_enrich}")
    print(f"  Skip Instantly:  {skip_instantly}")
    print(f"  Dry run:         {dry_run}")
    print()

    if dry_run and not dataset_id:
        print("Cities to search:")
        for c in cities:
            print(f"  - {c}")
        print(f"\nEstimated pipeline cost (Apify + Tavily + GPT): ~${estimated_cost + estimated_raw * 0.012:.2f}")
        print("Run without --dry-run to execute.")
        return

    # -----------------------------------------------------------------------
    # STEP 1: Fetch existing emails for dedup
    # -----------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 1: Fetching existing emails from Supabase...")
    print("=" * 60)

    existing_emails = fetch_existing_emails(sb_url, sb_key)
    print(f"  Existing leads in DB: {len(existing_emails)}")

    # -----------------------------------------------------------------------
    # STEP 2: Find leads via Apify (or load from existing dataset)
    # -----------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 2: Finding leads via Apify")
    print("=" * 60)

    if dataset_id:
        # Resume from existing dataset
        print(f"  Loading from dataset: {dataset_id}")
        all_raw_leads = fetch_apify_dataset(apify_key, dataset_id)
    else:
        # Run per-city with correct parameter names:
        #   contact_job_title, contact_location, contact_city, company_industry, size, email_status, fetch_count
        all_raw_leads = []
        for ci, city_name in enumerate(cities, 1):
            print(f"\n  [{ci}/{len(cities)}] Searching: {city_name} ({leads_per_city} leads)")

            # Actor docs: "If you want to target a specific city, leave Location empty
            # and enter the city in the City box."
            run_input = {
                "fetch_count": leads_per_city,
                "contact_job_title": JOB_TITLES,
                "contact_city": [city_name.lower()],
                "company_industry": ["health, wellness & fitness"],
                "size": ["1-10", "11-20", "21-50"],
                "email_status": ["validated"],
            }

            # ~12 sec per lead for email verification, min 10 min per city
            city_timeout = max(600, leads_per_city * 12)

            city_leads = run_apify_actor(apify_key, "code_crafter/leads-finder", run_input,
                                         poll_interval=10, timeout=city_timeout)
            print(f"  Got {len(city_leads)} leads from {city_name}")
            all_raw_leads.extend(city_leads)

    print(f"\n  Total raw leads from Apify: {len(all_raw_leads)}")

    # -----------------------------------------------------------------------
    # STEP 3: Dedup + Clean
    # -----------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 3: Dedup + Clean")
    print("=" * 60)

    seen_emails = set()
    cleaned_leads = []
    reject_counts = {}
    dupes_existing = 0
    dupes_batch = 0

    for raw in all_raw_leads:
        email = (raw.get("email", "") or "").strip().lower()

        # Dedup against existing DB
        if email in existing_emails:
            dupes_existing += 1
            continue

        # Dedup within this batch
        if email in seen_emails:
            dupes_batch += 1
            continue

        if is_valid_email(email):
            seen_emails.add(email)

        # Clean and qualify
        cleaned, reason = clean_and_map_lead(raw)
        if reason:
            bucket = reason.split(":")[0]
            reject_counts[bucket] = reject_counts.get(bucket, 0) + 1
            continue

        cleaned_leads.append(cleaned)

    print(f"  Raw leads:              {len(all_raw_leads)}")
    print(f"  Dupes (already in DB):  {dupes_existing}")
    print(f"  Dupes (within batch):   {dupes_batch}")
    for reason, count in sorted(reject_counts.items(), key=lambda x: -x[1]):
        print(f"  Rejected ({reason}): {count}")
    print(f"  Net new cleaned leads:  {len(cleaned_leads)}")

    if not cleaned_leads:
        print("\nNo new leads to process. Exiting.")
        return

    # Show sample (20 random leads)
    import random
    sample_size = min(20, len(cleaned_leads))
    sample = random.sample(cleaned_leads, sample_size)
    print(f"\n  Sample leads ({sample_size} random):")
    for j, lead in enumerate(sample, 1):
        print(f"    {j}. {lead['first_name']} {lead['last_name']} — {lead['job_title']}")
        print(f"       {lead['company_name']} ({lead['company_size']} emp) | {lead['city']}, {lead['state']}")
        print(f"       {lead['email']} | {lead['segment']}")

    if audit_only:
        print("\n  --audit-only mode: stopping before Supabase push.")
        print("  Review the sample above. If data looks good, run again without --audit-only.")
        return

    # -----------------------------------------------------------------------
    # STEP 4: Push to Supabase
    # -----------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("STEP 4: Pushing to Supabase")
    print("=" * 60)

    total_inserted = 0
    total_skipped = 0
    batch_size = 50

    for i in range(0, len(cleaned_leads), batch_size):
        batch = cleaned_leads[i:i + batch_size]
        inserted, skipped = sb_post_batch(sb_url, sb_key, "leads", batch)
        total_inserted += inserted
        total_skipped += skipped
        print(f"  Batch {i // batch_size + 1}: {inserted} inserted, {skipped} skipped")

    print(f"\n  Total inserted: {total_inserted}")
    print(f"  Total skipped:  {total_skipped}")

    if total_inserted == 0:
        print("\nNo new leads inserted. Skipping enrichment.")
        return

    # -----------------------------------------------------------------------
    # STEP 5-7: Run enrichment pipeline
    # -----------------------------------------------------------------------
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    if not skip_enrich:
        # Step 5: Scrape websites
        run_pipeline_step(
            "Website Scraping",
            [sys.executable, "jakub/execution/scrape_websites.py",
             "--use-tavily", "--use-ai", "--use-linkedin",
             "--limit", str(total_inserted + 100),
             "--concurrency", "10"],
            cwd=project_root,
        )

        # Step 6: AI Enrichment
        run_pipeline_step(
            "AI Enrichment",
            [sys.executable, "jakub/execution/enrich_with_ai.py",
             "--limit", str(total_inserted + 100),
             "--concurrency", "20"],
            cwd=project_root,
        )

        if not skip_instantly:
            # Step 7: Push to Instantly
            run_pipeline_step(
                "Push to Instantly",
                [sys.executable, "jakub/execution/push_to_instantly.py"],
                cwd=project_root,
            )
    else:
        print("\n  Skipping enrichment (--skip-enrich)")

    # -----------------------------------------------------------------------
    # SUMMARY
    # -----------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    print(f"  Cities searched:       {len(cities)}")
    print(f"  Raw leads from Apify:  {len(all_raw_leads)}")
    print(f"  Duplicates removed:    {dupes_existing + dupes_batch}")
    print(f"  Rejected (quality):    {sum(reject_counts.values())}")
    print(f"  New leads in Supabase: {total_inserted}")
    if not skip_enrich:
        print(f"  Enrichment:            completed")
    if not skip_enrich and not skip_instantly:
        print(f"  Pushed to Instantly:   completed")
    print("=" * 60)


if __name__ == "__main__":
    main()
