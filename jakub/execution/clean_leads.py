"""
clean_leads.py — Clean raw Apify leads and format for Instantly upload.

Usage:
    python3 jakub/execution/clean_leads.py jakub/.tmp/raw_leads_batch1.csv

Outputs (in same directory as input):
    - cleaned_leads.csv         → Instantly-ready CSV
    - rejected_leads.csv        → Leads removed (with reason)
    - clean_report.txt          → Summary stats
"""

import csv
import sys
import os
import re

# --- CONFIG ---

# Keywords that indicate the business is NOT a fitness coaching business
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

# Keywords that suggest online coaching (higher value leads)
ONLINE_KEYWORDS = [
    "online coach", "online training", "online personal training",
    "virtual", "remote training", "online fitness", "online program",
    "transformation coach", "macro coach", "nutrition coach",
    "online coaching", "1:1 coaching", "one on one coaching",
    "personalized coaching", "custom program", "individualized",
]

# Job titles that match our ICP
GOOD_TITLES = [
    "personal trainer", "fitness coach", "coach", "trainer",
    "owner", "founder", "nutrition coach", "health coach",
    "strength coach", "conditioning", "wellness coach",
]


def is_valid_email(email):
    """Basic email validation."""
    if not email or email.strip() == "" or email.strip().lower() == "null":
        return False
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()) is not None


def check_reject(row):
    """Return rejection reason or None if lead is OK."""
    # No email
    email = row.get("email", "")
    if not is_valid_email(email):
        return "no_email"

    # Check industry — reject non-fitness
    industry = (row.get("industry", "") or "").lower()
    if industry and "fitness" not in industry and "health" not in industry and "wellness" not in industry:
        # Check if job title saves it
        title = (row.get("job_title", "") or "").lower()
        if not any(t in title for t in GOOD_TITLES):
            return f"wrong_industry:{industry}"

    # Check company description + keywords for reject terms
    description = (row.get("company_description", "") or "").lower()
    keywords = (row.get("keywords", "") or "").lower()
    company_name = (row.get("company_name", "") or "").lower()
    headline = (row.get("headline", "") or "").lower()
    combined = f"{description} {keywords} {company_name} {headline}"

    for reject in REJECT_KEYWORDS:
        if reject in combined:
            return f"rejected_keyword:{reject}"

    # Not in US (we're targeting US first)
    country = (row.get("country", "") or "").strip()
    if country and country != "United States":
        return f"wrong_country:{country}"

    return None


def score_online(row):
    """Score how likely this is an ONLINE coach (vs in-person only)."""
    description = (row.get("company_description", "") or "").lower()
    keywords = (row.get("keywords", "") or "").lower()
    headline = (row.get("headline", "") or "").lower()
    title = (row.get("job_title", "") or "").lower()
    combined = f"{description} {keywords} {headline} {title}"

    score = 0
    matched = []
    for kw in ONLINE_KEYWORDS:
        if kw in combined:
            score += 1
            matched.append(kw)

    if score >= 2:
        return "likely_online", matched
    elif score == 1:
        return "maybe_online", matched
    else:
        return "likely_inperson", matched


def classify_segment(row):
    """Classify lead into a segment for email personalization."""
    description = (row.get("company_description", "") or "").lower()
    keywords = (row.get("keywords", "") or "").lower()
    title = (row.get("job_title", "") or "").lower()
    combined = f"{description} {keywords} {title}"

    company_size = row.get("company_size", "")
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
    if any(kw in combined for kw in ["spreadsheet", "google sheet", "excel"]):
        return "spreadsheet_coach"

    return "general_coach"


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 clean_leads.py <input_csv>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_dir = os.path.dirname(input_path)
    cleaned_path = os.path.join(output_dir, "cleaned_leads.csv")
    rejected_path = os.path.join(output_dir, "rejected_leads.csv")
    report_path = os.path.join(output_dir, "clean_report.txt")

    # Read input
    with open(input_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    cleaned = []
    rejected = []
    seen_emails = set()

    for row in rows:
        email = (row.get("email", "") or "").strip().lower()

        # Deduplicate
        if email in seen_emails and is_valid_email(email):
            rejected.append({**row, "reject_reason": "duplicate_email"})
            continue
        if is_valid_email(email):
            seen_emails.add(email)

        # Check for rejection
        reason = check_reject(row)
        if reason:
            rejected.append({**row, "reject_reason": reason})
            continue

        # Score and classify
        online_status, online_matches = score_online(row)
        segment = classify_segment(row)

        cleaned.append({
            "email": email,
            "firstName": (row.get("first_name", "") or "").strip(),
            "lastName": (row.get("last_name", "") or "").strip(),
            "companyName": (row.get("company_name", "") or "").strip(),
            "website": (row.get("company_website", "") or "").strip(),
            "linkedin": (row.get("linkedin", "") or "").strip(),
            "jobTitle": (row.get("job_title", "") or "").strip(),
            "city": (row.get("city", "") or "").strip(),
            "state": (row.get("state", "") or "").strip(),
            "country": (row.get("country", "") or "").strip(),
            "companySize": (row.get("company_size", "") or "").strip(),
            "platform": "apify_leads_finder",
            "onlineStatus": online_status,
            "segment": segment,
        })

    # Write cleaned CSV (Instantly-ready)
    if cleaned:
        fieldnames = list(cleaned[0].keys())
        with open(cleaned_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(cleaned)

    # Write rejected CSV
    if rejected:
        reject_fields = list(rows[0].keys()) + ["reject_reason"]
        with open(rejected_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=reject_fields, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rejected)

    # Count stats
    reject_reasons = {}
    for r in rejected:
        reason = r.get("reject_reason", "unknown").split(":")[0]
        reject_reasons[reason] = reject_reasons.get(reason, 0) + 1

    online_counts = {}
    segment_counts = {}
    for c in cleaned:
        os_val = c["onlineStatus"]
        seg_val = c["segment"]
        online_counts[os_val] = online_counts.get(os_val, 0) + 1
        segment_counts[seg_val] = segment_counts.get(seg_val, 0) + 1

    # Write report
    report_lines = [
        "=" * 50,
        "LEAD CLEANING REPORT",
        "=" * 50,
        f"Total raw leads:     {total}",
        f"Cleaned (usable):    {len(cleaned)}",
        f"Rejected:            {len(rejected)}",
        f"Pass rate:           {len(cleaned)/total*100:.1f}%",
        "",
        "--- REJECTION REASONS ---",
    ]
    for reason, count in sorted(reject_reasons.items(), key=lambda x: -x[1]):
        report_lines.append(f"  {reason}: {count}")

    report_lines += [
        "",
        "--- ONLINE STATUS ---",
    ]
    for status, count in sorted(online_counts.items(), key=lambda x: -x[1]):
        report_lines.append(f"  {status}: {count}")

    report_lines += [
        "",
        "--- SEGMENTS ---",
    ]
    for seg, count in sorted(segment_counts.items(), key=lambda x: -x[1]):
        report_lines.append(f"  {seg}: {count}")

    report_lines += [
        "",
        "--- OUTPUT FILES ---",
        f"  Cleaned: {cleaned_path}",
        f"  Rejected: {rejected_path}",
        "",
        "Next step: verify emails with MillionVerifier/ZeroBounce",
        "then upload cleaned_leads.csv to Instantly.",
        "=" * 50,
    ]

    report = "\n".join(report_lines)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(report)


if __name__ == "__main__":
    main()
