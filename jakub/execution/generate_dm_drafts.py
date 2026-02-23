"""
generate_dm_drafts.py — Generate personalized Instagram DM drafts for engaged leads.

Usage:
    python3 jakub/execution/generate_dm_drafts.py [--limit 20] [--dry-run] [--regenerate]

Fetches leads from Supabase where status=engaged, engaged before today, dm_draft is NULL,
generates a personalized DM using OpenAI, and writes it back to Supabase.

Run this once before your daily DM session so drafts are ready in the dashboard.

Requires .env with:
    OPENAI_API_KEY=sk-...
    SUPABASE_URL=https://xxxxx.supabase.co
    SUPABASE_KEY=sb_publishable_...
"""

import sys
import os
import asyncio
import aiohttp
from datetime import datetime, timezone, timedelta


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


# --- SUPABASE ---
async def supabase_get(session, url, key, endpoint):
    full_url = f"{url}/rest/v1/{endpoint}"
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    async with session.get(full_url, headers=headers) as resp:
        if resp.status == 200:
            return await resp.json()
        print(f"  GET error: {resp.status}")
        return []


async def supabase_update(session, url, key, table, match_col, match_val, data):
    full_url = f"{url}/rest/v1/{table}?{match_col}=eq.{match_val}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    async with session.patch(full_url, headers=headers, json=data) as resp:
        if resp.status in (200, 204):
            return True
        error_body = await resp.text()
        print(f"  Update error: {resp.status} - {error_body[:200]}")
        return False


# --- SYSTEM PROMPT ---
SYSTEM_PROMPT = """You write personalized Instagram DMs for FitCore outreach to fitness coaches.

CONTEXT: We build custom client management dashboards for fitness coaches. The DM starts a conversation — it's NOT a pitch. You're warming them up.

HARD RULES:
1. Under 3 sentences total. Coaches get 50+ DMs a day — long messages get skipped.
2. Make it about THEM, not you. Reference their coaching, their content, their niche.
3. End with a casual question (not a pitch). Start a conversation.
4. No links. Instagram suppresses DMs with links.
5. Must feel hand-typed by a real person, not templated.
6. Use their first name naturally.
7. No emojis. No exclamation marks. Lowercase-feeling energy.
8. NEVER mention "dashboard", "FitCore", "product", "tool", or "software" in the first DM. This is a conversation starter, not a sales pitch.

BANNED PHRASES:
- "I noticed" / "I saw" / "I came across" / "I checked out"
- "Love your" / "Love how" / "Love that"
- "Impressive" / "Amazing" / "Incredible" / "Great to see"
- "Quick question" (overused, sounds scripted)
- "Reaching out because" (corporate speak)
- Any mention of our product or what we do

VARY between these styles (pick one per lead based on what info you have):

Style A — Curiosity Opener:
Reference something specific about their coaching, then ask how they handle client management.
Example: "Hey Jake, been checking out your content... how are you managing all your clients right now?"

Style B — Observation Opener:
Comment on a specific post topic or their niche, then ask about their systems.
Example: "Hey Sarah, saw your post about progressive overload for beginners. are you tracking client progress somewhere or is it more manual?"

Style C — Pain-Based Opener:
Reference a scaling signal (growing, busy, many clients), then empathize with the management burden.
Example: "Hey Mike, looks like you're scaling past 30 clients. most coaches at that stage say the admin side starts eating their time. is that the case for you too?"

Style D — Compliment + Question:
Genuine compliment about their results or approach, then ask about client experience.
Example: "Hey Emma, your client transformations are legit. do your clients get to see their own progress data anywhere or just during check-ins?"

OUTPUT: Return ONLY the DM text. No quotes, no JSON, no explanation. Just the message ready to copy-paste."""


def build_dm_prompt(lead):
    """Build the user prompt for DM generation from lead data."""
    parts = []

    name = lead.get("full_name") or ""
    first_name = name.split()[0] if name else lead.get("instagram_handle", "")

    parts.append(f"First name: {first_name}")
    parts.append(f"Instagram: @{lead.get('instagram_handle', '')}")

    bio = lead.get("bio") or ""
    if bio:
        parts.append(f"Bio: {bio}")

    followers = lead.get("follower_count")
    if followers:
        parts.append(f"Followers: {followers:,}")

    website = lead.get("website") or ""
    if website:
        parts.append(f"Website: {website}")

    category = lead.get("business_category") or ""
    if category:
        parts.append(f"Business category: {category}")

    is_biz = lead.get("is_business_account", False)
    parts.append(f"Business account: {'yes' if is_biz else 'no'}")

    score = lead.get("score", 0)
    parts.append(f"Lead score: {score}/10")

    data_str = "\n".join(f"- {p}" for p in parts)

    return f"""Write a personalized Instagram DM for this fitness coach lead.

LEAD DATA:
{data_str}

Pick the style (A/B/C/D) that works best given the data available. If bio is rich, use their specific niche/services. If bio is sparse, keep it more general but still personal.

Remember: just the DM text, nothing else."""


async def generate_dm(session, semaphore, i, total, lead, openai_key, sb_url, sb_key, results):
    """Generate a DM draft for a single lead."""
    async with semaphore:
        handle = lead.get("instagram_handle", "unknown")
        name = lead.get("full_name") or handle

        prompt = build_dm_prompt(lead)

        # Call OpenAI
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json",
        }
        data = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        }

        try:
            async with session.post(url, headers=headers, json=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    error_body = await resp.text()
                    print(f"  [{i+1}/{total}] @{handle}... OPENAI ERROR: {resp.status} - {error_body[:150]}")
                    results["errors"] += 1
                    return
                result = await resp.json()
                dm_text = result["choices"][0]["message"]["content"].strip()

                # Clean up any quotes or markdown the model might add
                if dm_text.startswith('"') and dm_text.endswith('"'):
                    dm_text = dm_text[1:-1]
                if dm_text.startswith("```"):
                    dm_text = dm_text.strip("`").strip()

        except Exception as e:
            print(f"  [{i+1}/{total}] @{handle}... ERROR: {e}")
            results["errors"] += 1
            return

        # Write back to Supabase
        success = await supabase_update(
            session, sb_url, sb_key, "instagram_leads", "id", lead["id"],
            {"dm_draft": dm_text}
        )

        if success:
            preview = dm_text[:80].replace("\n", " ")
            print(f"  [{i+1}/{total}] @{handle} — {preview}...")
            results["generated"] += 1
        else:
            results["errors"] += 1


async def main_async():
    limit = 1000
    dry_run = False
    regenerate = False

    args = sys.argv[1:]
    if "--limit" in args:
        idx = args.index("--limit")
        if idx + 1 < len(args):
            limit = int(args[idx + 1])
    if "--dry-run" in args:
        dry_run = True
    if "--regenerate" in args:
        regenerate = True

    env = load_env()
    sb_url = env.get("SUPABASE_URL", "")
    sb_key = env.get("SUPABASE_KEY", "")
    openai_key = env.get("OPENAI_API_KEY", "")

    if not sb_url or not sb_key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)
    if not openai_key:
        print("ERROR: OPENAI_API_KEY must be set in .env")
        sys.exit(1)

    async with aiohttp.ClientSession() as session:
        # Fetch engaged leads
        select = "id,instagram_handle,full_name,bio,follower_count,website,is_business_account,business_category,score,engaged_at,dm_draft"

        if regenerate:
            print("REGENERATE MODE: overwriting existing DM drafts")
            endpoint = f"instagram_leads?status=eq.engaged&select={select}&limit={limit}"
        else:
            endpoint = f"instagram_leads?status=eq.engaged&dm_draft=is.null&select={select}&limit={limit}"

        leads = await supabase_get(session, sb_url, sb_key, endpoint)

        if not leads:
            print("No engaged leads found that need DM drafts.")
            return

        # Filter for leads engaged before today (previous day or earlier)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        eligible = []
        for lead in leads:
            engaged_at = lead.get("engaged_at")
            if not engaged_at:
                continue
            try:
                engaged_time = datetime.fromisoformat(engaged_at.replace("Z", "+00:00"))
                if engaged_time < today_start:
                    eligible.append(lead)
            except (ValueError, TypeError):
                continue

        if not eligible:
            print(f"Found {len(leads)} engaged leads, but all were engaged today.")
            print("Leads engaged today will be ready for DMs tomorrow.")
            return

        print(f"Found {len(eligible)} leads ready for DM drafts")
        print(f"Using model: gpt-4o-mini")
        print(f"Estimated cost: ~${len(eligible) * 0.005:.2f}")
        print()

        if dry_run:
            print("DRY RUN — would generate DMs for:")
            for lead in eligible[:limit]:
                handle = lead.get("instagram_handle", "?")
                name = lead.get("full_name", "")
                bio_preview = (lead.get("bio") or "")[:60]
                print(f"  @{handle} ({name}) — {bio_preview}")
            return

        semaphore = asyncio.Semaphore(10)
        results = {"generated": 0, "errors": 0}

        tasks = [
            generate_dm(session, semaphore, i, len(eligible), lead, openai_key, sb_url, sb_key, results)
            for i, lead in enumerate(eligible[:limit])
        ]
        await asyncio.gather(*tasks)

    print()
    print("=" * 50)
    print("DM DRAFT GENERATION COMPLETE")
    print(f"  Generated: {results['generated']}")
    print(f"  Errors:    {results['errors']}")
    print(f"  Total:     {len(eligible[:limit])}")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main_async())
