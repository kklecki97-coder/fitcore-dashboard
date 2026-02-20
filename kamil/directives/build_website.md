# Directive: Build a Professional Website

> SOP for building high-quality, professional websites for fitness coaches using Claude Code.

## Goal

Build modern, professional websites that don't look "AI vibecoded" — sites that feel custom-designed and branded for each coach.

## Prerequisites

- Front-end design skill installed in `.claude/skills/frontend-design.md`
- Brand assets folder with logo + brand guidelines (colors, typography, icons)
- Reference sites / component inspiration gathered

---

## Step-by-Step Process

### 1. Always Invoke the Front-End Design Skill

**This is non-negotiable.** Before writing any front-end code, every session, no exceptions:

- The front-end design skill is installed at `kamil/.claude/skills/frontend-design.md`
- It produces significantly more modern, professional designs
- Without it: ~40% quality. With it: ~60%+ quality out of the gate
- It avoids generic AI aesthetics (overused fonts like Inter/Roboto, cliched purple gradients, predictable layouts)

### 2. Set Up Brand Assets

Before building, create a `brand_assets/` folder containing:

- **Logo** (PNG/SVG)
- **Brand guidelines** (colors, typography, icons, tone)

Reference this folder in your prompts or CLAUDE.md so Claude always has access. You can also `@mention` specific files directly in prompts to be explicit about which assets to use.

### 3. Use Reference Websites as Inspiration (Clone Method)

Instead of building from scratch, find a high-quality reference site and clone its structure:

**Where to find inspiration:**
- **Dribbble** (dribbble.com) — design mockups
- **Godly** (godly.website) — curated website designs
- **Awwwards** (awwwards.com) — award-winning websites

**How to clone a reference site:**
1. Open the reference site in your browser
2. Hit F12 (or right-click → Inspect) to open DevTools
3. In the Console tab, press Ctrl+Shift+P (Cmd+Shift+P on Mac) and search for "screenshot" → "Capture full size screenshot" to get the entire page
4. Go to the Elements tab → copy the CSS/style information
5. Give Claude Code **both** the full-page screenshot AND the style code
6. Ask it to clone the site, then layer in your own branding on top

**Example prompt:**
> "I want you to spin up a new website. Clone this reference site. Here's the full-page screenshot and here's the style code. Once the clone is done, work in our brand assets (logo, colors, typography)."

### 4. Screenshot Loop (Visual QA)

Set up Puppeteer so Claude Code can take screenshots of what it builds, compare to the reference/intent, and self-correct.

**How it works:**
- Claude writes the code → starts the server → takes screenshots
- It does **at least 2 rounds** of screenshot comparison and polish
- It looks section-by-section and analyzes how well it matches the reference

**When to turn it OFF:**
- For **animated/dynamic elements** (backgrounds, transitions, hover effects)
- Screenshots can't capture animations well
- Claude gets stuck thinking it hasn't built it well enough and overengineers
- In these cases, tell Claude: "Because this is an animated element, do not use the screenshot tool to compare. Just work in the code and I will let you know if we need changes."

**Screenshot naming:**
- Use descriptive naming conventions for screenshots so you can tell them apart
- Clear old screenshots before starting a new build

### 5. Individual Components for Uniqueness

After the base site looks good, elevate it with high-quality individual components:

**Best source: 21st.dev**
- Buttons (rainbow outlines, shiny effects, glowing pulses)
- Backgrounds (hero waves, gradient meshes, animated particles)
- Shaders, mouse highlights, scroll effects
- Dark mode / light mode toggles

**How to use:**
1. Browse 21st.dev and find a component you like
2. Copy the component's code/prompt
3. Tell Claude Code exactly where to place it (e.g., "work in this background element right behind the hero text")
4. Paste the component code after your instruction

This is how you make a site feel unique — mix and match components from different sources rather than building everything from scratch.

### 6. Iterate in Small Steps

- Get the overall feel/vibe right first with big structural changes
- Then make small, nitpicky tweaks — these happen quickly once you have a working version
- Use natural language feedback: describe what you see and what you want changed
- Example: "The background is too distracting, the text is hard to read, make the animation less pixelated and more professional"

### 7. Use Plan Mode for Complex Design Decisions

- For complex or ambiguous design changes, use plan mode
- Claude will ask clarifying questions before coding
- Leads to better first-pass results and less back-and-forth
- Skip plan mode for small tweaks and iteration

### 8. Local-First Development

**Always test on localhost before pushing anywhere.**

- Make changes → preview on localhost → iterate until happy
- Only push to GitHub when you explicitly approve the changes
- This prevents bad or half-finished changes from going live

Add to CLAUDE.md or your prompt:
> "Always test on localhost until I explicitly tell you to push to GitHub or commit changes."

---

## Deployment Pipeline

Once the site looks good locally:

1. **Push to GitHub** — version control, commit history, collaboration
2. **Connect GitHub to Vercel** — sign up at vercel.com with your GitHub account
3. **Auto-deploy** — every push to GitHub automatically deploys to Vercel
4. **Custom domain** — configure in Vercel project settings → Domains

**Key rule:** Local changes stay local until you explicitly say "push to GitHub." Vercel auto-deploys from GitHub, so only push when you're happy with the result.

---

## Tools & Scripts

| Tool | Purpose |
|------|---------|
| Front-end design skill | Better visual design quality |
| Puppeteer | Screenshot loop for visual QA |
| 21st.dev | Individual component inspiration |
| Dribbble / Godly / Awwwards | Full website inspiration |
| GitHub | Version control and code hosting |
| Vercel | Deployment and hosting |

---

## Common Pitfalls

1. **Not using the front-end design skill** — always invoke it, the quality difference is massive
2. **Screenshot loop on animations** — turn it off for dynamic elements or Claude gets stuck
3. **Pushing untested changes** — always preview on localhost first
4. **Building from scratch** — clone a reference site first, then customize. Much faster and better results
5. **Being too vague** — the more specific your feedback, the better the iteration
6. **Forgetting brand assets** — always have logo + brand guidelines accessible

---

## Learnings

- (Add learnings here as you build — API constraints, timing, edge cases, what worked, what didn't)
