"""
scrape_websites.py — Visit each lead's website and extract coaching info (async, concurrent).

Usage:
    python3 jakub/execution/scrape_websites.py [--limit 10] [--use-ai] [--use-tavily] [--use-linkedin] [--concurrency 10] [--rerun]

Reads leads from Supabase (those with a website but not yet enriched),
scrapes their website, and updates Supabase with findings.

Scraping modes (can combine flags):
  1. Keyword-based (default): Fast, free, regex pattern matching on HTML.
  2. AI-powered (--use-ai): Sends website text to GPT-4o-mini for intelligent extraction.
  3. Tavily-powered (--use-tavily): Uses Tavily Crawl API to fetch full site content
     (renders JS, follows subpages like /services, /about, /pricing).
     Falls back to Tavily Extract, then urllib if crawl fails.
     Costs ~$0.002/lead. Best data quality.
  4. LinkedIn fallback (--use-linkedin): When website scraping fails, scrapes the
     lead's LinkedIn profile via Apify to extract coaching info from their headline,
     about section, and experience. Costs ~$0.003/lead.

When --use-tavily and --use-linkedin are set, the scraping chain is:
  Tavily Crawl → Tavily Extract → urllib fallback → LinkedIn (Apify) fallback
Then the extracted text is analyzed with AI (if --use-ai) or keywords.

Uses async concurrency (default 10) for ~10x speedup over sequential processing.

Requires .env with:
    SUPABASE_URL=https://xxxxx.supabase.co
    SUPABASE_KEY=sb_publishable_...
    OPENAI_API_KEY=sk-... (only needed with --use-ai)
    TAVILY_API_KEY=tvly-... (only needed with --use-tavily)
    APIFY_API_KEY=apify_api_... (only needed with --use-linkedin)
"""

import sys
import os
import json
import re
import asyncio
import aiohttp
import ssl
from html.parser import HTMLParser
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


# --- HTML TO TEXT ---
class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            self.result.append(data)

    def get_text(self):
        return " ".join(self.result)


def html_to_text(html):
    extractor = HTMLTextExtractor()
    try:
        extractor.feed(html)
    except Exception:
        pass
    return extractor.get_text()


# --- SUPABASE (sync for initial fetch, async for updates) ---
def supabase_get_sync(url, key, endpoint):
    import urllib.request
    full_url = f"{url}/rest/v1/{endpoint}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    req = urllib.request.Request(full_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  GET error: {e}")
        return []


async def supabase_update(session, url, key, table, match_col, match_val, data):
    full_url = f"{url}/rest/v1/{table}?{match_col}=eq.{match_val}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    try:
        async with session.patch(full_url, headers=headers, json=data) as resp:
            if resp.status in (200, 204):
                return True
            error_body = await resp.text()
            print(f"  Update error: {resp.status} - {error_body[:200]}")
            return False
    except Exception as e:
        print(f"  Update exception: {e}")
        return False


# --- WEBSITE SCRAPING (async) ---
async def fetch_website(session, website_url, timeout=10):
    """Fetch a website's HTML content."""
    if not website_url or website_url.strip() == "":
        return None

    url = website_url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }

    try:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=timeout), ssl=ssl_ctx) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type and "text" not in content_type:
                return None
            html = await resp.text(errors="ignore")
            return html[:80000]
    except Exception:
        return None


# --- TAVILY SCRAPING (async) ---
async def tavily_crawl(session, tavily_key, website_url):
    """Crawl a website using Tavily Crawl API (multi-page, JS-rendered)."""
    url = website_url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    endpoint = "https://api.tavily.com/crawl"
    headers = {
        "Authorization": f"Bearer {tavily_key}",
        "Content-Type": "application/json",
    }
    body = {
        "url": url,
        "max_depth": 1,
        "max_breadth": 10,
        "limit": 5,
        "allow_external": False,
        "format": "text",
        "extract_depth": "basic",
        "select_paths": [
            ".*about.*", ".*service.*", ".*program.*",
            ".*pricing.*", ".*price.*", ".*package.*",
            ".*coach.*", ".*train.*", ".*class.*",
        ],
        "timeout": 60,
    }

    try:
        async with session.post(endpoint, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=90)) as resp:
            result = await resp.json()
            pages = result.get("results", [])
            if pages:
                combined = "\n\n".join(p.get("raw_content", "") for p in pages)
                return combined, len(pages)
            return None, 0
    except Exception:
        return None, 0


async def tavily_extract(session, tavily_key, website_url):
    """Extract content from a single URL using Tavily Extract API."""
    url = website_url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    endpoint = "https://api.tavily.com/extract"
    headers = {
        "Authorization": f"Bearer {tavily_key}",
        "Content-Type": "application/json",
    }
    body = {
        "urls": url,
        "format": "text",
        "extract_depth": "basic",
        "timeout": 30,
    }

    try:
        async with session.post(endpoint, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            result = await resp.json()
            results = result.get("results", [])
            if results:
                return results[0].get("raw_content", "")
            return None
    except Exception:
        return None


async def fetch_with_tavily(session, tavily_key, website_url):
    """Try Tavily Crawl → Tavily Extract → urllib fallback. Returns (text, method)."""
    # Step 1: Tavily Crawl (multi-page)
    text, page_count = await tavily_crawl(session, tavily_key, website_url)
    if text and len(text) > 100:
        return text, f"tavily-crawl({page_count}pg)"

    # Step 2: Tavily Extract (single page)
    text = await tavily_extract(session, tavily_key, website_url)
    if text and len(text) > 100:
        return text, "tavily-extract"

    # Step 3: aiohttp fallback
    html = await fetch_website(session, website_url)
    if html:
        raw_text = html_to_text(html)
        if len(raw_text) > 50:
            return raw_text, "urllib-fallback"
        return html, "urllib-html-fallback"

    return None, "failed"


# --- LINKEDIN SCRAPING (APIFY, async) ---
async def scrape_linkedin_apify(session, apify_key, linkedin_url, timeout=120):
    """Scrape a LinkedIn profile using Apify dev_fusion~linkedin-profile-scraper."""
    if not linkedin_url or "/in/" not in linkedin_url:
        return None

    url = linkedin_url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    endpoint = f"https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/run-sync-get-dataset-items?token={apify_key}&timeout={timeout}"
    headers = {"Content-Type": "application/json"}
    body = {"profileUrls": [url]}

    try:
        async with session.post(endpoint, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=timeout + 30)) as resp:
            results = await resp.json()
            if results and len(results) > 0:
                return results[0]
            return None
    except Exception as e:
        print(f"LinkedIn scrape error: {e}")
        return None


def linkedin_to_coaching_info(profile):
    """Convert a LinkedIn profile dict into the same fields as website scraping."""
    if not profile:
        return {}

    result = {}

    # Build a rich text description from LinkedIn fields
    parts = []
    headline = profile.get("headline", "") or ""
    about = profile.get("about", "") or ""
    full_name = profile.get("fullName", "") or ""
    job_title = profile.get("jobTitle", "") or ""
    company_name = profile.get("companyName", "") or ""
    company_industry = profile.get("companyIndustry", "") or ""
    company_size = profile.get("companySize", "") or ""

    if headline:
        parts.append(f"Headline: {headline}")
    if about:
        parts.append(f"About: {about[:500]}")
    if job_title:
        parts.append(f"Job title: {job_title}")
    if company_name:
        parts.append(f"Company: {company_name}")
    if company_industry:
        parts.append(f"Industry: {company_industry}")
    if company_size:
        parts.append(f"Company size: {company_size}")

    # Extract experience descriptions
    experiences = profile.get("experiences", []) or []
    for exp in experiences[:3]:
        job_desc = exp.get("jobDescription", "") or ""
        exp_title = exp.get("jobTitle", "") or ""
        exp_company = exp.get("companyName", "") or ""
        if job_desc:
            parts.append(f"Experience at {exp_company}: {job_desc[:300]}")
        elif exp_title:
            parts.append(f"Role: {exp_title} at {exp_company}")

    combined_text = "\n".join(parts)
    combined_lower = combined_text.lower()

    # Website description — build from headline + about
    desc_parts = []
    if headline:
        desc_parts.append(headline)
    if about:
        desc_parts.append(about[:300])
    if desc_parts:
        result["website_description"] = " | ".join(desc_parts)[:500]

    # Online coaching detection
    online_signals = [
        "online coaching", "online training", "virtual training",
        "remote coaching", "online program", "online client",
        "work with me online", "train from anywhere",
        "online personal training", "virtual session",
        "zoom training", "zoom coaching", "online fitness",
    ]
    result["offers_online_coaching"] = any(s in combined_lower for s in online_signals)

    # Services detection from LinkedIn text
    services = set()
    service_keywords = {
        "personal training": "personal training",
        "group training": "group training",
        "nutrition coaching": "nutrition coaching",
        "meal plan": "meal planning",
        "macro coaching": "macro coaching",
        "online coaching": "online coaching",
        "transformation": "transformation programs",
        "weight loss": "weight loss",
        "strength training": "strength training",
        "1-on-1": "1-on-1 coaching",
        "one-on-one": "1-on-1 coaching",
        "small group": "small group training",
        "bootcamp": "bootcamp",
        "hiit": "HIIT",
        "yoga": "yoga",
        "pilates": "pilates",
        "crossfit": "crossfit",
        "body composition": "body composition",
        "contest prep": "contest prep",
        "athletic performance": "athletic performance",
        "sports massage": "sports massage",
        "corporate wellness": "corporate wellness",
        "posture": "posture correction",
        "flexibility": "flexibility training",
        "rehab": "rehabilitation",
        "functional training": "functional training",
        "life coach": "life coaching",
        "wellness": "wellness coaching",
        "mindset": "mindset coaching",
    }
    for keyword, service in service_keywords.items():
        if keyword in combined_lower:
            services.add(service)
    result["coaching_services"] = ", ".join(sorted(services))

    # Tools detection from LinkedIn text
    tools = set()
    tool_checks = {
        "trainerize": "Trainerize", "truecoach": "TrueCoach",
        "mindbody": "MindBody", "ptminder": "PTminder",
        "zen planner": "Zen Planner", "wodify": "Wodify",
        "pushpress": "PushPress", "gymdesk": "GymDesk",
        "calendly": "Calendly", "acuity": "Acuity Scheduling",
        "stripe": "Stripe", "paypal": "PayPal",
        "my pt hub": "My PT Hub", "exercise.com": "Exercise.com",
        "google calendar": "Google Calendar", "square": "Square",
        "wix bookings": "Wix Bookings", "vagaro": "Vagaro",
        "glofox": "Glofox",
    }
    for keyword, tool in tool_checks.items():
        if keyword in combined_lower:
            tools.add(tool)
    result["tools_detected"] = ", ".join(sorted(tools))

    # Pricing — rarely on LinkedIn but check anyway
    price_patterns = [
        r'\$\d+[\d,.]*\s*/?\s*(?:month|mo|session|week|program)',
        r'\$\d+[\d,.]*',
    ]
    prices_found = []
    for pattern in price_patterns:
        matches = re.findall(pattern, combined_lower)
        prices_found.extend(matches[:3])
    result["pricing_visible"] = len(prices_found) > 0
    if prices_found:
        result["pricing_details"] = "; ".join(prices_found[:5])

    # Social links — LinkedIn itself
    result["social_links"] = f"linkedin:{profile.get('profileUrl', '')}"

    return result


# --- AI-POWERED EXTRACTION (async) ---
async def ai_extract(session, text, website_url, openai_key):
    """Use GPT-4o-mini to extract structured data from website text."""
    prompt = f"""Website text from {website_url} (first 3000 chars):
{text[:3000]}

Return JSON with these fields (empty string if not found):
{{
    "business_summary": "1-2 sentences: what they do and who they serve",
    "services": "comma-separated services offered (e.g. personal training, nutrition coaching)",
    "niche": "specific coaching niche if any (e.g. Irish dance fitness, seniors 55+, corporate wellness)",
    "pricing": "any pricing mentioned, or empty",
    "tools": "any software/booking/payment tools detected (e.g. Calendly, Trainerize)",
    "target_audience": "who they serve",
    "offers_online": "true or false — do they offer online/remote/virtual coaching?",
    "notable_detail": "ONE specific interesting fact about this business (a program name, method, unique angle)"
}}"""

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
    data = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You extract structured data from website text. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }

    try:
        async with session.post(url, headers=headers, json=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            result = await resp.json()
            content = result["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1] if "\n" in content else content
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
            return json.loads(content)
    except Exception:
        return None


async def analyze_text(session, text, website_url, openai_key=None):
    """Analyze pre-extracted text (from Tavily or other source) for coaching info."""
    if not text or len(text) < 50:
        return {}

    text_lower = text.lower()
    text_clean = re.sub(r'\s+', ' ', text).strip()

    result = {}

    # --- AI EXTRACTION (if enabled) ---
    ai_data = None
    if openai_key and len(text_clean) > 50:
        ai_data = await ai_extract(session, text_clean, website_url, openai_key)

    # --- KEYWORD-BASED EXTRACTION ---

    # Online coaching
    online_signals = [
        "online coaching", "online training", "virtual training",
        "remote coaching", "online program", "online client",
        "work with me online", "train from anywhere",
        "online personal training", "virtual session",
        "zoom training", "zoom coaching",
    ]
    kw_online = any(s in text_lower for s in online_signals)

    if ai_data and ai_data.get("offers_online"):
        result["offers_online_coaching"] = str(ai_data["offers_online"]).lower() == "true"
    else:
        result["offers_online_coaching"] = kw_online

    # Website description
    if ai_data and ai_data.get("business_summary"):
        result["website_description"] = ai_data["business_summary"][:500]
    else:
        sentences = [s.strip() for s in text_clean.split(".") if len(s.strip()) > 30]
        if sentences:
            result["website_description"] = ". ".join(sentences[:3])[:500]

    # Services
    services = set()
    service_keywords = {
        "personal training": "personal training",
        "group training": "group training",
        "nutrition coaching": "nutrition coaching",
        "meal plan": "meal planning",
        "macro coaching": "macro coaching",
        "online coaching": "online coaching",
        "transformation": "transformation programs",
        "weight loss": "weight loss",
        "strength training": "strength training",
        "1-on-1": "1-on-1 coaching",
        "one-on-one": "1-on-1 coaching",
        "small group": "small group training",
        "bootcamp": "bootcamp",
        "hiit": "HIIT",
        "yoga": "yoga",
        "pilates": "pilates",
        "crossfit": "crossfit",
        "body composition": "body composition",
        "contest prep": "contest prep",
        "athletic performance": "athletic performance",
        "sports massage": "sports massage",
        "corporate wellness": "corporate wellness",
        "posture": "posture correction",
        "flexibility": "flexibility training",
        "rehab": "rehabilitation",
        "functional training": "functional training",
    }
    for keyword, service in service_keywords.items():
        if keyword in text_lower:
            services.add(service)
    if ai_data and ai_data.get("services"):
        for s in ai_data["services"].split(","):
            s = s.strip()
            if s:
                services.add(s)
    result["coaching_services"] = ", ".join(sorted(services))

    # Pricing
    price_patterns = [
        r'\$\d+[\d,.]*\s*/?\s*(?:month|mo|session|week|program)',
        r'\$\d+[\d,.]*',
        r'\d+\s*(?:dollars|usd)\s*/?\s*(?:month|mo|session)',
    ]
    prices_found = []
    for pattern in price_patterns:
        matches = re.findall(pattern, text_lower)
        prices_found.extend(matches[:3])

    result["pricing_visible"] = len(prices_found) > 0
    if prices_found:
        result["pricing_details"] = "; ".join(prices_found[:5])
    elif ai_data and ai_data.get("pricing"):
        result["pricing_visible"] = True
        result["pricing_details"] = ai_data["pricing"][:300]

    # Tools
    tools = set()
    tool_checks = {
        "trainerize": "Trainerize", "truecoach": "TrueCoach",
        "mindbody": "MindBody", "ptminder": "PTminder",
        "zen planner": "Zen Planner", "wodify": "Wodify",
        "pushpress": "PushPress", "gymdesk": "GymDesk",
        "calendly": "Calendly", "acuity": "Acuity Scheduling",
        "stripe": "Stripe", "paypal": "PayPal",
        "my pt hub": "My PT Hub", "exercise.com": "Exercise.com",
        "google calendar": "Google Calendar", "square": "Square",
        "wix bookings": "Wix Bookings", "vagaro": "Vagaro",
        "glofox": "Glofox",
    }
    for keyword, tool in tool_checks.items():
        if keyword in text_lower:
            tools.add(tool)
    if ai_data and ai_data.get("tools"):
        for t in ai_data["tools"].split(","):
            t = t.strip()
            if t:
                tools.add(t)
    result["tools_detected"] = ", ".join(sorted(tools))

    # Social links (from text — look for handles)
    socials = []
    social_patterns = {
        "instagram": r'(?:instagram\.com|instagr\.am)/([a-zA-Z0-9_.]+)',
        "facebook": r'facebook\.com/([a-zA-Z0-9_.]+)',
        "tiktok": r'tiktok\.com/@([a-zA-Z0-9_.]+)',
        "youtube": r'youtube\.com/(?:c/|channel/|@)([a-zA-Z0-9_.]+)',
        "twitter": r'(?:twitter\.com|x\.com)/([a-zA-Z0-9_.]+)',
    }
    for platform, pattern in social_patterns.items():
        match = re.search(pattern, text)
        if match:
            socials.append(f"{platform}:{match.group(1)}")
    result["social_links"] = ", ".join(socials)

    # AI-only fields
    if ai_data:
        niche = ai_data.get("niche", "")
        notable = ai_data.get("notable_detail", "")
        desc = result.get("website_description", "")
        extras = []
        if niche:
            extras.append(f"Niche: {niche}")
        if notable:
            extras.append(f"Notable: {notable}")
        if extras:
            extra_str = " | ".join(extras)
            if desc:
                result["website_description"] = f"{desc} | {extra_str}"[:500]
            else:
                result["website_description"] = extra_str[:500]

    return result


async def analyze_website(session, html, website_url, openai_key=None):
    """Analyze website HTML for coaching-related info."""
    if not html:
        return {}

    text_raw = html_to_text(html)
    text = text_raw.lower()
    text_clean = re.sub(r'\s+', ' ', text_raw).strip()
    html_lower = html.lower()

    result = {}

    # --- AI EXTRACTION (if enabled) ---
    ai_data = None
    if openai_key and len(text_clean) > 50:
        ai_data = await ai_extract(session, text_clean, website_url, openai_key)

    # --- KEYWORD-BASED EXTRACTION ---

    # Check for online coaching
    online_signals = [
        "online coaching", "online training", "virtual training",
        "remote coaching", "online program", "online client",
        "work with me online", "train from anywhere",
        "online personal training", "virtual session",
        "zoom training", "zoom coaching",
    ]
    online_found = [s for s in online_signals if s in text]
    kw_online = len(online_found) > 0

    if ai_data and ai_data.get("offers_online"):
        result["offers_online_coaching"] = str(ai_data["offers_online"]).lower() == "true"
    else:
        result["offers_online_coaching"] = kw_online

    # Website description
    if ai_data and ai_data.get("business_summary"):
        result["website_description"] = ai_data["business_summary"][:500]
    else:
        meta_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', html_lower)
        if meta_match:
            result["website_description"] = meta_match.group(1)[:500]
        else:
            paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)
            for p in paragraphs:
                clean = html_to_text(p).strip()
                if len(clean) > 50:
                    result["website_description"] = clean[:500]
                    break

    # Services
    services = set()
    service_keywords = {
        "personal training": "personal training",
        "group training": "group training",
        "nutrition coaching": "nutrition coaching",
        "meal plan": "meal planning",
        "macro coaching": "macro coaching",
        "online coaching": "online coaching",
        "transformation": "transformation programs",
        "weight loss": "weight loss",
        "strength training": "strength training",
        "1-on-1": "1-on-1 coaching",
        "one-on-one": "1-on-1 coaching",
        "small group": "small group training",
        "bootcamp": "bootcamp",
        "hiit": "HIIT",
        "yoga": "yoga",
        "pilates": "pilates",
        "crossfit": "crossfit",
        "body composition": "body composition",
        "contest prep": "contest prep",
        "athletic performance": "athletic performance",
        "sports massage": "sports massage",
        "corporate wellness": "corporate wellness",
        "posture": "posture correction",
        "flexibility": "flexibility training",
        "rehab": "rehabilitation",
        "functional training": "functional training",
    }
    for keyword, service in service_keywords.items():
        if keyword in text:
            services.add(service)
    if ai_data and ai_data.get("services"):
        for s in ai_data["services"].split(","):
            s = s.strip()
            if s:
                services.add(s)
    result["coaching_services"] = ", ".join(sorted(services))

    # Pricing
    price_patterns = [
        r'\$\d+[\d,.]*\s*/?\s*(?:month|mo|session|week|program)',
        r'\$\d+[\d,.]*',
        r'\d+\s*(?:dollars|usd)\s*/?\s*(?:month|mo|session)',
    ]
    prices_found = []
    for pattern in price_patterns:
        matches = re.findall(pattern, text)
        prices_found.extend(matches[:3])

    result["pricing_visible"] = len(prices_found) > 0
    if prices_found:
        result["pricing_details"] = "; ".join(prices_found[:5])
    elif ai_data and ai_data.get("pricing"):
        result["pricing_visible"] = True
        result["pricing_details"] = ai_data["pricing"][:300]

    # Tools
    tools = set()
    tool_checks = {
        "trainerize": "Trainerize", "truecoach": "TrueCoach",
        "mindbody": "MindBody", "ptminder": "PTminder",
        "zen planner": "Zen Planner", "wodify": "Wodify",
        "pushpress": "PushPress", "gymdesk": "GymDesk",
        "calendly": "Calendly", "acuity": "Acuity Scheduling",
        "stripe": "Stripe", "paypal": "PayPal",
        "my pt hub": "My PT Hub", "exercise.com": "Exercise.com",
        "google calendar": "Google Calendar", "square": "Square",
        "wix bookings": "Wix Bookings", "vagaro": "Vagaro",
        "glofox": "Glofox",
    }
    for keyword, tool in tool_checks.items():
        if keyword in text or keyword in html_lower:
            tools.add(tool)
    if ai_data and ai_data.get("tools"):
        for t in ai_data["tools"].split(","):
            t = t.strip()
            if t:
                tools.add(t)
    result["tools_detected"] = ", ".join(sorted(tools))

    # Social media links
    socials = []
    social_patterns = {
        "instagram": r'(?:instagram\.com|instagr\.am)/([a-zA-Z0-9_.]+)',
        "facebook": r'facebook\.com/([a-zA-Z0-9_.]+)',
        "tiktok": r'tiktok\.com/@([a-zA-Z0-9_.]+)',
        "youtube": r'youtube\.com/(?:c/|channel/|@)([a-zA-Z0-9_.]+)',
        "twitter": r'(?:twitter\.com|x\.com)/([a-zA-Z0-9_.]+)',
    }
    for platform, pattern in social_patterns.items():
        match = re.search(pattern, html)
        if match:
            socials.append(f"{platform}:{match.group(1)}")
    result["social_links"] = ", ".join(socials)

    # AI-only fields
    if ai_data:
        niche = ai_data.get("niche", "")
        notable = ai_data.get("notable_detail", "")
        desc = result.get("website_description", "")
        extras = []
        if niche:
            extras.append(f"Niche: {niche}")
        if notable:
            extras.append(f"Notable: {notable}")
        if extras:
            extra_str = " | ".join(extras)
            if desc:
                result["website_description"] = f"{desc} | {extra_str}"[:500]
            else:
                result["website_description"] = extra_str[:500]

    return result


# --- PROCESS SINGLE LEAD (async) ---
async def process_lead(session, lead, i, total, use_tavily, use_linkedin, tavily_key, apify_key, openai_key, sb_url, sb_key, semaphore, stats):
    """Process a single lead with concurrency control."""
    async with semaphore:
        website = lead.get("website", "")
        linkedin_url = lead.get("linkedin", "") or ""
        name = lead.get("first_name", "")
        company = lead.get("company_name", "")
        lead_id = lead.get("id")

        info = {}
        method = "keyword"
        website_failed = not website or website.strip() == ""

        if use_tavily:
            text, method = await fetch_with_tavily(session, tavily_key, website)
            if text and method != "failed":
                info = await analyze_text(session, text, website, openai_key)
            else:
                website_failed = True
        else:
            html = await fetch_website(session, website)
            if not html:
                website_failed = True
            else:
                info = await analyze_website(session, html, website, openai_key)

        # LinkedIn fallback
        if website_failed and use_linkedin and linkedin_url:
            profile = await scrape_linkedin_apify(session, apify_key, linkedin_url)
            if profile:
                info = linkedin_to_coaching_info(profile)
                method = "linkedin-apify"
                stats["linkedin_used"] += 1
                website_failed = False
            else:
                stats["failed"] += 1
                stats["method_counts"]["failed"] = stats["method_counts"].get("failed", 0) + 1
                print(f"  [{i+1}/{total}] {name} @ {company} — FAILED (website + LinkedIn)", flush=True)
                return
        elif website_failed:
            stats["failed"] += 1
            stats["method_counts"]["failed"] = stats["method_counts"].get("failed", 0) + 1
            print(f"  [{i+1}/{total}] {name} @ {company} — FAILED", flush=True)
            return

        # Track method
        stats["method_counts"][method] = stats["method_counts"].get(method, 0) + 1

        if info.get("offers_online_coaching"):
            stats["online_count"] += 1

        services_str = info.get("coaching_services", "")[:40]
        status = "ONLINE" if info.get("offers_online_coaching") else "ok"
        print(f"  [{i+1}/{total}] {name} @ {company} — {status} via {method} ({services_str})", flush=True)

        # Update Supabase
        update_data = {
            "offers_online_coaching": info.get("offers_online_coaching", False),
            "website_description": (info.get("website_description", "") or "")[:500],
            "coaching_services": (info.get("coaching_services", "") or "")[:500],
            "pricing_visible": info.get("pricing_visible", False),
            "pricing_details": (info.get("pricing_details", "") or "")[:300],
            "tools_detected": (info.get("tools_detected", "") or "")[:300],
            "social_links": (info.get("social_links", "") or "")[:500],
            "enriched_at": datetime.now(timezone.utc).isoformat(),
        }

        await supabase_update(session, sb_url, sb_key, "leads", "id", lead_id, update_data)
        stats["scraped"] += 1


async def async_main():
    limit = 1400  # default
    use_ai = False
    use_tavily = False
    use_linkedin = False
    rerun = False
    concurrency = 10  # default concurrent tasks

    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        if idx + 1 < len(sys.argv):
            limit = int(sys.argv[idx + 1])
    if "--concurrency" in sys.argv:
        idx = sys.argv.index("--concurrency")
        if idx + 1 < len(sys.argv):
            concurrency = int(sys.argv[idx + 1])
    if "--use-ai" in sys.argv:
        use_ai = True
    if "--use-tavily" in sys.argv:
        use_tavily = True
    if "--use-linkedin" in sys.argv:
        use_linkedin = True
    if "--rerun" in sys.argv:
        rerun = True

    env = load_env()
    sb_url = env.get("SUPABASE_URL", "")
    sb_key = env.get("SUPABASE_KEY", "")
    openai_key = env.get("OPENAI_API_KEY", "") if use_ai else None
    tavily_key = env.get("TAVILY_API_KEY", "") if use_tavily else None
    apify_key = env.get("APIFY_API_KEY", "") if use_linkedin else None

    if not sb_url or not sb_key:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)
    if use_ai and not openai_key:
        print("ERROR: OPENAI_API_KEY must be set in .env for --use-ai mode")
        sys.exit(1)
    if use_tavily and not tavily_key:
        print("ERROR: TAVILY_API_KEY must be set in .env for --use-tavily mode")
        sys.exit(1)
    if use_linkedin and not apify_key:
        print("ERROR: APIFY_API_KEY must be set in .env for --use-linkedin mode")
        sys.exit(1)

    # Fetch leads (sync — only once at start)
    select_fields = "id,email,website,first_name,company_name,linkedin"
    if rerun:
        print("RERUN MODE: re-scraping all leads with websites")
        endpoint = f"leads?website=neq.&select={select_fields}&limit={limit}"
    else:
        # Pick up leads with a website OR leads with no website but with LinkedIn
        endpoint = f"leads?enriched_at=is.null&or=(website.neq.,linkedin.neq.)&select={select_fields}&limit={limit}"
    leads = supabase_get_sync(sb_url, sb_key, endpoint)

    if not leads:
        print("No leads to scrape (all already enriched or no websites).")
        return

    # Build mode string
    modes = []
    if use_tavily:
        modes.append("Tavily")
    if use_ai:
        modes.append("AI")
    if use_linkedin:
        modes.append("LinkedIn-fallback")
    if not modes:
        modes.append("keyword-only")
    mode_str = " + ".join(modes)

    linkedin_count = sum(1 for l in leads if l.get("linkedin"))

    print(f"Found {len(leads)} leads to scrape ({mode_str})")
    print(f"Concurrency: {concurrency} simultaneous requests")
    if use_tavily:
        print(f"Estimated Tavily cost: ~${len(leads) * 0.002:.2f}")
    if use_ai:
        print(f"Estimated AI cost: ~${len(leads) * 0.001:.2f}")
    if use_linkedin:
        print(f"Leads with LinkedIn URLs: {linkedin_count}")
        print(f"Estimated LinkedIn cost (if all fail website): ~${linkedin_count * 0.003:.2f}")
    print(flush=True)

    stats = {
        "scraped": 0,
        "failed": 0,
        "online_count": 0,
        "linkedin_used": 0,
        "method_counts": {},
    }

    semaphore = asyncio.Semaphore(concurrency)

    # Use a single aiohttp session with generous connection limits
    connector = aiohttp.TCPConnector(limit=concurrency * 2, limit_per_host=concurrency)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = []
        for i, lead in enumerate(leads):
            task = asyncio.create_task(
                process_lead(
                    session, lead, i, len(leads),
                    use_tavily, use_linkedin,
                    tavily_key, apify_key, openai_key,
                    sb_url, sb_key, semaphore, stats
                )
            )
            tasks.append(task)

        await asyncio.gather(*tasks)

    print()
    print("=" * 50)
    print(f"WEBSITE SCRAPING COMPLETE")
    print(f"  Mode:        {mode_str}")
    print(f"  Concurrency: {concurrency}")
    print(f"  Scraped:     {stats['scraped']}")
    print(f"  Failed:      {stats['failed']}")
    if use_linkedin:
        print(f"  LinkedIn fallback used: {stats['linkedin_used']}")
    print(f"  Online coaching detected: {stats['online_count']}")
    print(f"  Total:       {len(leads)}")
    if stats["method_counts"]:
        print(f"  Methods:     {stats['method_counts']}")
    print("=" * 50)


def main():
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
