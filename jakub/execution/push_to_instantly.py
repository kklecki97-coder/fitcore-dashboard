"""
push_to_instantly.py — Bulk push leads from Supabase to an Instantly campaign.

Usage:
    python3 jakub/execution/push_to_instantly.py

Uses the bulk endpoint (POST /api/v2/leads/add) — up to 1000 leads per request.
"""
import json, urllib.request, os, sys, time

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

env = load_env()
SB_URL = env["SUPABASE_URL"]
SB_KEY = env["SUPABASE_KEY"]
INSTANTLY_KEY = "ZTBmZjI4OWYtYTBiZC00OTdkLTk4NGMtMjA2N2NkMTMxODYxOlFMYXZudnpJcW1Rag=="
CAMPAIGN_ID = "53f2cb7b-6a49-4b6b-8b01-92a88f586c04"

def sb_get(endpoint):
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{endpoint}",
        headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}
    )
    return json.loads(urllib.request.urlopen(req).read())

def sb_bulk_patch(ids, data):
    """Patch multiple leads in Supabase by ID list."""
    ids_str = ",".join(str(i) for i in ids)
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/leads?id=in.({ids_str})",
        data=json.dumps(data).encode(),
        headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"},
        method="PATCH"
    )
    urllib.request.urlopen(req)

def bulk_upload(leads_batch):
    """Upload up to 1000 leads to Instantly via bulk endpoint."""
    payload = {
        "campaign_id": CAMPAIGN_ID,
        "skip_if_in_campaign": True,
        "leads": leads_batch
    }
    req = urllib.request.Request(
        "https://api.instantly.ai/api/v2/leads/add",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {INSTANTLY_KEY}", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
        method="POST"
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

# Fetch leads
print("Fetching leads from Supabase...", flush=True)
all_leads = []
for offset in range(0, 4000, 1000):
    data = sb_get(
        f"leads?select=id,email,first_name,last_name,company_name,ai_opening_line,ai_pain_point,website"
        f"&ai_opening_line=not.is.null&outreach_status=eq.not_contacted&order=id&limit=1000&offset={offset}"
    )
    all_leads.extend(data)
    if len(data) < 1000:
        break

print(f"Leads to push: {len(all_leads)}", flush=True)

# Prepare leads for Instantly format
instantly_leads = []
lead_ids = []
for lead in all_leads:
    instantly_leads.append({
        "email": lead["email"],
        "first_name": lead.get("first_name") or "",
        "last_name": lead.get("last_name") or "",
        "company_name": lead.get("company_name") or "your team",
        "custom_variables": {
            "openingLine": lead.get("ai_opening_line") or "",
            "painPoint": lead.get("ai_pain_point") or "",
            "website": lead.get("website") or ""
        }
    })
    lead_ids.append(lead["id"])

# Upload in batches of 1000
total_uploaded = 0
total_skipped = 0
BATCH_SIZE = 1000

for i in range(0, len(instantly_leads), BATCH_SIZE):
    batch = instantly_leads[i:i+BATCH_SIZE]
    batch_num = i // BATCH_SIZE + 1
    print(f"\nBatch {batch_num}: uploading {len(batch)} leads...", flush=True)

    try:
        result = bulk_upload(batch)
        uploaded = result.get("leads_uploaded", result.get("uploaded", 0))
        skipped = result.get("skipped_count", result.get("skipped", 0))
        total_uploaded += uploaded
        total_skipped += skipped
        print(f"  Uploaded: {uploaded}, Skipped: {skipped}", flush=True)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  FAILED: HTTP {e.code} - {body[:200]}", flush=True)
    except Exception as e:
        print(f"  FAILED: {e}", flush=True)

    time.sleep(1)

# Only mark in Supabase if uploads succeeded
if total_uploaded > 0:
    print(f"\nMarking {len(lead_ids)} leads in Supabase...", flush=True)
    MARK_BATCH = 500
    for i in range(0, len(lead_ids), MARK_BATCH):
        batch_ids = lead_ids[i:i+MARK_BATCH]
        try:
            sb_bulk_patch(batch_ids, {"outreach_status": "pushed_to_instantly"})
            print(f"  Marked {i+len(batch_ids)}/{len(lead_ids)}", flush=True)
        except Exception as e:
            print(f"  Failed batch {i}: {e}", flush=True)
else:
    print("\nNo leads uploaded — skipping Supabase update.", flush=True)

print(f"\n=== DONE ===", flush=True)
print(f"Uploaded: {total_uploaded}", flush=True)
print(f"Skipped: {total_skipped}", flush=True)
print(f"Total leads: {len(all_leads)}", flush=True)
