import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';

const DASHBOARD_URL = 'https://fitcore-dashboard.vercel.app/';
const OUT = resolve('instagram-posts');

const navPages = [
  { name: 'overview',  nav: 'Overview'  },
  { name: 'clients',   nav: 'Clients'   },
  { name: 'programs',  nav: 'Programs'  },
  { name: 'messages',  nav: 'Messages'  },
  { name: 'analytics', nav: 'Analytics' },
];

const postConfig = [
  {
    id: 'post1-introduction',
    page: 'overview',
    label: 'INTRODUCING FITCORE',
    labelColor: '#00e5c8',
    title: 'Your Coaching Business,<br>One Dashboard.',
    subtitle: 'Manage clients, program workouts, track payments, and communicate across all channels — from one premium platform.',
    badge: 'Built for Fitness Coaches',
    bottomText: 'fitcorehq@gmail.com',
  },
  {
    id: 'post2-clients',
    page: 'clients',
    label: 'CLIENT MANAGEMENT',
    labelColor: '#00e5c8',
    title: 'Every Client.<br>One Place. Total Control.',
    subtitle: 'Complete client profiles with progress tracking, metrics history, goals, and status management.',
    badge: null,
    bottomText: 'Search, filter, and manage — instantly.',
  },
  {
    id: 'post3-programs',
    page: 'programs',
    label: 'WORKOUT PROGRAMMING',
    labelColor: '#6366f1',
    title: 'Build Programs.<br>Assign Instantly.',
    subtitle: '70+ exercises. Sets, reps, RPE, tempo, rest periods. Assign to any client in seconds.',
    badge: null,
    bottomText: 'From template to assigned — in seconds.',
  },
  {
    id: 'post4-messages',
    page: 'messages',
    label: 'MULTI-CHANNEL INBOX',
    labelColor: '#29ABE2',
    title: 'Every Channel.<br>One Inbox. Zero Missed.',
    subtitle: 'Telegram, WhatsApp, Email, Instagram — all your client conversations in one unified feed.',
    badge: null,
    bottomText: 'Stop switching apps. Start coaching.',
  },
  {
    id: 'post5-analytics',
    page: 'analytics',
    label: 'ANALYTICS & INSIGHTS',
    labelColor: '#f59e0b',
    title: 'Data-Driven Coaching.<br>Real Results.',
    subtitle: 'Revenue trends, retention rates, client distribution, and AI-powered coaching insights.',
    badge: null,
    bottomText: 'DM us or email Fitcorehq@gmail.com',
  },
];

async function run() {
  await mkdir(OUT, { recursive: true });

  // ─── STEP 1: Take fresh screenshots as base64 ───
  console.log('=== STEP 1: Taking screenshots ===');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox'],
  });

  const dashPage = await browser.newPage();
  await dashPage.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await dashPage.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Login
  console.log('Logging in...');
  await dashPage.type('input[type="email"]', 'kamil@fitcore.io');
  await dashPage.type('input[type="password"]', 'fitcore123');
  await dashPage.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const btn = btns.find(b => /sign in|log in|login/i.test(b.textContent));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  console.log('Logged in.');

  const screenshots = {};

  for (const navP of navPages) {
    console.log(`  Navigating to ${navP.nav}...`);
    await dashPage.evaluate((navText) => {
      // Find leaf-node spans/divs matching exact text in the sidebar
      const all = [...document.querySelectorAll('span, div')];
      const match = all.find(el => {
        if (el.children.length > 0) return false;
        if (!el.offsetParent) return false;
        return el.textContent?.trim() === navText;
      });
      if (match) {
        // Click the element and its ancestors up to 4 levels
        let t = match;
        for (let i = 0; i < 5 && t; i++) {
          t.click();
          t = t.parentElement;
        }
      }
    }, navP.nav);
    await new Promise(r => setTimeout(r, 2000));

    const buf = await dashPage.screenshot({ type: 'png', encoding: 'base64' });
    screenshots[navP.name] = buf;
    console.log(`  Got ${navP.nav} screenshot (${(buf.length / 1024).toFixed(0)}KB base64)`);
  }

  await dashPage.close();

  // ─── STEP 2: Load logo ───
  const logoBase64 = (await readFile(resolve('public', 'fitcore-logo.png'))).toString('base64');
  console.log(`Logo loaded (${(logoBase64.length / 1024).toFixed(0)}KB base64)`);

  // ─── STEP 3: Generate Instagram posts ───
  console.log('\n=== STEP 3: Generating posts ===');

  for (const post of postConfig) {
    console.log(`  Generating ${post.id}...`);
    const screenshotBase64 = screenshots[post.page];

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1080px; overflow: hidden;
    font-family: 'Outfit', sans-serif;
    background: #07090e;
    position: relative;
  }
  .orb1 {
    position: absolute; top: -120px; right: -120px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(0,229,200,0.07) 0%, transparent 70%);
  }
  .orb2 {
    position: absolute; bottom: -100px; left: -100px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%);
  }
  .content {
    position: relative; z-index: 1;
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    padding: 48px 56px 40px;
  }
  .header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px;
  }
  .logo-img {
    width: 46px; height: 46px; border-radius: 50%;
    object-fit: cover;
  }
  .brand { font-weight: 700; font-size: 24px; color: #f0f2f5; letter-spacing: -0.3px; }
  .brand span { color: #00e5c8; }
  .label {
    font-size: 12px; font-weight: 600; letter-spacing: 2px;
    color: ${post.labelColor}; margin-bottom: 10px;
  }
  .title {
    font-size: 38px; font-weight: 800; line-height: 1.12;
    color: #f0f2f5; letter-spacing: -1.2px; margin-bottom: 10px;
  }
  .subtitle {
    font-size: 15px; color: #8b92a5; line-height: 1.55;
    max-width: 540px; margin-bottom: 20px;
  }
  ${post.badge ? `
  .badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(0,229,200,0.1); border: 1px solid rgba(0,229,200,0.2);
    border-radius: 100px; padding: 7px 18px; margin-bottom: 16px;
    font-size: 12px; font-weight: 600; color: #00e5c8; letter-spacing: 0.5px;
    width: fit-content;
  }
  ` : ''}
  .frame {
    flex: 1; min-height: 0;
    background: rgba(14,18,27,0.85);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    position: relative;
  }
  .browser-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: rgba(12,16,23,0.95);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .dots { display: flex; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-r { background: #ef4444; }
  .dot-y { background: #f59e0b; }
  .dot-g { background: #22c55e; }
  .url-bar {
    flex: 1; background: rgba(22,28,42,0.7); border-radius: 6px;
    padding: 5px 12px; font-size: 11px; color: #525a6e;
    font-family: 'JetBrains Mono', monospace;
  }
  .screenshot-img {
    width: 100%;
    display: block;
  }
  .fade-bottom {
    position: absolute; bottom: 0; left: 0; right: 0; height: 70px;
    background: linear-gradient(transparent, rgba(7,9,14,0.95));
  }
  .bottom {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 16px; padding-top: 4px;
  }
  .bottom-text { font-size: 14px; color: #8b92a5; }
  .bottom-brand { font-size: 13px; color: #525a6e; font-weight: 600; }
  .bottom-brand span { color: #00e5c8; }
</style>
</head>
<body>
  <div class="orb1"></div>
  <div class="orb2"></div>
  <div class="content">
    <div class="header">
      <img class="logo-img" src="data:image/png;base64,${logoBase64}" />
      <div class="brand">Fit<span>Core</span></div>
    </div>
    <div class="label">${post.label}</div>
    ${post.badge ? `<div class="badge">⚡ ${post.badge}</div>` : ''}
    <div class="title">${post.title}</div>
    <div class="subtitle">${post.subtitle}</div>
    <div class="frame">
      <div class="browser-bar">
        <div class="dots">
          <div class="dot dot-r"></div>
          <div class="dot dot-y"></div>
          <div class="dot dot-g"></div>
        </div>
        <div class="url-bar">app.fitcore.io/dashboard</div>
      </div>
      <img class="screenshot-img" src="data:image/png;base64,${screenshotBase64}" />
      <div class="fade-bottom"></div>
    </div>
    <div class="bottom">
      <div class="bottom-text">${post.bottomText}</div>
      <div class="bottom-brand">Fit<span>Core</span></div>
    </div>
  </div>
</body>
</html>`;

    const postPage = await browser.newPage();
    await postPage.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const outPath = resolve(OUT, `${post.id}.png`);
    await postPage.screenshot({ path: outPath, type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } });
    console.log(`  Saved: ${post.id}.png`);
    await postPage.close();
  }

  await browser.close();
  console.log('\nDone! All 5 posts saved to ./instagram-posts/');
}

run().catch(e => { console.error(e); process.exit(1); });
