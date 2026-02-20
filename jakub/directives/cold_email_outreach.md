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

### Email 1: Problem-Aware Opener (Day 1)

**Subject:** `Quick question, {{firstName}}`

> Hi {{firstName}},
>
> I noticed you're coaching clients online (saw your {{platform}}). Quick question — are you still managing client check-ins and programs through spreadsheets or messaging apps?
>
> We built a dashboard specifically for online coaches that handles progress tracking, client communication, and programming in one place. Coaches tell us it saves them 5-8 hours/week on admin.
>
> Worth a quick look?

### Email 2: Social Proof / Pain Agitation (Day 4)

**Subject:** `Re: Quick question, {{firstName}}`

> Hey {{firstName}},
>
> Wanted to follow up. The coaches we work with all had the same problem — they were spending more time on spreadsheets and WhatsApp than actually coaching.
>
> One coach went from managing 18 clients (maxed out) to 35 within two months after switching. Same hours, double the revenue.
>
> Would a 10-minute demo be useful?

### Email 3: Value Add (Day 9)

**Subject:** `One more thing`

> {{firstName}},
>
> Last thing — I put together a quick breakdown of what top online coaches use to scale past 20 clients without hiring. Happy to send it over if you're interested.
>
> Either way, no worries.

### Email 4: Clean Breakup (Day 14)

**Subject:** `Closing the loop`

> Hi {{firstName}},
>
> I'll assume the timing isn't right. If managing clients ever becomes a bottleneck, I'm here.
>
> Wishing you a great week.

## Personalization Variables

Include these columns in your CSV upload to Instantly:

| Variable | Example | Source |
|----------|---------|--------|
| `{{firstName}}` | Jake | Lead list |
| `{{companyName}}` | JFit Coaching | Lead list |
| `{{platform}}` | Instagram page | Where you found them |
| `{{niche}}` | weight loss | Lead list |
| `{{location}}` | Austin, TX | Lead list |

### Spintax (Prevents Spam Detection)
```
{{RANDOM | Hi | Hey | Hello}} {{firstName}},

{{RANDOM | I noticed | I saw | I came across}} your coaching {{RANDOM | program | business | page}} on {{platform}}.
```
Spin at the **section level**, not word-by-word. Every variation must preserve meaning and grammar.

## Subject Lines That Work

Best performers for solo entrepreneurs (under 7 words, personalized):
- `Quick question, {{firstName}}`
- `{{firstName}} - managing {{number}} clients?`
- `Saw your coaching on IG`
- `Still using spreadsheets?`
- `Your coaching business`

**Avoid:** "FREE", "limited time", exclamation marks, all caps — these trigger spam filters.

## The Offer

- **Primary CTA:** Free 14-day trial
- **Secondary CTA:** 10-minute demo call
- Example: "Want to try it free for 14 days? Or if you'd prefer, I can walk you through it in 10 minutes."
- Do NOT lead with "custom build" — sounds expensive. Save for responses where a coach needs something specific.

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
