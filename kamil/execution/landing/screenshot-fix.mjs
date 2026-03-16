import puppeteer from 'puppeteer';
import { resolve } from 'path';

const BASE_URL = 'https://app.fitcore.tech/';
const OUT_DIR = resolve('public');

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.click('input[type="email"]', { clickCount: 3 });
  await page.keyboard.type('kamil@fitcore.io');
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.keyboard.type('fitcore123');
  await page.click('button[type="submit"]');
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  } catch {}
  await page.evaluate(() => localStorage.setItem('fitcore-lang', 'en'));
  await page.goto('https://app.fitcore.tech/en/', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
}

async function cleanSidebar(page) {
  await page.evaluate(() => {
    // Remove Schedule nav item
    const items = [...document.querySelectorAll('span, div, a, button, li')];
    for (const el of items) {
      if (el.textContent?.trim() === 'Schedule' && el.offsetParent !== null) {
        // Walk up to remove the whole nav row
        let target = el;
        while (target.parentElement && target.parentElement.children.length === 1) {
          target = target.parentElement;
        }
        target.remove();
        break;
      }
    }
    // Remove Coach Kamil bottom profile block
    const allEls = [...document.querySelectorAll('*')];
    for (const el of allEls) {
      const text = el.textContent?.trim() ?? '';
      if ((text.startsWith('Coach') || text.includes('Coach Kamil')) &&
          el.children.length < 4 &&
          el.offsetParent !== null) {
        el.remove();
        break;
      }
    }
  });
}

async function navigateTo(page, label) {
  await page.evaluate((label) => {
    const items = [...document.querySelectorAll('span, div, a, button')];
    const navItem = items.find(el => el.textContent?.trim() === label && el.offsetParent !== null);
    if (navItem) {
      navItem.click();
      if (navItem.parentElement) navItem.parentElement.click();
    }
  }, label);
  await new Promise(r => setTimeout(r, 2500));
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  console.log('Logging in...');
  await login(page);
  console.log('Logged in.');

  const screens = [
    { label: 'Overview',  file: '1-overview.png' },
    { label: 'Clients',   file: '2-clients.png' },
    { label: 'Programs',  file: '3-programs.png' },
    { label: 'Analytics', file: '5-analytics.png' },
  ];

  for (const { label, file } of screens) {
    console.log(`Navigating to ${label}...`);
    await navigateTo(page, label);
    await cleanSidebar(page);
    const out = resolve(OUT_DIR, file);
    await page.screenshot({ path: out, type: 'png' });
    console.log(`Saved: ${out}`);
  }

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
