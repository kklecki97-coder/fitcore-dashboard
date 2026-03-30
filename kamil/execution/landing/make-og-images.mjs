import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const posts = [
  {
    slug: 'how-to-manage-clients-as-personal-trainer',
    title: 'How to Manage Clients as a Personal Trainer in 2026',
    titlePl: 'Jak zarządzać klientami jako trener personalny w 2026',
    tags: ['client-management', 'productivity'],
    emoji: '👥',
  },
  {
    slug: 'best-tools-for-fitness-trainers-2026',
    title: 'Best Tools for Fitness Trainers in 2026',
    titlePl: 'Najlepsze narzędzia dla trenera fitness w 2026',
    tags: ['tools', 'comparison'],
    emoji: '🛠️',
  },
  {
    slug: 'automate-payments-and-workouts',
    title: 'How to Automate Payments and Workout Delivery',
    titlePl: 'Jak zautomatyzować płatności i treningi',
    tags: ['automation', 'payments'],
    emoji: '⚡',
  },
  {
    slug: 'why-excel-is-not-enough-for-fitness-coaching',
    title: 'Why Excel Is Not Enough for Fitness Coaching',
    titlePl: 'Dlaczego Excel nie wystarczy do coachingu',
    tags: ['excel', 'scaling'],
    emoji: '📊',
  },
];

function generateHTML(title, tags, emoji) {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      font-family: 'Outfit', sans-serif;
      background: #07090e;
      color: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .glow-1 {
      position: absolute;
      top: -120px;
      right: -100px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(0,229,200,0.12) 0%, transparent 70%);
      border-radius: 50%;
    }
    .glow-2 {
      position: absolute;
      bottom: -150px;
      left: -80px;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
      border-radius: 50%;
    }
    .content {
      position: relative;
      z-index: 1;
      padding: 60px 80px;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .top {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      color: #00e5c8;
      letter-spacing: -0.5px;
    }
    .badge {
      font-size: 12px;
      font-weight: 600;
      color: #00e5c8;
      background: rgba(0,229,200,0.12);
      padding: 4px 14px;
      border-radius: 999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .middle {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 20px;
    }
    .emoji {
      font-size: 48px;
    }
    h1 {
      font-size: 46px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -1px;
      max-width: 900px;
    }
    .tags {
      display: flex;
      gap: 10px;
    }
    .tag {
      font-size: 13px;
      font-weight: 600;
      color: #8b92a5;
      background: rgba(255,255,255,0.06);
      padding: 6px 16px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .url {
      font-size: 16px;
      color: #525a6e;
      font-weight: 500;
    }
    .blog-label {
      font-size: 14px;
      font-weight: 600;
      color: #00e5c8;
      border: 1px solid rgba(0,229,200,0.25);
      padding: 6px 18px;
      border-radius: 8px;
    }
    .border-frame {
      position: absolute;
      inset: 16px;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 16px;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>
  <div class="border-frame"></div>
  <div class="content">
    <div class="top">
      <span class="logo">FitCore</span>
      <span class="badge">Blog</span>
    </div>
    <div class="middle">
      <div class="emoji">${emoji}</div>
      <h1>${title}</h1>
      <div class="tags">
        ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
    </div>
    <div class="bottom">
      <span class="url">fitcore.tech/blog</span>
      <span class="blog-label">Read Article →</span>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  const outDir = join(__dirname, 'public', 'og');
  mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });

  for (const post of posts) {
    // English version
    const htmlEn = generateHTML(post.title, post.tags, post.emoji);
    await page.setContent(htmlEn, { waitUntil: 'domcontentloaded' });
    const bufEn = await page.screenshot({ type: 'png' });
    const pathEn = join(outDir, `${post.slug}.png`);
    writeFileSync(pathEn, bufEn);
    console.log(`✓ ${pathEn}`);

    // Polish version
    const htmlPl = generateHTML(post.titlePl, post.tags, post.emoji);
    await page.setContent(htmlPl, { waitUntil: 'domcontentloaded' });
    const bufPl = await page.screenshot({ type: 'png' });
    const pathPl = join(outDir, `${post.slug}-pl.png`);
    writeFileSync(pathPl, bufPl);
    console.log(`✓ ${pathPl}`);
  }

  await browser.close();
  console.log('\nDone! OG images saved to public/og/');
}

main().catch(console.error);
