import puppeteer from 'puppeteer';
import { resolve } from 'path';

const URL = 'https://fitcore-dashboard.vercel.app/';
const OUT = resolve('screenshots');

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
    const loginBtn = buttons.find(b => b.textContent.includes('Sign In') || b.textContent.includes('Log In') || b.textContent.includes('Login'));
    if (loginBtn) loginBtn.click();
  });

  await new Promise(r => setTimeout(r, 3000));
  console.log('Logged in.');

  // Fix: Navigate to Programs page
  console.log('Navigating to Programs...');
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('*')];
    // Look for sidebar nav items containing "Program"
    const navItem = items.find(el => {
      const text = el.textContent?.trim();
      return text && (text === 'Programs' || text === 'Workout Programs') &&
             el.offsetParent !== null &&
             (el.tagName === 'SPAN' || el.tagName === 'DIV') &&
             el.children.length === 0;
    });
    if (navItem) {
      console.log('Found programs nav:', navItem.textContent);
      let target = navItem;
      // Walk up to find clickable parent
      for (let i = 0; i < 5; i++) {
        target.click();
        target = target.parentElement;
        if (!target) break;
      }
    } else {
      console.log('Could not find Programs nav');
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${OUT}/3-programs.png`, type: 'png' });
  console.log('  Saved 3-programs.png');

  // Fix: Navigate to Messages page
  console.log('Navigating to Messages...');
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('*')];
    const navItem = items.find(el => {
      const text = el.textContent?.trim();
      return text && text === 'Messages' &&
             el.offsetParent !== null &&
             (el.tagName === 'SPAN' || el.tagName === 'DIV') &&
             el.children.length === 0;
    });
    if (navItem) {
      console.log('Found messages nav:', navItem.textContent);
      let target = navItem;
      for (let i = 0; i < 5; i++) {
        target.click();
        target = target.parentElement;
        if (!target) break;
      }
    } else {
      console.log('Could not find Messages nav');
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${OUT}/4-messages.png`, type: 'png' });
  console.log('  Saved 4-messages.png');

  await browser.close();
  console.log('\nDone! Fixed screenshots saved.');
}

run().catch(e => { console.error(e); process.exit(1); });
