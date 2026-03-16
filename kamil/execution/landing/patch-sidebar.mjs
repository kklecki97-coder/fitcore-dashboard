import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const OUT_DIR = resolve('public');
const SB_W = 252; // display px sidebar width
const SB_H = 900;

const FILES = [
  { file: '1-overview.png',  active: 'Overview'  },
  { file: '2-clients.png',   active: 'Clients'   },
  { file: '3-programs.png',  active: 'Programs'  },
  { file: '5-analytics.png', active: 'Analytics' },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox'],
  });

  // Single page — login once, reuse session
  const page = await browser.newPage();
  await page.goto('https://app.fitcore.tech/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.click('input[type="email"]', { clickCount: 3 });
  await page.keyboard.type('kklecki97@gmail.com');
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.keyboard.type('12345678');
  await page.click('button[type="submit"]');
  try { await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }); } catch {}
  await page.evaluate(() => localStorage.setItem('fitcore-lang', 'en'));
  await page.goto('https://app.fitcore.tech/en/', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Logged in.');

  for (const { file, active } of FILES) {
    console.log(`Capturing sidebar for ${active}...`);

    // Navigate to the right page
    await page.evaluate((label) => {
      const items = [...document.querySelectorAll('span, div, a, button')];
      const navItem = items.find(el => el.textContent?.trim() === label && el.offsetParent !== null);
      if (navItem) { navItem.click(); if (navItem.parentElement) navItem.parentElement.click(); }
    }, active);
    await new Promise(r => setTimeout(r, 1200));

    // Screenshot just the sidebar strip
    const sbBuf = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: SB_W, height: SB_H },
    });
    const sbB64 = sbBuf.toString('base64');

    // Composite: paste sidebar onto original @2x screenshot
    const srcB64 = readFileSync(resolve(OUT_DIR, file.replace('.png', '-orig.png'))).toString('base64');

    const compPage = await browser.newPage();
    const result = await compPage.evaluate(async (srcB64, sbB64, sbW, sbH) => {
      const loadImg = b64 => new Promise(res => {
        const img = new Image(); img.onload = () => res(img);
        img.src = 'data:image/png;base64,' + b64;
      });
      const [src, sb] = await Promise.all([loadImg(srcB64), loadImg(sbB64)]);
      const canvas = document.createElement('canvas');
      canvas.width = src.width; canvas.height = src.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(src, 0, 0);
      // Scale sidebar (@1x 252x900) to fit @2x source (504x1800)
      const scale = src.height / sbH;
      ctx.drawImage(sb, 0, 0, sbW * scale, src.height);
      return canvas.toDataURL('image/png').split(',')[1];
    }, srcB64, sbB64, SB_W, SB_H);

    writeFileSync(resolve(OUT_DIR, file), Buffer.from(result, 'base64'));
    await compPage.close();
    console.log(`Saved: ${file}`);
  }

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
