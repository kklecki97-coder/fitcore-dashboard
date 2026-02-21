"""
fix_first_names.py — Populate missing first_name in Supabase leads.

Usage:
    python3 jakub/execution/fix_first_names.py [--dry-run]

Strategy (in priority order):
1. Extract from email: "catherine.palmer@..." → Catherine
2. Extract from email: "brandon@..." → Brandon
3. Extract smooshed: "joshpresnell@..." + last_name=Presnell → Josh
4. Fallback: "Hey" — greeting reads "Hey," / subject reads "Hey"

Processes ALL leads with null, empty, or "Hi there" first_name.
Paginates through Supabase (no limit). Runs 20 concurrent updates.

Requires .env with:
    SUPABASE_URL=https://xxxxx.supabase.co
    SUPABASE_KEY=sb_publishable_...
"""

import sys
import os
import json
import re
import asyncio
import aiohttp
import urllib.request
import urllib.error

# Common email prefixes that are NOT first names
GENERIC_PREFIXES = {
    "info", "contact", "hello", "admin", "support", "team", "office",
    "sales", "help", "mail", "enquiries", "bookings", "booking",
    "studio", "fitness", "coach", "training", "gym", "hey",
    "service", "services", "general", "staff", "management",
    "noreply", "no-reply", "donotreply",
    "ceo", "coo", "cfo", "cto", "hr", "pr",
    "advancefitness", "advance", "premier", "elite",
    "conversation", "newsletter", "notify", "notifications",
    "reception", "membership", "enquiry", "welcome",
}

# Common first names to validate against (top 500 US names)
# We don't need the full list — just checking that it LOOKS like a name
def looks_like_name(s):
    """Check if a string looks like a plausible first name."""
    if not s or len(s) < 3 or len(s) > 12:
        return False
    if s.lower() in GENERIC_PREFIXES:
        return False
    # Must be all letters
    if not s.isalpha():
        return False
    # Count vowels (y counts — Crystal, Sherry, Kyndle, etc.)
    vowels = sum(1 for c in s.lower() if c in "aeiouy")
    if len(s) > 3 and vowels == 0:
        return False
    # Reject if it looks like initial+lastname (e.g., "rbutzke", "mtroup")
    if len(s) > 6 and vowels <= 1:
        return False
    return True


def extract_first_name(email, last_name=""):
    """Try to extract a first name from an email address."""
    if not email or "@" not in email:
        return None

    local = email.split("@")[0].lower()

    # Pattern 1: "firstname.lastname@" or "firstname_lastname@"
    if "." in local:
        parts = local.split(".")
        candidate = parts[0].strip()
        # If first part is generic (ceo, info, etc.), try second part
        if candidate in GENERIC_PREFIXES and len(parts) > 1:
            candidate = parts[1].strip()
        if looks_like_name(candidate):
            # Extra check: if last_name matches a later part, we're confident
            if last_name:
                ln = last_name.lower()
                if any(ln.startswith(p) or p.startswith(ln) for p in parts[1:]):
                    return candidate.capitalize()
            return candidate.capitalize()

    if "_" in local:
        parts = local.split("_")
        candidate = parts[0].strip()
        if looks_like_name(candidate):
            return candidate.capitalize()

    # Pattern 2: "firstname@" (single word, no dots/underscores)
    if "." not in local and "_" not in local:
        # Remove trailing numbers: "brandon123" → "brandon"
        name_part = re.sub(r'\d+$', '', local).strip()

        # Check smooshed firstname+lastname FIRST (e.g., "waltermedeiros", "joshpresnell")
        if last_name:
            ln = last_name.lower()
            if name_part.endswith(ln) and len(name_part) > len(ln) + 1:
                candidate = name_part[:len(name_part) - len(ln)]
                if looks_like_name(candidate):
                    return candidate.capitalize()

        # Check if it's initial+lastname pattern (e.g., "rbutzke", "mtroup", "dbelljr")
        # Only reject if the part before the last name is 1-2 chars (an initial, not a name)
        if last_name:
            ln = last_name.lower()
            if ln in name_part:
                prefix = name_part[:name_part.index(ln)]
                if len(prefix) <= 2:
                    return None
            # "mtroup" starts with initial + last name
            if len(name_part) > 2 and name_part[1:].startswith(ln[:4]):
                return None

        # Strip known prefixes: "coachcristina" → "cristina"
        for prefix in ("coach", "trainer"):
            if name_part.startswith(prefix) and len(name_part) > len(prefix) + 2:
                remainder = name_part[len(prefix):]
                if looks_like_name(remainder):
                    return remainder.capitalize()

        if looks_like_name(name_part):
            return name_part.capitalize()

    # Pattern 3: handle hyphens in local part (e.g., "marie-josephine@...")
    if "-" in local and "." not in local and "_" not in local:
        parts = local.split("-")
        candidate = parts[0].strip()
        # Skip if first part is a number (e.g., "conversation-9046")
        if candidate and not candidate[0].isdigit() and looks_like_name(candidate):
            return candidate.capitalize()

    return None


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


async def supabase_update_async(session, url, key, lead_id, data):
    full_url = f"{url}/rest/v1/leads?id=eq.{lead_id}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    try:
        async with session.patch(full_url, headers=headers, json=data) as resp:
            return resp.status in (200, 204)
    except Exception:
        return False


FALLBACK_NAME = "Hey"  # Last resort if no last name either


def fetch_all_leads(sb_url, sb_key, filter_query):
    """Paginate through ALL matching leads (Supabase caps at 1000 per request)."""
    headers = {"apikey": sb_key, "Authorization": f"Bearer {sb_key}"}
    select = "id,email,first_name,last_name,company_name"
    all_leads = []
    offset = 0
    page_size = 1000
    while True:
        url = f"{sb_url}/rest/v1/leads?{filter_query}&select={select}&limit={page_size}&offset={offset}&order=id.asc"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            batch = json.loads(resp.read())
        if not batch:
            break
        all_leads.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_leads


async def main_async():
    dry_run = "--dry-run" in sys.argv

    env = load_env()
    sb_url = env.get("SUPABASE_URL", "")
    sb_key = env.get("SUPABASE_KEY", "")

    if not sb_url or not sb_key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)

    # Fetch ALL leads with null, empty string, or "Hi there" first_name
    print("Fetching leads with missing/placeholder first_name...")
    null_leads = fetch_all_leads(sb_url, sb_key, "first_name=is.null")
    empty_leads = fetch_all_leads(sb_url, sb_key, "first_name=eq.")
    hithere_leads = fetch_all_leads(sb_url, sb_key, "first_name=eq.Hi%20there")
    hey_leads = fetch_all_leads(sb_url, sb_key, "first_name=eq.Hey")

    # Deduplicate
    seen_ids = set()
    leads = []
    for l in null_leads + empty_leads + hithere_leads + hey_leads:
        if l["id"] not in seen_ids:
            seen_ids.add(l["id"])
            leads.append(l)

    print(f"Found {len(leads)} leads to process")
    print(f"  NULL first_name: {len(null_leads)}")
    print(f"  Empty string: {len(empty_leads)}")
    print(f"  'Hi there' placeholder: {len(hithere_leads)}")
    print(f"  'Hey' placeholder: {len(hey_leads)}")
    if dry_run:
        print("DRY RUN — no changes will be written\n")

    # Extract all names first (instant, no API calls)
    to_update = []
    fallback_count = 0
    for lead in leads:
        email = lead.get("email", "")
        last_name = lead.get("last_name", "") or ""
        lead_id = lead.get("id")
        first_name = extract_first_name(email, last_name)
        if first_name:
            to_update.append((lead_id, email, first_name, last_name))
        elif last_name and last_name.strip():
            # Use last name as fallback — "Kellogg," is professional
            fallback = last_name.strip().capitalize()
            to_update.append((lead_id, email, fallback, last_name))
            fallback_count += 1
            if dry_run:
                print(f"  FALLBACK (last name): {email} → '{fallback}'")
        else:
            to_update.append((lead_id, email, FALLBACK_NAME, last_name))
            fallback_count += 1
            if dry_run:
                print(f"  FALLBACK (generic): {email} → '{FALLBACK_NAME}'")

    print(f"  Extracted name: {len(to_update) - fallback_count}")
    print(f"  Fallback '{FALLBACK_NAME}': {fallback_count}")

    if dry_run:
        print()
        for lead_id, email, first_name, last_name in to_update:
            print(f"  {email:<40} → {first_name} (last: {last_name})")
        print(f"\n{'='*50}")
        print(f"FIRST NAME FIX (DRY RUN)")
        print(f"  Would fix: {len(to_update)}")
        print(f"  Fallback: {fallback_count}")
        print(f"{'='*50}")
        return

    # Fire all updates concurrently (20 at a time)
    print(f"\nUpdating {len(to_update)} leads in Supabase (20 concurrent)...")
    semaphore = asyncio.Semaphore(20)
    fixed = 0
    failed = 0

    async with aiohttp.ClientSession() as session:
        async def update_one(lead_id, email, first_name):
            nonlocal fixed, failed
            async with semaphore:
                ok = await supabase_update_async(session, sb_url, sb_key, lead_id, {"first_name": first_name})
                if ok:
                    fixed += 1
                else:
                    failed += 1

        tasks = [update_one(lid, em, fn) for lid, em, fn, _ in to_update]
        await asyncio.gather(*tasks)

    print(f"\n{'='*50}")
    print(f"FIRST NAME FIX COMPLETE")
    print(f"  Total:      {len(leads)}")
    print(f"  Fixed:      {fixed}")
    print(f"  Fallback:   {fallback_count} (set to '{FALLBACK_NAME}')")
    print(f"  Failed:     {failed}")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main_async())
