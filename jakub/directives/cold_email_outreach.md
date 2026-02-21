# Directive: Cold Email Outreach via Instantly

## Goal
Run cold email campaigns to fitness coaches using Instantly.ai. Convert leads into demo/trial signups for the dashboard product.

## Infrastructure Setup (Week 1)

### Domain Setup
- Buy **4 secondary domains** (~$10-12 each). Examples: fitdash.io, getfitdash.com, tryfitdash.com, fitdashapp.com
- **Never send cold email from your primary domain**
- Set up **2 inboxes per domain** (8 total) via Google Workspace
- Configure **SPF, DKIM, DMARC** on every domain before any sending

### Warmup
- Use Instantly's built-in warmup
- Start at **10 warmup emails/day per inbox**
- Warmup for **2-4 weeks minimum** before any production sends
- Keep **20-30% of daily volume reserved for warmup** even after ramping

### Sending Volume Ramp
| Week | Emails/inbox/day | Total (8 inboxes) |
|------|------------------|--------------------|
| 1-2 | 5-10 | 40-80/day |
| 3-4 | 15-20 | 120-160/day |
| Steady state | 30-40 | 240-320/day |

**Monthly capacity at steady state:** ~5,000-7,000 prospects/month

## Email Sequence (4 Emails)

**Core strategy:** We can customize dashboards on the fly (colors, logo, company name) so every prospect gets a "built for you" experience. This is our biggest differentiator. Loom video walkthrough is only sent when a prospect replies with interest, never in the first cold email.

**Two tracks:**
- **Track A (score 7+):** Full sequence below. Personalized dashboard + Loom on reply.
- **Track B (score 4-6):** Simpler version without the "I built something" angle. TBD.

### Email 1: The Hook (Day 1)

**Subject:** `built something for {{companyName}}`

> {{firstName}},
>
> {{openingLine}}
>
> I built a client dashboard for {{companyName}}. Check-ins, progress tracking, messaging, scheduling... one screen instead of 4 apps.
>
> It's already set up with your colors and logo. And if anything doesn't fit how you work, tell me and I'll adjust it in 10 minutes.
>
> Want me to record a quick walkthrough on video?

**Why it works:** Subject line creates curiosity (lowercase, specific). Opening line is AI-personalized per lead. The body explains what the dashboard actually does (not just "a dashboard"). Hits three value props: already built, solves multi-app mess, fully customizable on the spot. CTA is low-friction (just say yes).

### Email 2: The Pain (Day 4)

**Subject:** `{{firstName}}`

> {{firstName}},
>
> {{painPoint}}
>
> That's what the {{companyName}} dashboard handles. Clients, check-ins, progress, messages... all in one place. And it's built around how YOU work, not some generic template.
>
> If you've already sorted it out, ignore me.

**Why it works:** First-name-only subject line gets opens. Pain point is AI-personalized (different angle than Email 1's opening). Reinforces what the dashboard does. "Built around how YOU work" reminds them it's custom. "If you've already sorted it out, ignore me" is disarming.

### Email 3: The Honest Nudge (Day 9)

**Subject:** `{{companyName}}`

> {{firstName}},
>
> Third email, I'll be quick.
>
> That {{companyName}} dashboard is still set up. Takes 2 min to see if it's actually useful for you.
>
> Want me to send it over?

**Why it works:** "Third email, I'll be quick" is honest without being manipulative. Every email in the sequence references the dashboard, so it reads as one conversation. Soft CTA.

### Email 4: The Breakup (Day 14)

**Subject:** `no worries`

> {{firstName}},
>
> All good. The dashboard's there if you ever want to see it.

**Why it works:** Two sentences. No guilt, no pitch, no passive aggression. Reminds them the asset exists without predicting doom for their business.

### When They Reply Interested

Send a Loom video walkthrough of their branded dashboard. Customize it before recording:
- Their company colors
- Their logo
- Their company name throughout
- Set up for their niche (e.g., if they do 1-on-1 coaching, show client management; if group, show class scheduling)

Keep the Loom under 3 minutes. End with a clear CTA to book a call.

## Personalization Variables

Include these as **custom variables** when adding leads to Instantly (via MCP or CSV):

| Variable | Instantly Field | Example | Source |
|----------|----------------|---------|--------|
| `{{firstName}}` | `first_name` (built-in) | Jake | Supabase `leads.first_name` |
| `{{companyName}}` | `company_name` (built-in) | JFit Coaching | Supabase `leads.company_name` |
| `{{openingLine}}` | Custom variable | Lagree + VersaClimber on Mindbody. Two class types, one messy system. | Supabase `leads.ai_opening_line` |
| `{{painPoint}}` | Custom variable | Running nutrition coaching for 11 people through Calendly with no client portal. | Supabase `leads.ai_pain_point` |

**Note:** `{{openingLine}}` and `{{painPoint}}` are generated per-lead by GPT-5-nano based on scraped website data, job title, team size, and niche. Quality depends on how much data the scraper extracted. Leads with confidence score < 4 should be excluded or moved to Track B.

**Fallback for missing first names:** If we can't extract a first name from the email, use their **last name** instead (e.g., `Kellogg,` as greeting, `Kellogg` as subject). Professional and personal. If no last name either, fall back to `"Hey"`. Handled by `fix_first_names.py`. Current stats: 2,902 real first names, 430 last name fallback.

**Avoid:** "FREE", "limited time", exclamation marks, all caps — these trigger spam filters.

## Instantly MCP Integration

We manage Instantly campaigns, leads, and analytics directly from Claude Code via the **Instantly MCP server**. No scripts needed — the MCP tools handle everything.

### Connection Setup

The MCP server is configured in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "instantly": {
      "url": "https://mcp.instantly.ai/mcp",
      "headers": {
        "Authorization": "<INSTANTLY_API_KEY>"
      }
    }
  }
}
```

API key is stored in the settings file (not `.env`). To generate a new key: Instantly dashboard → Integrations → API Keys → Create API Key.

### Available MCP Tools (38 total)

**Campaigns (8 tools)**
| Tool | What it does |
|------|-------------|
| `create_campaign` | Create a new campaign (two-step: create, then add sequence) |
| `list_campaigns` | List all campaigns with pagination |
| `get_campaign` | Get campaign details and sequences |
| `update_campaign` | Modify campaign settings (schedule, name, etc.) |
| `activate_campaign` | Start sending |
| `pause_campaign` | Stop sending |
| `delete_campaign` | Permanently delete a campaign |
| `search_campaigns_by_contact` | Find campaigns for a specific contact |

**Leads (12 tools)**
| Tool | What it does |
|------|-------------|
| `list_leads` | List leads with filters |
| `get_lead` | Get single lead details |
| `create_lead` | Add one lead |
| `update_lead` | Update lead (⚠️ `custom_variables` replaces ALL existing) |
| `list_lead_lists` | View lead lists |
| `create_lead_list` | Create a new lead list |
| `update_lead_list` | Update lead list settings |
| `add_leads_to_campaign_or_list_bulk` | **Import up to 1,000 leads at once** — use this for bulk uploads |
| `move_leads_to_campaign_or_list` | Transfer leads between campaigns/lists |
| `delete_lead` | Remove a lead |
| `delete_lead_list` | Remove a lead list |
| `get_verification_stats_for_lead_list` | Check email verification stats |

**Emails (6 tools)**
| Tool | What it does |
|------|-------------|
| `list_emails` | List emails with filters |
| `get_email` | Get email details |
| `reply_to_email` | ⚠️ Send an actual reply |
| `count_unread_emails` | Count unread messages |
| `verify_email` | Check deliverability |
| `mark_thread_as_read` | Mark thread read |

**Analytics (3 tools)**
| Tool | What it does |
|------|-------------|
| `get_campaign_analytics` | Opens, clicks, replies, bounces |
| `get_daily_campaign_analytics` | Day-by-day breakdown |
| `get_warmup_analytics` | Warmup health for sending accounts |

**Accounts (6 tools)**
| Tool | What it does |
|------|-------------|
| `list_accounts` | List sending accounts |
| `get_account` | Account details + warmup status |
| `create_account` | Add new sending account |
| `update_account` | Modify account settings |
| `manage_account_state` | Pause, resume, warmup, test vitals |
| `delete_account` | Remove account |

**Background Jobs (2 tools)**
| Tool | What it does |
|------|-------------|
| `list_background_jobs` | List async jobs |
| `get_background_job` | Get job details |

### How to Create a Campaign (Step by Step)

1. **Create the campaign** with `create_campaign` — this returns a campaign ID
2. **Update the campaign** with `update_campaign` to add the 4-email sequence, set schedule, and configure settings
3. **Create a lead list** or use an existing one
4. **Bulk import leads** with `add_leads_to_campaign_or_list_bulk` (max 1,000 per call, loop for more). Include custom variables: `openingLine`, `painPoint`
5. **Activate** with `activate_campaign`

### Mapping Supabase → Instantly

When pushing leads from Supabase to Instantly:

| Supabase field | Instantly field | Notes |
|----------------|----------------|-------|
| `email` | `email` | Required |
| `first_name` | `first_name` | Built-in Instantly field |
| `last_name` | `last_name` | Built-in |
| `company_name` | `company_name` | Built-in |
| `ai_opening_line` | `custom_variables.openingLine` | Custom variable |
| `ai_pain_point` | `custom_variables.painPoint` | Custom variable |
| `ai_confidence_score` | (used for segmentation only) | Score 7+ = Track A, 4-6 = Track B |
| `website` | `custom_variables.website` | Optional, for reference |

### Segmentation Strategy

- **Track A campaign (score 7+):** ~1,108 leads. Full personalized sequence with "I built something" angle.
- **Track B campaign (score 4-6):** ~1,044 leads. Simpler sequence. TBD.
- **Skip (score 1-3):** ~768 leads. Not our ICP. Don't email.
- **No data (no opening line):** ~412 leads. Skip.

### Monitoring Checklist

After launch, use MCP analytics tools daily:
1. `get_campaign_analytics` — check overall open/reply/bounce rates
2. `get_daily_campaign_analytics` — spot trends day by day
3. `get_warmup_analytics` — ensure sending accounts are healthy
4. If bounce rate > 2%, pause campaign immediately with `pause_campaign`

## Health Metrics to Monitor

| Metric | Target | Red Flag |
|--------|--------|----------|
| Bounce rate | <1% (ideally <0.5%) | >2% = stop and clean list |
| Open rate | 25-45% | <15% = deliverability issue |
| Reply rate | 3-5%+ | <1% = messaging problem |
| Spam complaints | <0.1% | >0.3% = stop immediately |

## Send Schedule
- **Best days:** Tuesday, Wednesday, Thursday
- **Best time:** 9-11 AM in recipient's timezone
- Thursday mornings have the highest open rates (44%)

## Legal Compliance Checklist

Every email must include:
- [ ] Your physical mailing address (PO Box is fine)
- [ ] One-click unsubscribe link (Instantly handles this)
- [ ] Accurate "From" name (real person, not brand)
- [ ] Honest subject line matching body content
- [ ] Only emailing addresses from public business listings

**US (CAN-SPAM):** Cold B2B email is legal. Follow the checklist above.
**EU/UK (GDPR):** Requires "legitimate interest" basis. Add: "You're receiving this because your business is publicly listed on [source]. Reply 'remove' to opt out."
**Canada (CASL):** Stricter. Only email if contact is clearly publicly listed for business purposes. Start with US only.

## 30-Day Timeline

| Week | Focus |
|------|-------|
| 1 | Buy domains, set up inboxes, configure DNS, start warmup |
| 2 | Build lead list (see `find_coaches.md`), clean/verify emails, segment |
| 3 | Launch first campaign (40-80 emails/day), monitor daily |
| 4 | Review data, A/B test Email 1, ramp to 120-160/day, add LinkedIn touches |

## Target Metrics After 30 Days
- 1,500-2,500 prospects contacted
- 25-40% open rate
- 3-5% reply rate (38-125 replies)
- 10-25 demo/trial signups

## Supplementary Channels

### LinkedIn (secondary — use after email)
- When you send a cold email, connect on LinkedIn 1-2 days later (multichannel touch)
- Don't invest in Sales Navigator yet ($99/mo) — spend that on email infrastructure first
- Best for higher-ticket coaches ($500+/mo programs)
- Most online fitness coaches are NOT active on LinkedIn — their audience is on IG/TikTok

### Instagram DMs (warm follow-up only)
- Do NOT use for cold outreach (accounts get banned, doesn't scale)
- Use for warm follow-ups to people who opened your email but didn't reply

## Pipeline Status (as of 2026-02-21)

| Metric | Count |
|--------|-------|
| Total leads in Supabase | 3,332 |
| Scraped (website data) | 2,881 (86%) |
| Has AI opening line | 2,920 (88%) |
| Score 7+ (Track A ready) | 1,108 |
| Score 4-6 (Track B) | 1,044 |
| Score 1-3 (skip) | 768 |
| No data (skip) | 412 |

**AI model:** GPT-5-nano ($0.05/M input, $0.40/M output). Switched from GPT-5-mini for 4-8x cost savings with comparable quality. Prompt is tightened with banned phrases and inline score caps — see `enrich_with_ai.py` for details.

**Scripts are async:** Both `scrape_websites.py` and `enrich_with_ai.py` use `asyncio` + `aiohttp` with configurable concurrency (default 10 and 20 respectively). Full pipeline runs in ~30 min for 3,000+ leads.
