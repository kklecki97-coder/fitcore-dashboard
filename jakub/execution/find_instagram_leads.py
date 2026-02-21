"""
find_instagram_leads.py — Find fitness coach leads on Instagram via Apify.

Usage:
    python3 jakub/execution/find_instagram_leads.py [--mode hashtag|search|both] [--limit 100] [--output csv|supabase|both] [--dry-run]

Pipeline:
  1. Search Instagram hashtags and/or keywords to find coach usernames
  2. Scrape full profile details for each username
  3. Filter by ICP criteria (follower count, bio keywords, business account, etc.)
  4. Export to CSV and/or push to Supabase

Modes:
  --mode hashtag   Search hashtags like #fitnesscoach, #onlinecoaching (default)
  --mode search    Search keywords like "fitness coach", "personal trainer"
  --mode both      Run both hashtag and keyword search (more leads, more credits)

Options:
  --limit N        Max results per hashtag/keyword (default: 100)
  --output csv     Save to CSV file only (default)
  --output supabase Push to Supabase only
  --output both    Save to CSV and push to Supabase
  --dry-run        Show what would be scraped without calling Apify
  --min-followers N  Minimum follower count (default: 1000)
  --max-followers N  Maximum follower count (default: 50000)

Apify actors used:
  - apify/instagram-hashtag-scraper — find posts by hashtag, extract usernames
  - apify/instagram-search-scraper — find profiles by keyword search
  - apify/instagram-profile-scraper — get full profile details

Costs (Apify free tier = $5/month):
  - Hashtag scraper: ~$0.0004/post after first 60 free per hashtag
  - Profile scraper: ~$1.60-2.60 per 1,000 profiles
  - Typical run (5 hashtags × 100 results + profile scrape): ~$1-2

Requires .env with:
    APIFY_API_KEY=apify_api_...
    SUPABASE_URL=https://xxxxx.supabase.co (only for --output supabase/both)
    SUPABASE_KEY=sb_publishable_... (only for --output supabase/both)
"""

import sys
import os
import json
import csv
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone


# --- ENV ---
def load_env(env_path=".env"):
    env = {}
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    env[key.strip()] = val.strip()
    return env


# --- APIFY API ---
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
        error_body = e.read().decode("utf-8") if e.read else ""
        print(f"  [ERROR] Apify API {e.code}: {error_body[:500]}")
        return None
    except Exception as e:
        print(f"  [ERROR] Apify request failed: {e}")
        return None


def run_apify_actor(api_key, actor_id, run_input, poll_interval=5):
    """Run an Apify actor and wait for it to finish. Returns dataset items."""
    print(f"  Starting actor: {actor_id}")
    print(f"  Input: {json.dumps(run_input, indent=2)[:500]}")

    # Start the actor run (Apify REST API uses ~ instead of / in actor IDs)
    api_actor_id = actor_id.replace("/", "~")
    result = apify_request(api_key, "POST", f"acts/{api_actor_id}/runs", run_input)
    if not result or "data" not in result:
        print("  [ERROR] Failed to start actor run")
        return []

    run_id = result["data"]["id"]
    dataset_id = result["data"]["defaultDatasetId"]
    print(f"  Run started: {run_id}")

    # Poll until finished
    while True:
        time.sleep(poll_interval)
        status_result = apify_request(api_key, "GET", f"acts/{api_actor_id}/runs/{run_id}")
        if not status_result or "data" not in status_result:
            print("  [ERROR] Failed to check run status")
            return []

        status = status_result["data"]["status"]
        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break
        print(f"  Status: {status}...")

    if status != "SUCCEEDED":
        print(f"  [ERROR] Actor run {status}")
        return []

    print(f"  Actor finished successfully")

    # Fetch dataset items (paginated)
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

    print(f"  Retrieved {len(items)} items from dataset")
    return items


# --- HASHTAG SEARCH ---
HASHTAGS = [
    "fitnesscoach",
    "onlinecoach",
    "onlinepersonaltrainer",
    "personaltrainer",
    "onlinefitnesscoach",
    "fitnessbusiness",
    "nutritioncoach",
    "transformationcoach",
    "coachlife",
    "onlinecoaching",
]

def search_hashtags(api_key, limit_per_hashtag=100):
    """Search Instagram hashtags and extract unique usernames."""
    print(f"\n{'='*60}")
    print(f"STEP 1: Searching {len(HASHTAGS)} hashtags ({limit_per_hashtag} results each)")
    print(f"{'='*60}")

    run_input = {
        "hashtags": HASHTAGS,
        "resultsLimit": limit_per_hashtag,
    }

    items = run_apify_actor(api_key, "apify/instagram-hashtag-scraper", run_input)

    usernames = set()
    for item in items:
        username = item.get("ownerUsername")
        if username:
            usernames.add(username)

    print(f"\n  Found {len(usernames)} unique usernames from hashtag search")
    return usernames


# --- KEYWORD SEARCH ---
SEARCH_KEYWORDS = [
    "online fitness coach",
    "personal trainer online",
    "fitness coaching",
    "online nutrition coach",
    "fitness coach USA",
]

def search_keywords(api_key, limit_per_keyword=50):
    """Search Instagram by keyword and extract usernames."""
    print(f"\n{'='*60}")
    print(f"STEP 1b: Searching {len(SEARCH_KEYWORDS)} keywords ({limit_per_keyword} results each)")
    print(f"{'='*60}")

    usernames = set()
    for keyword in SEARCH_KEYWORDS:
        print(f"\n  Searching: '{keyword}'")
        run_input = {
            "search": keyword,
            "searchType": "user",
            "searchLimit": limit_per_keyword,
        }

        items = run_apify_actor(api_key, "apify/instagram-search-scraper", run_input)
        for item in items:
            username = item.get("username")
            if username:
                usernames.add(username)

    print(f"\n  Found {len(usernames)} unique usernames from keyword search")
    return usernames


# --- PROFILE SCRAPING ---
def scrape_profiles(api_key, usernames):
    """Scrape full profile details for a list of usernames."""
    username_list = list(usernames)
    print(f"\n{'='*60}")
    print(f"STEP 2: Scraping {len(username_list)} profiles")
    print(f"{'='*60}")

    # Apify can handle large batches, but we chunk to avoid timeouts
    all_profiles = []
    chunk_size = 200
    for i in range(0, len(username_list), chunk_size):
        chunk = username_list[i:i + chunk_size]
        print(f"\n  Batch {i // chunk_size + 1}: {len(chunk)} profiles")

        run_input = {
            "usernames": chunk,
        }

        profiles = run_apify_actor(api_key, "apify/instagram-profile-scraper", run_input)
        all_profiles.extend(profiles)

    print(f"\n  Scraped {len(all_profiles)} profiles total")
    return all_profiles


# --- FILTERING ---
# Bio keywords that indicate online coaching
POSITIVE_BIO_KEYWORDS = [
    "coach", "coaching", "trainer", "training", "pt ",
    "personal trainer", "online coach", "fitness coach",
    "nutrition", "transform", "1:1", "1-on-1", "one on one",
    "apply", "dm me", "link in bio", "programs", "clients",
    "accountability", "macro", "meal plan", "workout plan",
    "fat loss", "weight loss", "body transformation",
    "certified", "nasm", "ace ", "issa", "nsca",
]

# Bio keywords that disqualify
NEGATIVE_BIO_KEYWORDS = [
    "gym owner", "gym chain", "franchise",
    "business coach", "life coach", "mindset coach",
    "real estate", "crypto", "forex", "mlm",
    "photographer", "model", "influencer",
    "parody", "fan page", "meme",
]

# US state abbreviations and cities for location filtering
US_INDICATORS = [
    # State abbreviations
    " al", " ak", " az", " ar", " ca", " co", " ct", " de", " fl", " ga",
    " hi", " id", " il", " in", " ia", " ks", " ky", " la", " me", " md",
    " ma", " mi", " mn", " ms", " mo", " mt", " ne", " nv", " nh", " nj",
    " nm", " ny", " nc", " nd", " oh", " ok", " or", " pa", " ri", " sc",
    " sd", " tn", " tx", " ut", " vt", " va", " wa", " wv", " wi", " wy",
    # Common large city mentions
    "usa", "united states", "new york", "los angeles", "chicago", "houston",
    "phoenix", "philadelphia", "san antonio", "san diego", "dallas", "austin",
    "miami", "atlanta", "denver", "seattle", "boston", "nashville", "portland",
    "las vegas", "charlotte", "san francisco", "tampa", "orlando", "minneapolis",
    # Timezone references
    "est", "cst", "mst", "pst", "eastern", "central", "pacific",
]


def filter_profiles(profiles, min_followers=1000, max_followers=50000):
    """Filter scraped profiles by ICP criteria."""
    print(f"\n{'='*60}")
    print(f"STEP 3: Filtering {len(profiles)} profiles by ICP criteria")
    print(f"{'='*60}")
    print(f"  Follower range: {min_followers:,} - {max_followers:,}")

    qualified = []
    reasons_rejected = {
        "private": 0,
        "too_few_followers": 0,
        "too_many_followers": 0,
        "no_bio": 0,
        "negative_keywords": 0,
        "no_coaching_signals": 0,
        "inactive": 0,
    }

    for p in profiles:
        # Skip private accounts
        if p.get("private", True):
            reasons_rejected["private"] += 1
            continue

        # Follower count filter
        followers = p.get("followersCount", 0)
        if followers < min_followers:
            reasons_rejected["too_few_followers"] += 1
            continue
        if followers > max_followers:
            reasons_rejected["too_many_followers"] += 1
            continue

        # Must have a bio
        bio = (p.get("biography") or "").lower()
        if not bio or len(bio) < 10:
            reasons_rejected["no_bio"] += 1
            continue

        # Check for disqualifying keywords
        has_negative = False
        for kw in NEGATIVE_BIO_KEYWORDS:
            if kw in bio:
                has_negative = True
                break
        if has_negative:
            reasons_rejected["negative_keywords"] += 1
            continue

        # Must have at least one positive coaching signal
        has_positive = False
        for kw in POSITIVE_BIO_KEYWORDS:
            if kw in bio:
                has_positive = True
                break
        # Also check business category
        biz_cat = (p.get("businessCategoryName") or "").lower()
        if any(term in biz_cat for term in ["trainer", "coach", "fitness", "gym", "health"]):
            has_positive = True
        if not has_positive:
            reasons_rejected["no_coaching_signals"] += 1
            continue

        # Activity check — at least 10 posts
        if p.get("postsCount", 0) < 10:
            reasons_rejected["inactive"] += 1
            continue

        # Build lead record
        lead = {
            "instagram_handle": p.get("username", ""),
            "full_name": p.get("fullName", ""),
            "bio": p.get("biography", ""),
            "follower_count": followers,
            "following_count": p.get("followsCount", 0),
            "post_count": p.get("postsCount", 0),
            "website": p.get("externalUrl", ""),
            "is_business_account": p.get("isBusinessAccount", False),
            "business_category": p.get("businessCategoryName", ""),
            "is_verified": p.get("verified", False),
            "profile_pic_url": p.get("profilePicUrlHD") or p.get("profilePicUrl", ""),
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

        # Try to detect US-based
        bio_lower = bio
        location_text = (p.get("locationName") or "").lower()
        combined = f"{bio_lower} {location_text}"
        is_us = any(indicator in combined for indicator in US_INDICATORS)
        lead["likely_us"] = is_us

        # Score the lead (simple heuristic)
        score = 0
        if p.get("isBusinessAccount"):
            score += 2
        if p.get("externalUrl"):
            score += 2
        if "online" in bio:
            score += 2
        if any(term in bio for term in ["1:1", "1-on-1", "apply", "dm me", "clients"]):
            score += 2
        if 5000 <= followers <= 30000:
            score += 1  # Sweet spot
        if is_us:
            score += 1
        lead["score"] = score

        qualified.append(lead)

    # Print rejection summary
    print(f"\n  Rejection breakdown:")
    for reason, count in sorted(reasons_rejected.items(), key=lambda x: -x[1]):
        if count > 0:
            print(f"    {reason}: {count}")
    print(f"\n  Qualified leads: {len(qualified)} / {len(profiles)}")

    # Sort by score descending
    qualified.sort(key=lambda x: -x["score"])

    return qualified


# --- OUTPUT: CSV ---
def save_to_csv(leads, output_path):
    """Save leads to a CSV file."""
    if not leads:
        print("  No leads to save")
        return

    fieldnames = [
        "instagram_handle", "full_name", "bio", "follower_count",
        "following_count", "post_count", "website", "is_business_account",
        "business_category", "is_verified", "likely_us", "score",
        "scraped_at",
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(leads)

    print(f"  Saved {len(leads)} leads to {output_path}")


# --- OUTPUT: SUPABASE ---
def push_to_supabase(leads, env):
    """Push leads to Supabase instagram_leads table."""
    url = env.get("SUPABASE_URL")
    key = env.get("SUPABASE_KEY")

    if not url or not key:
        print("  [ERROR] SUPABASE_URL and SUPABASE_KEY required in .env")
        return

    print(f"\n  Pushing {len(leads)} leads to Supabase (instagram_leads table)")
    print(f"  NOTE: You need to create the table first. Run this SQL in Supabase:")
    print(f"""
    CREATE TABLE IF NOT EXISTS instagram_leads (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        instagram_handle TEXT UNIQUE NOT NULL,
        full_name TEXT,
        bio TEXT,
        follower_count INTEGER,
        following_count INTEGER,
        post_count INTEGER,
        website TEXT,
        is_business_account BOOLEAN DEFAULT FALSE,
        business_category TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        likely_us BOOLEAN DEFAULT FALSE,
        score INTEGER DEFAULT 0,
        scraped_at TIMESTAMPTZ,
        -- Outreach tracking fields
        status TEXT DEFAULT 'new',  -- new, engaged, dmed, replied, call_booked, closed, dead
        followed_at TIMESTAMPTZ,
        engaged_at TIMESTAMPTZ,
        dmed_at TIMESTAMPTZ,
        follow_up_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    # Push in batches
    batch_size = 50
    success = 0
    dupes = 0
    errors = 0

    for i in range(0, len(leads), batch_size):
        batch = leads[i:i + batch_size]

        body = json.dumps(batch).encode("utf-8")
        full_url = f"{url}/rest/v1/instagram_leads?on_conflict=instagram_handle"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal,resolution=ignore-duplicates",
        }

        req = urllib.request.Request(full_url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                success += len(batch)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            if "duplicate" in error_body.lower() or e.code == 409:
                dupes += len(batch)
            else:
                errors += len(batch)
                print(f"  [ERROR] Batch {i // batch_size + 1}: {e.code} - {error_body[:200]}")
        except Exception as e:
            errors += len(batch)
            print(f"  [ERROR] Batch {i // batch_size + 1}: {e}")

    print(f"  Results: {success} inserted, {dupes} duplicates skipped, {errors} errors")


# --- COST ESTIMATION ---
def estimate_cost(mode, limit_per_source, num_usernames):
    """Estimate Apify credit cost for a run."""
    hashtag_cost = 0
    search_cost = 0
    profile_cost = 0

    if mode in ("hashtag", "both"):
        # ~$0.0004 per item after 60 free per hashtag
        total_items = len(HASHTAGS) * limit_per_source
        free_items = len(HASHTAGS) * 60
        paid_items = max(0, total_items - free_items)
        hashtag_cost = paid_items * 0.0004

    if mode in ("search", "both"):
        search_cost = len(SEARCH_KEYWORDS) * limit_per_source * 0.0026

    # Profile scraping: ~$2.00 per 1,000 profiles
    profile_cost = (num_usernames / 1000) * 2.00

    total = hashtag_cost + search_cost + profile_cost
    return {
        "hashtag_cost": round(hashtag_cost, 2),
        "search_cost": round(search_cost, 2),
        "profile_cost": round(profile_cost, 2),
        "total": round(total, 2),
    }


# --- MAIN ---
def main():
    # Parse args
    args = sys.argv[1:]
    mode = "hashtag"
    limit = 100
    output = "csv"
    dry_run = False
    min_followers = 1000
    max_followers = 50000

    i = 0
    while i < len(args):
        if args[i] == "--mode" and i + 1 < len(args):
            mode = args[i + 1]
            i += 2
        elif args[i] == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])
            i += 2
        elif args[i] == "--output" and i + 1 < len(args):
            output = args[i + 1]
            i += 2
        elif args[i] == "--min-followers" and i + 1 < len(args):
            min_followers = int(args[i + 1])
            i += 2
        elif args[i] == "--max-followers" and i + 1 < len(args):
            max_followers = int(args[i + 1])
            i += 2
        elif args[i] == "--dry-run":
            dry_run = True
            i += 1
        else:
            print(f"Unknown argument: {args[i]}")
            i += 1

    if mode not in ("hashtag", "search", "both"):
        print("Error: --mode must be 'hashtag', 'search', or 'both'")
        sys.exit(1)

    if output not in ("csv", "supabase", "both"):
        print("Error: --output must be 'csv', 'supabase', or 'both'")
        sys.exit(1)

    # Load environment
    env = load_env()
    api_key = env.get("APIFY_API_KEY")
    if not api_key:
        print("Error: APIFY_API_KEY not found in .env")
        sys.exit(1)

    print("=" * 60)
    print("INSTAGRAM LEAD FINDER")
    print("=" * 60)
    print(f"  Mode: {mode}")
    print(f"  Limit per source: {limit}")
    print(f"  Output: {output}")
    print(f"  Follower range: {min_followers:,} - {max_followers:,}")
    print(f"  Dry run: {dry_run}")

    if dry_run:
        # Estimate what would happen
        estimated_usernames = 0
        if mode in ("hashtag", "both"):
            estimated_usernames += len(HASHTAGS) * limit * 0.3  # ~30% unique
        if mode in ("search", "both"):
            estimated_usernames += len(SEARCH_KEYWORDS) * limit * 0.5
        estimated_usernames = int(estimated_usernames)

        costs = estimate_cost(mode, limit, estimated_usernames)
        print(f"\n  Estimated unique usernames: ~{estimated_usernames}")
        print(f"  Estimated cost breakdown:")
        print(f"    Hashtag search: ${costs['hashtag_cost']}")
        print(f"    Keyword search: ${costs['search_cost']}")
        print(f"    Profile scraping: ${costs['profile_cost']}")
        print(f"    Total: ~${costs['total']}")
        print(f"\n  Run without --dry-run to execute.")
        return

    # Step 1: Find usernames
    usernames = set()
    if mode in ("hashtag", "both"):
        usernames.update(search_hashtags(api_key, limit))
    if mode in ("search", "both"):
        usernames.update(search_keywords(api_key, limit))

    if not usernames:
        print("\nNo usernames found. Exiting.")
        return

    print(f"\nTotal unique usernames: {len(usernames)}")

    # Step 2: Scrape profiles
    profiles = scrape_profiles(api_key, usernames)

    if not profiles:
        print("\nNo profiles scraped. Exiting.")
        return

    # Step 3: Filter
    leads = filter_profiles(profiles, min_followers, max_followers)

    if not leads:
        print("\nNo leads passed filtering. Try adjusting criteria.")
        return

    # Print top leads preview
    print(f"\n{'='*60}")
    print(f"TOP 10 LEADS (by score)")
    print(f"{'='*60}")
    for lead in leads[:10]:
        us_tag = " [US]" if lead["likely_us"] else ""
        biz_tag = " [BIZ]" if lead["is_business_account"] else ""
        print(f"\n  @{lead['instagram_handle']} (score: {lead['score']}){us_tag}{biz_tag}")
        print(f"    {lead['full_name']} | {lead['follower_count']:,} followers | {lead['post_count']} posts")
        print(f"    Bio: {lead['bio'][:120]}...")
        if lead["website"]:
            print(f"    Website: {lead['website']}")

    # Step 4: Output
    print(f"\n{'='*60}")
    print(f"STEP 4: Saving results")
    print(f"{'='*60}")

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    if output in ("csv", "both"):
        # Save to jakub/.tmp/
        tmp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        csv_path = os.path.join(tmp_dir, f"instagram_leads_{timestamp}.csv")
        save_to_csv(leads, csv_path)

    if output in ("supabase", "both"):
        push_to_supabase(leads, env)

    # Summary
    us_leads = sum(1 for l in leads if l["likely_us"])
    biz_leads = sum(1 for l in leads if l["is_business_account"])
    with_website = sum(1 for l in leads if l["website"])
    avg_score = sum(l["score"] for l in leads) / len(leads) if leads else 0

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"  Profiles found: {len(usernames)}")
    print(f"  Profiles scraped: {len(profiles)}")
    print(f"  Qualified leads: {len(leads)}")
    print(f"  Likely US-based: {us_leads}")
    print(f"  Business accounts: {biz_leads}")
    print(f"  With website: {with_website}")
    print(f"  Average score: {avg_score:.1f}")
    print(f"  Score distribution:")
    for s in range(10, -1, -1):
        count = sum(1 for l in leads if l["score"] == s)
        if count > 0:
            print(f"    Score {s}: {count} leads")


if __name__ == "__main__":
    main()
