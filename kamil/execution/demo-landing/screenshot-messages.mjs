import puppeteer from 'puppeteer';
import { copyFile } from 'fs/promises';
import { resolve } from 'path';

const URL = 'http://localhost:5174/';
const OUT = resolve('public/4-messages.png');

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  console.log('Loading dashboard...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  console.log('Logging in...');
  await page.type('input[type="email"]', 'kamil@fitcore.io');
  await page.type('input[type="password"]', 'fitcore123');

  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const loginBtn = buttons.find(b =>
      b.textContent.includes('Sign In') ||
      b.textContent.includes('Log In') ||
      b.textContent.includes('Login') ||
      b.textContent.includes('Zaloguj')
    );
    if (loginBtn) loginBtn.click();
  });

  await new Promise(r => setTimeout(r, 3000));
  console.log('Logged in.');

  // Navigate to Messages
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('span, div, a, button')];
    const navItem = items.find(el => {
      const text = el.textContent?.trim();
      return (text === 'Messages' || text === 'Wiadomości') && el.offsetParent !== null;
    });
    if (navItem) {
      navItem.click();
      if (navItem.parentElement) navItem.parentElement.click();
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: OUT, type: 'png' });
  console.log(`Saved: ${OUT}`);

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
