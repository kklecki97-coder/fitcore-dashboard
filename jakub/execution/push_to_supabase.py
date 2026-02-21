"""
push_to_supabase.py — Create leads table and push cleaned leads to Supabase.

Usage:
    python3 jakub/execution/push_to_supabase.py jakub/.tmp/cleaned_leads.csv

Requires .env with:
    SUPABASE_URL=https://xxxxx.supabase.co
    SUPABASE_KEY=sb_publishable_...
"""

import csv
import sys
import os
import json
import urllib.request
import urllib.error

# Load .env manually (no external deps needed)
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


def supabase_request(url, key, method, endpoint, data=None):
    """Make a request to Supabase REST API."""
    full_url = f"{url}/rest/v1/{endpoint}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(full_url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 201):
                try:
                    return json.loads(resp.read().decode("utf-8"))
                except Exception:
                    return {"status": "ok"}
            return {"status": resp.status}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        return {"error": e.code, "message": error_body}


def supabase_sql(url, key, sql):
    """Execute SQL via Supabase's pg-meta or RPC."""
    # Use the /rest/v1/rpc endpoint won't work for DDL.
    # Instead, use the management API via the SQL editor endpoint.
    # For simplicity, we'll use the database connection string approach.
    # Actually, let's try the Supabase SQL endpoint.
    full_url = f"{url}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(full_url, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError:
        return None


def create_table_via_management_api(url, key):
    """
    Try to create the leads table. If we can't use SQL directly,
    we'll just try to insert and let the user create the table manually.
    """
    # The Supabase REST API doesn't support DDL.
    # We'll provide the SQL for the user to run in the dashboard.
    sql = """
CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    website TEXT,
    linkedin TEXT,
    job_title TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    company_size TEXT,
    platform TEXT,
    online_status TEXT,
    segment TEXT,
    outreach_status TEXT DEFAULT 'not_contacted',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS so we can insert without policies
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
"""
    return sql


def push_leads(url, key, leads):
    """Push leads to Supabase via REST API in batches."""
    batch_size = 50
    total = len(leads)
    pushed = 0
    errors = 0

    for i in range(0, total, batch_size):
        batch = leads[i : i + batch_size]

        # Map CSV fields to DB columns
        rows = []
        for lead in batch:
            rows.append({
                "email": lead.get("email", ""),
                "first_name": lead.get("firstName", ""),
                "last_name": lead.get("lastName", ""),
                "company_name": lead.get("companyName", ""),
                "website": lead.get("website", ""),
                "linkedin": lead.get("linkedin", ""),
                "job_title": lead.get("jobTitle", ""),
                "city": lead.get("city", ""),
                "state": lead.get("state", ""),
                "country": lead.get("country", ""),
                "company_size": lead.get("companySize", ""),
                "platform": lead.get("platform", ""),
                "online_status": lead.get("onlineStatus", ""),
                "segment": lead.get("segment", ""),
            })

        result = supabase_request(url, key, "POST", "leads", rows)

        if result and "error" in result:
            print(f"  Error on batch {i//batch_size + 1}: {result.get('message', '')[:200]}")
            errors += len(batch)
        else:
            pushed += len(batch)
            print(f"  Pushed {pushed}/{total} leads...")

    return pushed, errors


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 push_to_supabase.py <cleaned_leads.csv>")
        sys.exit(1)

    csv_path = sys.argv[1]
    env = load_env()
    url = env.get("SUPABASE_URL", "")
    key = env.get("SUPABASE_KEY", "")

    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)

    print(f"Supabase URL: {url}")
    print(f"CSV: {csv_path}")
    print()

    # Read leads
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        leads = list(reader)

    print(f"Loaded {len(leads)} leads from CSV")
    print()

    # Try to insert — if it fails, show the CREATE TABLE SQL
    print("Attempting to push leads to 'leads' table...")
    print()

    pushed, errors = push_leads(url, key, leads)

    if errors > 0 and pushed == 0:
        print()
        print("=" * 60)
        print("TABLE DOESN'T EXIST YET")
        print("=" * 60)
        print()
        print("Go to your Supabase dashboard → SQL Editor")
        print("and run this SQL to create the table:")
        print()
        print(create_table_via_management_api(url, key))
        print()
        print("Then run this script again.")
        print("=" * 60)
    else:
        print()
        print("=" * 50)
        print(f"DONE — {pushed} leads pushed to Supabase")
        if errors > 0:
            print(f"  ({errors} errors — likely duplicates)")
        print(f"View at: {url}")
        print("=" * 50)


if __name__ == "__main__":
    main()
