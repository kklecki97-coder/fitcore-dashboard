import puppeteer from 'puppeteer';
import { resolve } from 'path';

const BASE_URL = 'https://app.fitcore.tech/en/';
const OUT_DIR = resolve('public');

async function login(page) {
  await page.goto('https://app.fitcore.tech/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.click('input[type="email"]', { clickCount: 3 });
  await page.keyboard.type('kklecki97@gmail.com');
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.keyboard.type('12345678');
  await page.click('button[type="submit"]');
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  } catch {}
  // Switch to English
  await page.evaluate(() => localStorage.setItem('fitcore-lang', 'en'));
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
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
    const out = resolve(OUT_DIR, file);
    await page.screenshot({ path: out, type: 'png' });
    console.log(`Saved: ${out}`);
  }

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
