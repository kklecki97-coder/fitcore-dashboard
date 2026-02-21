"""
enrich_with_ai.py — Use GPT-5-mini to enrich leads with AI insights (async, 20 concurrent).

Usage:
    python3 jakub/execution/enrich_with_ai.py [--limit 10] [--concurrency 20] [--rerun]

Reads leads from Supabase (those that have been website-scraped but not AI-enriched),
sends their data to GPT-5-mini, and updates Supabase with:
- Pain point prediction
- Personalized cold email opening line
- Estimated client count
- Confidence score (how good a fit this lead is)

Uses two-tier prompting:
- Data-rich leads (2+ fields populated): detailed, specific personalization
- Data-poor leads (0-1 fields): short, honest, no fake specificity

Requires .env with:
    OPENAI_API_KEY=sk-...
    SUPABASE_URL=https://xxxxx.supabase.co
    SUPABASE_KEY=sb_publishable_...
"""

import sys
import os
import json
import asyncio
import aiohttp


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
SYSTEM_PROMPT = """You write cold email opening lines for FitCore — we build custom client dashboards for fitness coaches.

Your goal: write an opening line that makes the coach think "this person actually looked at my business."

HARD RULES:
1. Opening line: ONE conversational sentence, 8-20 words. Must sound like a real person typed it, not a bot pasting website copy.
2. Pain point: ONE different sentence about a specific operational problem they likely have. Must be a DIFFERENT angle than the opening line. Keep it to ONE short sentence, max 20 words. No consultant-speak.
3. ABSOLUTELY BANNED — if your output contains ANY of these, it is rejected:
   *** "LOVE" IS THE #1 VIOLATION. NEVER start with "Love", "Love your", "Love how", "Love that". This is the single most common AI tell. Any line starting with "Love" = instant reject. ***
   *** "I checked", "I looked at", "I saw", "I noticed", "I came across" = SECOND MOST COMMON VIOLATION. Never start with "I [verb]". You are not telling them what YOU did. You are making an observation about THEIR business. ***
   Also banned: "I see", "Impressive", "Great to see", "Congrats", "must keep you busy", "that's no small feat", "sounds like", "how's it going", "how's that working", "exciting", "vibrant", "amazing", "fantastic", "wonderful", "curious how", "how do you currently", "right?", "no?"
   Question patterns: "how do you [track/manage/keep/organize]?", "how are you [tracking/managing]?"
   Ending with a question mark is DISCOURAGED. Statements are stronger than questions.
   Location-only: NEVER write "[Company] in [City]." as the entire line.
   Flattery or compliments about their business.
   Punctuation: NEVER use em-dashes (—). Use commas, periods, or "..." instead.
   NEVER paste program names in ALL CAPS or exactly as they appear on the website. Paraphrase naturally.
   NEVER write sentence fragments that read like bullet points.
   NEVER start with lowercase "i" or "saw" — capitalize properly.

TONE: Write like a casual colleague, not a copywriter. Short, lowercase-feeling, no hype. Think "guy who checked out your site and is making a quick observation" not "marketer who scraped your data."

WHAT TO FOCUS ON (in priority order):
1. A specific PROGRAM or SERVICE they offer, paraphrased naturally ("You've got that 6-week transformation challenge running.")
2. A specific TOOL they use and its limitation ("Running everything through Square but no client portal behind it.")
3. Their NICHE described casually ("Fitness for Irish dancers is a pretty specific world.")
4. Their business MODEL ("Online coaching plus in-person, that's two different workflows.")
5. If you truly have NOTHING specific, make an honest observation about their type of business.

EXAMPLES OF GOOD opening lines (conversational, specific, human):
- "You've got that 6-week challenge plus nutrition coaching. Bet the check-ins pile up fast."
- "Running everything through Square. Works for payments but not for tracking clients."
- "Online coaching for busy dads is a specific niche. The tracking has to be tight."
- "Three trainers and no client portal. Everyone's just... texting updates?"
- "Nutrition coaching and personal training for 11 people, all through Calendly."
- "You do gait analysis and posture correction. That's a lot of individual data per client."
- "That gut-health coaching program with the calm method is a unique angle."
- "Speed and strength coaching for baseball athletes. Lots of individual data to track."

EXAMPLES OF BAD opening lines (robotic, pasted, generic):
- "Love your 3 Pillar System..." (starts with "Love" = instant reject)
- "Love how Method3 mixes personal and group..." (starts with "Love" = reject)
- "Love that Bee Yoga Fusion offers both..." (starts with "Love" = reject)
- "I checked Feis Fit's 12-Week Formula..." (starts with "I checked" = reject, never say what YOU did)
- "i checked out your website..." (starts with "I" = reject, also wrong capitalization)
- "GET BUILT by SMITHBUILT targets busy dads." (pasted website copy in ALL CAPS)
- "CTF Personal Training Interest Form funnels signups." (reads like a bot scraped the site)
- "Managing bookings through DMs and spreadsheets." (generic, applies to everyone)
- "[Company] in [City], [State]." (just restating location, no insight)
- "Curious how you track client progress across..." (banned phrase "curious how")
- "You're running in-person personal training, right?" (ends with tag question = lazy)

PAIN POINT RULES:
- Must be a DIFFERENT angle than the opening line. If opening mentions their tool, pain should mention a workflow problem. If opening mentions their niche, pain should mention a scaling issue.
- Be specific but don't make stuff up. If you don't know their exact setup, focus on what's typical for their type of business.
- Keep it to one sentence.

CONFIDENCE SCORING — BE STRICT. Default to 5, go UP only with strong evidence, go DOWN with red flags:
- 9-10 = PERFECT FIT: solo/small ONLINE coach, 20-50 clients, no CRM, charges $100-300/mo. Must have CLEAR evidence of online coaching + small operation. Very few leads deserve 9-10.
- 7-8 = good fit: small team (1-5 people), online coaching OR strong online signals, some pain visible. Must be FITNESS-specific coaching.
- 5-6 = unclear: could be a fit, not enough data to tell. THIS IS YOUR DEFAULT when data is ambiguous.
- 3-4 = probably not: big gym/studio (10+ staff), wrong niche, in-person only with large team
- 1-2 = definitely not: MLM, not fitness, corporate wellness company, spa, medical practice

RED FLAGS that FORCE a low score (these are HARD CAPS, not suggestions):
- Team size 6-10 = score 5 MAX. No exceptions. A 7-person team is NOT a solo coach.
- Team size 11-19 = score 4 MAX. This is a gym or studio, NOT our ICP.
- Team size 20+ = score 3 MAX. Definitely a gym or large operation.
- "Life coach", "career coach", "immigration coach", "business coach" = NOT fitness. Score 1-3.
- "Psychotherapist", "counselor", "therapist" = NOT fitness. Score 1-2.
- "Adaptive training", "disability fitness" = great cause but not our ICP. Score 3-4.
- Corporate wellness = not our ICP. Score 2-3.
- No evidence of online coaching AND team size 5+ = score 4-5 max.
- If the ONLY data you have is company name + team size, score 5 max. Don't inflate.

Respond with valid JSON only."""


# --- OPENAI ---
async def call_openai(session, api_key, system_prompt, user_prompt, model="gpt-5-nano"):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    # Only set temperature for models that support it (GPT-5-mini doesn't)
    if not model.startswith("gpt-5"):
        data["temperature"] = 0.85

    try:
        async with session.post(url, headers=headers, json=data, timeout=aiohttp.ClientTimeout(total=45)) as resp:
            if resp.status != 200:
                error_body = await resp.text()
                print(f"  OpenAI error: {resp.status} - {error_body[:200]}")
                return None
            result = await resp.json()
            content = result["choices"][0]["message"]["content"]
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1] if "\n" in content else content
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
            return json.loads(content)
    except json.JSONDecodeError:
        return None
    except Exception as e:
        print(f"  OpenAI error: {e}")
        return None


def build_prompt(lead):
    """Build the enrichment prompt for a single lead."""
    # Determine data richness
    rich_fields = 0
    for field in ["coaching_services", "tools_detected", "pricing_details", "website_description"]:
        val = lead.get(field, "")
        if val and val not in ("None", ""):
            rich_fields += 1

    data_quality = "RICH" if rich_fields >= 2 else "MODERATE" if rich_fields == 1 else "SPARSE"

    parts = []
    if lead.get("first_name"):
        parts.append(f"First name: {lead['first_name']}")
    parts.append(f"Company: {lead.get('company_name', '') or 'unknown'}")
    parts.append(f"Title: {lead.get('job_title', '')}")
    parts.append(f"Location: {lead.get('city', '')}, {lead.get('state', '')}")
    team_size = lead.get('company_size', '')
    parts.append(f"Team size: {team_size}")
    # Add explicit score cap reminder based on team size
    try:
        ts = int(team_size)
        if ts >= 20:
            parts.append("*** SCORE CAP: Team 20+ = score 3 MAX ***")
        elif ts >= 11:
            parts.append("*** SCORE CAP: Team 11-19 = score 4 MAX ***")
        elif ts >= 6:
            parts.append("*** SCORE CAP: Team 6-10 = score 5 MAX ***")
    except (ValueError, TypeError):
        pass
    parts.append(f"Website: {lead.get('website', '') or 'none'}")
    parts.append(f"Segment: {lead.get('segment', '')}")
    parts.append(f"Online status: {lead.get('online_status', '')}")
    parts.append(f"Online coaching: {lead.get('offers_online_coaching', 'unknown')}")

    for field, label in [
        ("coaching_services", "Services"),
        ("pricing_details", "Pricing"),
        ("tools_detected", "Tools on site"),
        ("website_description", "Site info"),
        ("social_links", "Social"),
    ]:
        val = lead.get(field, "")
        if val and val not in ("None", ""):
            parts.append(f"{label}: {val}")

    data_str = "\n".join(f"- {p}" for p in parts)

    quality_note = ""
    if data_quality == "SPARSE":
        quality_note = "\n\nDATA IS SPARSE — focus on their JOB TITLE and COMPANY NAME. These often reveal their niche (e.g. 'Gut Health & Fitness Coach' = niche worth mentioning, 'Master Personal Trainer/owner' = solo operator). DO NOT default to generic 'managing things through DMs and spreadsheets' — that's what every bad AI email says. Instead, find the ONE interesting thing about this lead and highlight it."
    elif data_quality == "MODERATE":
        quality_note = "\n\nDATA IS MODERATE — you have some info. Build the line around the ONE specific detail you have (a service, a tool, or something from their site description)."

    return f"""Write a cold email opening line and pain point for this lead.

LEAD DATA:
{data_str}

DATA QUALITY: {data_quality}
{quality_note}

Return JSON:
{{
    "opening_line": "ONE sentence, 8-18 words, specific detail, varied style",
    "pain_point": "ONE blunt sentence about what they're doing manually",
    "estimated_clients": "Best guess: '10-20', '20-40', '40-60', '60+'",
    "confidence_score": "1-10, be strict (see scoring rules)",
    "skip_reason": "If confidence < 4, explain why. Otherwise empty string."
}}"""


import re as _re

def sanitize_ai_output(result):
    """Post-process AI output to fix common violations that slip through the prompt."""
    ol = result.get("opening_line", "") or ""
    pp = result.get("pain_point", "") or ""

    # Fix em-dashes everywhere
    ol = ol.replace(" —", ",").replace("— ", " ").replace("—", " - ")
    pp = pp.replace(" —", ",").replace("— ", " ").replace("—", " - ")

    # Fix banned opening patterns
    banned_starts = [
        (_re.compile(r'^Love how\b', _re.IGNORECASE), ""),
        (_re.compile(r'^Love that\b', _re.IGNORECASE), ""),
        (_re.compile(r'^Love your\b', _re.IGNORECASE), ""),
        (_re.compile(r'^Love\s', _re.IGNORECASE), ""),
        (_re.compile(r'^I noticed\b', _re.IGNORECASE), ""),
        (_re.compile(r'^I saw\b', _re.IGNORECASE), ""),
        (_re.compile(r'^I checked\b', _re.IGNORECASE), ""),
        (_re.compile(r'^I came across\b', _re.IGNORECASE), ""),
        (_re.compile(r'^I see\b', _re.IGNORECASE), ""),
    ]
    for pattern, _ in banned_starts:
        if pattern.search(ol):
            result["_violation"] = pattern.pattern
            break

    # Strip trailing "right?" / "no?"
    ol = _re.sub(r',?\s*right\?\s*$', '.', ol)
    ol = _re.sub(r',?\s*no\?\s*$', '.', ol)
    pp = _re.sub(r',?\s*right\?\s*$', '.', pp)
    pp = _re.sub(r',?\s*no\?\s*$', '.', pp)

    result["opening_line"] = ol.strip()
    result["pain_point"] = pp.strip()
    return result


async def enrich_lead(session, semaphore, i, total, lead, openai_key, sb_url, sb_key, results):
    """Enrich a single lead (runs concurrently behind a semaphore)."""
    async with semaphore:
        name = lead.get("first_name", "")
        company = lead.get("company_name", "")
        lead_id = lead.get("id")

        prompt = build_prompt(lead)
        result = await call_openai(session, openai_key, SYSTEM_PROMPT, prompt)

        if not result:
            print(f"  [{i+1}/{total}] {name} @ {company}... FAILED")
            results["errors"] += 1
            return

        # Post-process to catch violations the model missed
        result = sanitize_ai_output(result)
        if result.get("_violation"):
            print(f"  [{i+1}/{total}] {name} @ {company}... VIOLATION ({result['_violation']}), retrying...")
            result2 = await call_openai(session, openai_key, SYSTEM_PROMPT, prompt)
            if result2:
                result2 = sanitize_ai_output(result2)
                if not result2.get("_violation"):
                    result = result2
                else:
                    print(f"  [{i+1}/{total}] {name} @ {company}... VIOLATION on retry too, skipping opening line")
                    result["opening_line"] = ""

        # Check for skip
        score = result.get("confidence_score", 5)
        try:
            score_int = int(score)
        except (ValueError, TypeError):
            score_int = 5

        skip_reason = result.get("skip_reason", "")

        update_data = {
            "ai_pain_point": (result.get("pain_point", "") or "")[:500],
            "ai_opening_line": (result.get("opening_line", "") or "")[:300],
            "ai_estimated_clients": str(result.get("estimated_clients", ""))[:50],
            "ai_confidence_score": str(score)[:10],
        }

        success = await supabase_update(session, sb_url, sb_key, "leads", "id", lead_id, update_data)
        if success:
            skip_flag = f" [SKIP: {skip_reason[:40]}]" if score_int < 4 and skip_reason else ""
            print(f"  [{i+1}/{total}] {name} @ {company}... score={score}{skip_flag} — {result.get('opening_line', '')[:60]}")
            results["enriched"] += 1
            if score_int < 4:
                results["skipped"] += 1
        else:
            results["errors"] += 1


async def main_async():
    limit = 1000
    concurrency = 20
    rerun = False

    args = sys.argv[1:]
    if "--limit" in args:
        idx = args.index("--limit")
        if idx + 1 < len(args):
            limit = int(args[idx + 1])
    if "--concurrency" in args:
        idx = args.index("--concurrency")
        if idx + 1 < len(args):
            concurrency = int(args[idx + 1])
    if "--rerun" in args:
        rerun = True

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
        # Fetch leads to enrich
        select_fields = (
            "id,email,first_name,last_name,company_name,job_title,"
            "city,state,company_size,website,offers_online_coaching,"
            "coaching_services,pricing_visible,pricing_details,"
            "tools_detected,website_description,social_links,"
            "segment,online_status"
        )

        if rerun:
            print("RERUN MODE: re-enriching all leads with new prompt")
            endpoint = f"leads?select={select_fields}&limit={limit}"
        else:
            # Website-scraped but not AI-enriched
            endpoint = (
                f"leads?enriched_at=not.is.null&ai_pain_point=is.null"
                f"&select={select_fields}&limit={limit}"
            )
        leads = await supabase_get(session, sb_url, sb_key, endpoint)

        if not leads and not rerun:
            print("No website-scraped leads found. Trying all un-enriched leads...")
            endpoint = f"leads?ai_pain_point=is.null&select={select_fields}&limit={limit}"
            leads = await supabase_get(session, sb_url, sb_key, endpoint)

        if not leads:
            print("No leads to enrich.")
            return

        print(f"Found {len(leads)} leads to enrich with AI")
        print(f"Using model: gpt-5-nano")
        print(f"Concurrency: {concurrency} parallel requests")
        print(f"Estimated cost: ~${len(leads) * 0.01:.2f}")
        print()

        semaphore = asyncio.Semaphore(concurrency)
        results = {"enriched": 0, "errors": 0, "skipped": 0}

        tasks = [
            enrich_lead(session, semaphore, i, len(leads), lead, openai_key, sb_url, sb_key, results)
            for i, lead in enumerate(leads)
        ]
        await asyncio.gather(*tasks)

    print()
    print("=" * 50)
    print(f"AI ENRICHMENT COMPLETE")
    print(f"  Enriched:  {results['enriched']}")
    print(f"  Skipped:   {results['skipped']} (confidence < 4)")
    print(f"  Errors:    {results['errors']}")
    print(f"  Total:     {len(leads)}")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main_async())
