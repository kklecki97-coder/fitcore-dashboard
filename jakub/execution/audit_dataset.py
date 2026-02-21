"""
audit_dataset.py — Pull an Apify dataset and audit lead quality with strict positive-signal filtering.

Usage:
    python3 jakub/execution/audit_dataset.py Yc8vjXz4KCfq7g3lI
"""

import json
import os
import random
import sys
import urllib.request
import urllib.error


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


# Positive fitness signals — lead MUST match at least one
FITNESS_SIGNALS = [
    "personal trainer", "personal training", "fitness coach", "fitness coaching",
    "online coach", "online coaching", "nutrition coach", "nutrition coaching",
    "health coach", "health coaching", "wellness coach", "wellness coaching",
    "strength coach", "strength training", "transformation coach",
    "macro coach", "weight loss coach", "body transformation",
    "fitness studio", "fitness center", "fitness gym",
    "crossfit", "bootcamp", "boot camp",
    "certified personal trainer", "cpt", "nasm", "ace certified", "issa",
    "group fitness", "fitness instructor", "fitness professional",
    "training studio", "private gym", "gym owner",
    "conditioning coach", "athletic trainer", "sports performance",
    "yoga instructor", "pilates instructor",
    "fit body", "fitlife", "fitfam", "fitness",
    "trainer", "coaching clients", "1-on-1 training", "one on one training",
]

# Company size cap — reject huge corporations
MAX_COMPANY_SIZE = 100


def has_fitness_signal(lead):
    """Check if lead has positive fitness signals in job title, company name, headline, or description."""
    title = (lead.get("job_title", "") or "").lower()
    company = (lead.get("company_name", "") or "").lower()
    headline = (lead.get("headline", "") or "").lower()
    description = (lead.get("company_description", "") or "").lower()
    keywords = (lead.get("keywords", "") or "").lower()
    combined = f"{title} | {company} | {headline} | {description} | {keywords}"

    matched = []
    for signal in FITNESS_SIGNALS:
        if signal in combined:
            matched.append(signal)

    return matched, combined


def check_company_size(lead):
    """Reject if company is too large."""
    size_str = str(lead.get("company_size", "") or "")
    try:
        size = int(size_str)
        if size > MAX_COMPANY_SIZE:
            return False, size
    except ValueError:
        pass
    return True, size_str


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 audit_dataset.py <dataset_id>")
        sys.exit(1)

    dataset_id = sys.argv[1]
    env = load_env()
    api_key = env.get("APIFY_API_KEY")
    if not api_key:
        print("ERROR: APIFY_API_KEY not found in .env")
        sys.exit(1)

    # Fetch dataset
    print(f"Fetching dataset {dataset_id}...")
    items = []
    offset = 0
    while True:
        url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?offset={offset}&limit=1000&format=json"
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                batch = json.loads(resp.read())
                if isinstance(batch, list):
                    items.extend(batch)
                    if len(batch) < 1000:
                        break
                    offset += 1000
                else:
                    break
        except Exception as e:
            print(f"Error fetching: {e}")
            break

    print(f"Total leads in dataset: {len(items)}")
    print()

    # Apply strict positive-signal filter
    passed = []
    failed_no_signal = []
    failed_too_big = []
    failed_no_email = []

    for lead in items:
        email = (lead.get("email", "") or "").strip()
        if not email or "@" not in email:
            failed_no_email.append(lead)
            continue

        size_ok, size_val = check_company_size(lead)
        if not size_ok:
            failed_too_big.append(lead)
            continue

        signals, combined = has_fitness_signal(lead)
        if signals:
            lead["_matched_signals"] = signals
            passed.append(lead)
        else:
            lead["_combined_text"] = combined[:200]
            failed_no_signal.append(lead)

    print("=" * 60)
    print("AUDIT RESULTS (strict positive-signal filter)")
    print("=" * 60)
    print(f"  Total leads:          {len(items)}")
    print(f"  No email:             {len(failed_no_email)}")
    print(f"  Too big (>{MAX_COMPANY_SIZE}): {len(failed_too_big)}")
    print(f"  No fitness signal:    {len(failed_no_signal)}")
    print(f"  PASSED:               {len(passed)} ({len(passed)/len(items)*100:.1f}%)")
    print()

    # Show 20 random PASSED leads
    print("=" * 60)
    print(f"SAMPLE PASSED LEADS (20 random out of {len(passed)})")
    print("=" * 60)
    sample_passed = random.sample(passed, min(20, len(passed)))
    for i, lead in enumerate(sample_passed, 1):
        title = lead.get("job_title", "")
        company = lead.get("company_name", "")
        email = lead.get("email", "")
        city = lead.get("city", "")
        state = lead.get("state", "")
        size = lead.get("company_size", "")
        signals = lead.get("_matched_signals", [])
        print(f"  {i}. {lead.get('first_name', '')} {lead.get('last_name', '')} — {title}")
        print(f"     Company: {company} ({size} emp) | {city}, {state}")
        print(f"     Email: {email}")
        print(f"     Signals: {', '.join(signals[:5])}")
        print()

    # Show 10 random FAILED leads (to see what we're rejecting)
    print("=" * 60)
    print(f"SAMPLE REJECTED LEADS — no fitness signal (10 random out of {len(failed_no_signal)})")
    print("=" * 60)
    sample_failed = random.sample(failed_no_signal, min(10, len(failed_no_signal)))
    for i, lead in enumerate(sample_failed, 1):
        title = lead.get("job_title", "")
        company = lead.get("company_name", "")
        size = lead.get("company_size", "")
        print(f"  {i}. {lead.get('first_name', '')} {lead.get('last_name', '')} — {title}")
        print(f"     Company: {company} ({size} emp)")
        print(f"     Text: {lead.get('_combined_text', '')[:150]}")
        print()

    # Show 5 random TOO BIG leads
    if failed_too_big:
        print("=" * 60)
        print(f"SAMPLE REJECTED — company too big (5 random out of {len(failed_too_big)})")
        print("=" * 60)
        sample_big = random.sample(failed_too_big, min(5, len(failed_too_big)))
        for i, lead in enumerate(sample_big, 1):
            print(f"  {i}. {lead.get('company_name', '')} — {lead.get('company_size', '')} employees")
            print(f"     {lead.get('first_name', '')} {lead.get('last_name', '')} — {lead.get('job_title', '')}")
            print()


if __name__ == "__main__":
    main()
