import puppeteer from 'puppeteer';
import { copyFile } from 'fs/promises';
import { resolve } from 'path';

const URL = 'https://app.fitcore.tech/';
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
  // Clear and fill email
  await page.click('input[type="email"]', { clickCount: 3 });
  await page.keyboard.type('kklecki97@gmail.com');
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.keyboard.type('12345678');

  // Click submit button
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  } catch {
    console.log('Navigation timeout, continuing...');
  }

  await new Promise(r => setTimeout(r, 3000));

  // Check current URL and page state
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  console.log('Logged in.');

  // Switch dashboard language to English and reload
  await page.evaluate(() => localStorage.setItem('fitcore-lang', 'en'));
  await page.goto('https://app.fitcore.tech/en/', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // Take debug screenshot to see current state
  await page.screenshot({ path: OUT.replace('4-messages', '4-messages-debug'), type: 'png' });
  console.log('Debug screenshot taken');

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
    } else {
      console.log('Nav item not found');
    }
  });

  await new Promise(r => setTimeout(r, 2500));

  // Replace real names with demo names in the DOM before screenshot
  await page.evaluate(() => {
    const nameMap = {
      'Kamileeek': 'Marcus Chen',
      'Kuba Mika': 'Sarah Williams',
      'kamileeek': 'marcus chen',
      'kuba mika': 'sarah williams',
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let text = node.textContent;
      for (const [real, demo] of Object.entries(nameMap)) {
        text = text.split(real).join(demo);
      }
      if (text !== node.textContent) node.textContent = text;
    }
  });

  await page.screenshot({ path: OUT, type: 'png' });
  console.log(`Saved: ${OUT}`);

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
