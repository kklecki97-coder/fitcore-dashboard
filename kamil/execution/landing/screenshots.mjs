import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

const URL = 'https://fitcore-dashboard.vercel.app/';
const OUT = resolve('screenshots');

const pages = [
  { name: '1-overview',   nav: 'Overview',          wait: 1500 },
  { name: '2-clients',    nav: 'Clients',           wait: 1500 },
  { name: '3-programs',   nav: 'Workout Programs',  wait: 1500 },
  { name: '4-messages',   nav: 'Messages',          wait: 1500 },
  { name: '5-analytics',  nav: 'Analytics',         wait: 1500 },
];

async function run() {
  await mkdir(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  // Go to dashboard and login
  console.log('Loading dashboard...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Login with demo credentials
  console.log('Logging in...');
  await page.type('input[type="email"]', 'kamil@fitcore.io');
  await page.type('input[type="password"]', 'fitcore123');

  // Click login button
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const loginBtn = buttons.find(b => b.textContent.includes('Sign In') || b.textContent.includes('Log In') || b.textContent.includes('Login'));
    if (loginBtn) loginBtn.click();
  });

  // Wait for dashboard to load
  await new Promise(r => setTimeout(r, 3000));
  console.log('Logged in, dashboard loaded.');

  for (const p of pages) {
    console.log(`Navigating to ${p.nav}...`);

    // Click the nav item in sidebar
    await page.evaluate((navText) => {
      const items = [...document.querySelectorAll('span, div, a, button')];
      const navItem = items.find(el => {
        const text = el.textContent?.trim();
        return text === navText && el.offsetParent !== null;
      });
      if (navItem) {
        navItem.click();
        // Also try clicking parent if it's a span inside a button/link
        if (navItem.parentElement) navItem.parentElement.click();
      } else {
        console.log('Could not find nav item: ' + navText);
      }
    }, p.nav);

    await new Promise(r => setTimeout(r, p.wait));

    const path = `${OUT}/${p.name}.png`;
    await page.screenshot({ path, type: 'png' });
    console.log(`  Saved: ${path}`);
  }

  await browser.close();
  console.log('\nDone! All screenshots saved to ./screenshots/');
}

run().catch(e => { console.error(e); process.exit(1); });
