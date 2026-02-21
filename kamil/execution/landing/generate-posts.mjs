import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';

const OUT = resolve('instagram-posts');
const SCREENSHOTS = resolve('screenshots');

const posts = [
  {
    id: 'post1-introduction',
    screenshot: '1-overview.png',
    label: 'INTRODUCING FITCORE',
    title: 'Your Coaching Business,\nOne Dashboard.',
    subtitle: 'Manage clients, program workouts, track payments, and communicate across all channels — from one premium platform.',
    badge: 'Built for Fitness Coaches',
    bottomText: 'fitcorehq@gmail.com',
  },
  {
    id: 'post2-clients',
    screenshot: '2-clients.png',
    label: 'CLIENT MANAGEMENT',
    title: 'Every Client.\nOne Place. Total Control.',
    subtitle: 'Complete client profiles with progress tracking, metrics history, goals, and status management.',
    badge: null,
    bottomText: 'Search, filter, and manage — instantly.',
  },
  {
    id: 'post3-programs',
    screenshot: '3-programs.png',
    label: 'WORKOUT PROGRAMMING',
    title: 'Build Programs.\nAssign Instantly.',
    subtitle: '70+ exercises. Sets, reps, RPE, tempo, rest periods. Assign to any client in seconds.',
    badge: null,
    bottomText: 'From template to assigned — in seconds.',
  },
  {
    id: 'post4-messages',
    screenshot: '4-messages.png',
    label: 'MULTI-CHANNEL INBOX',
    title: 'Every Channel.\nOne Inbox. Zero Missed.',
    subtitle: 'Telegram, WhatsApp, Email, Instagram — all your client conversations in one unified feed.',
    badge: null,
    bottomText: 'Stop switching apps. Start coaching.',
  },
  {
    id: 'post5-analytics',
    screenshot: '5-analytics.png',
    label: 'ANALYTICS & INSIGHTS',
    title: 'Data-Driven Coaching.\nReal Results.',
    subtitle: 'Revenue trends, retention rates, client distribution, and AI-powered coaching insights.',
    badge: null,
    bottomText: 'DM us or email Fitcorehq@gmail.com',
  },
];

function generateHTML(post) {
  const screenshotPath = `file:///${SCREENSHOTS.replace(/\\/g, '/')}/${post.screenshot}`;
  const labelColors = {
    'INTRODUCING FITCORE': '#00e5c8',
    'CLIENT MANAGEMENT': '#00e5c8',
    'WORKOUT PROGRAMMING': '#6366f1',
    'MULTI-CHANNEL INBOX': '#29ABE2',
    'ANALYTICS & INSIGHTS': '#f59e0b',
  };
  const labelColor = labelColors[post.label] || '#00e5c8';

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1080px; overflow: hidden;
    font-family: 'Outfit', sans-serif;
    background: #07090e;
    position: relative;
  }
  /* Ambient glow */
  .orb1 {
    position: absolute; top: -120px; right: -120px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(0,229,200,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .orb2 {
    position: absolute; bottom: -100px; left: -100px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%);
    pointer-events: none;
  }
  .content {
    position: relative; z-index: 1;
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    padding: 52px 56px 44px;
  }
  /* Header */
  .header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 28px;
  }
  .logo-box {
    width: 40px; height: 40px; border-radius: 10px;
    background: linear-gradient(135deg, #00e5c8, #6366f1);
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 20px; color: #07090e;
  }
  .brand { font-weight: 700; font-size: 22px; color: #f0f2f5; letter-spacing: -0.3px; }
  .brand span { color: #00e5c8; }
  .label {
    font-size: 12px; font-weight: 600; letter-spacing: 2px;
    color: ${labelColor}; margin-bottom: 10px;
  }
  .title {
    font-size: 36px; font-weight: 800; line-height: 1.15;
    color: #f0f2f5; letter-spacing: -1px; margin-bottom: 10px;
    white-space: pre-line;
  }
  .subtitle {
    font-size: 15px; color: #8b92a5; line-height: 1.55;
    max-width: 520px; margin-bottom: 24px;
  }
  ${post.badge ? `
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(0,229,200,0.1); border: 1px solid rgba(0,229,200,0.2);
    border-radius: 100px; padding: 6px 16px; margin-bottom: 20px;
    font-size: 12px; font-weight: 600; color: #00e5c8; letter-spacing: 0.5px;
  }
  .badge::before { content: '⚡'; font-size: 11px; }
  ` : ''}
  /* Screenshot frame */
  .screenshot-frame {
    flex: 1; min-height: 0;
    background: rgba(14,18,27,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
    position: relative;
  }
  .browser-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px;
    background: rgba(12,16,23,0.9);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .dots { display: flex; gap: 5px; }
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
    width: 100%; height: calc(100% - 38px);
    object-fit: cover; object-position: top left;
    display: block;
  }
  .fade-bottom {
    position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
    background: linear-gradient(transparent, #07090e);
    pointer-events: none;
  }
  /* Bottom */
  .bottom {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 20px;
  }
  .bottom-text { font-size: 14px; color: #8b92a5; font-weight: 400; }
  .bottom-brand { font-size: 12px; color: #525a6e; font-weight: 500; }
  .bottom-brand span { color: #00e5c8; }
</style>
</head>
<body>
  <div class="orb1"></div>
  <div class="orb2"></div>
  <div class="content">
    <div class="header">
      <div class="logo-box">F</div>
      <div class="brand">Fit<span>Core</span></div>
    </div>
    <div class="label">${post.label}</div>
    ${post.badge ? `<div class="badge">${post.badge}</div>` : ''}
    <div class="title">${post.title}</div>
    <div class="subtitle">${post.subtitle}</div>
    <div class="screenshot-frame">
      <div class="browser-bar">
        <div class="dots">
          <div class="dot dot-r"></div>
          <div class="dot dot-y"></div>
          <div class="dot dot-g"></div>
        </div>
        <div class="url-bar">app.fitcore.io/dashboard</div>
      </div>
      <img class="screenshot-img" src="${screenshotPath}" />
      <div class="fade-bottom"></div>
    </div>
    <div class="bottom">
      <div class="bottom-text">${post.bottomText}</div>
      <div class="bottom-brand">Fit<span>Core</span></div>
    </div>
  </div>
</body>
</html>`;
}

async function run() {
  await mkdir(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1080, height: 1080, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });

  for (const post of posts) {
    console.log(`Generating ${post.id}...`);

    const page = await browser.newPage();
    const html = generateHTML(post);

    // Write temp HTML
    const tmpPath = resolve(OUT, `_tmp_${post.id}.html`);
    await writeFile(tmpPath, html);

    await page.goto(`file:///${tmpPath.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });

    // Wait for font load + image
    await new Promise(r => setTimeout(r, 3000));

    const outPath = resolve(OUT, `${post.id}.png`);
    await page.screenshot({ path: outPath, type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } });
    console.log(`  Saved: ${outPath}`);

    await page.close();
  }

  await browser.close();

  // Clean up temp files
  const { readdir, unlink } = await import('fs/promises');
  const files = await readdir(OUT);
  for (const f of files) {
    if (f.startsWith('_tmp_')) await unlink(resolve(OUT, f));
  }

  console.log(`\nDone! 5 Instagram posts saved to ./instagram-posts/`);
}

run().catch(e => { console.error(e); process.exit(1); });
