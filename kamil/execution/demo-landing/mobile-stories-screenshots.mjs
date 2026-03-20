/**
 * FitCore — Mobile Story Screenshots Generator
 *
 * Prerequisites:
 *   - Dashboard running on http://localhost:5174
 *   - Client Portal running on http://localhost:5173
 *
 * Usage:  node mobile-stories-screenshots.mjs
 * Output: ./story-screenshots/
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

const OUT = resolve('story-screenshots');
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3 };

const DASHBOARD_URL = 'http://localhost:5174';
const CLIENT_URL = 'http://localhost:5173';

const COACH_EMAIL = 'kklecki97@gmail.com';
const COACH_PASS = '12345678';
const CLIENT_EMAIL = 'kklecki97@op.pl';
const CLIENT_PASS = '12345678';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════
//  DEFINITIONS
// ═══════════════════════════════════════

const dashboardScreens = [
  { name: 'panel-overview',  navPage: 'overview'  },
  { name: 'panel-clients',   navPage: 'clients'   },
  { name: 'panel-analytics', navPage: 'analytics' },
  { name: 'prog-builder',    navPage: 'programs'  },
  { name: 'chat-coach',      navPage: 'messages'  },
  { name: 'ci-coach',        navPage: 'check-ins' },
  { name: 'pay-invoices',    navPage: 'payments'  },
];

const clientScreens = [
  { name: 'app-home',     navPage: 'home'     },
  { name: 'app-workout',  navPage: 'program'  },
  { name: 'app-progress', navPage: 'progress' },
  { name: 'app-calendar', navPage: 'calendar' },
  { name: 'chat-client',  navPage: 'messages' },
  { name: 'ci-form',      navPage: 'check-in' },
  { name: 'pay-client',   navPage: 'invoices' },
];

// ═══════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════

async function login(page, email, password) {
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await sleep(500);

  // Clear fields first then type
  await page.evaluate(() => {
    document.querySelector('input[type="email"]').value = '';
    document.querySelector('input[type="password"]').value = '';
  });

  await page.type('input[type="email"]', email, { delay: 20 });
  await page.type('input[type="password"]', password, { delay: 20 });

  // Click Sign In
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const btn = buttons.find(b => /sign in|zaloguj/i.test(b.textContent));
    if (btn) btn.click();
  });

  // Wait for login to complete — wait until login form disappears
  console.log('  Waiting for auth...');
  try {
    await page.waitForFunction(() => {
      // Login succeeded when email input is gone (we're past login page)
      return !document.querySelector('input[type="email"]');
    }, { timeout: 15000 });
    console.log('  ✓ Logged in!');
  } catch {
    // Check if there's an error message
    const err = await page.evaluate(() => {
      const el = document.querySelector('[style*="color: #ef4444"], [style*="color: red"], [style*="#ef4444"]');
      return el ? el.textContent : null;
    });
    if (err) console.log(`  ✗ Login failed: ${err}`);
    else console.log('  ⚠ Login timeout — might still be on login page');
  }

  await sleep(2000);
}

// ═══════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════

async function navigateDashboard(page, navPage) {
  // Step 1: Open hamburger menu (sidebar is hidden on mobile)
  // The hamburger is the first button inside header
  await page.evaluate(() => {
    // Find all buttons, the menu button has an SVG child (Menu icon from lucide)
    const headerEl = document.querySelector('header');
    if (!headerEl) return;
    const btns = headerEl.querySelectorAll('button');
    // First button in header is the hamburger on mobile
    if (btns.length > 0) btns[0].click();
  });
  await sleep(800);

  // Step 2: Click nav item via data-tour attribute
  const clicked = await page.evaluate((target) => {
    const el = document.querySelector(`[data-tour="nav-${target}"]`);
    if (el) { el.click(); return true; }
    return false;
  }, navPage);

  if (!clicked) {
    console.log(`     ⚠ Could not find nav-${navPage}, trying text fallback...`);
    await page.evaluate((target) => {
      const map = {
        'overview': ['Overview', 'Przegląd'],
        'clients': ['Clients', 'Klienci'],
        'programs': ['Programs', 'Programy'],
        'messages': ['Messages', 'Wiadomości'],
        'check-ins': ['Check-Ins', 'Check-iny'],
        'payments': ['Payments', 'Płatności'],
        'analytics': ['Analytics', 'Analityka'],
      };
      const labels = map[target] || [];
      const all = [...document.querySelectorAll('button, a')];
      for (const label of labels) {
        const match = all.find(el => el.textContent?.trim().includes(label) && el.offsetParent !== null);
        if (match) { match.click(); return; }
      }
    }, navPage);
  }

  await sleep(2500);
}

async function navigateClient(page, navPage) {
  // Bottom nav uses data-tour="nav-{page}" — but only 5 pages are in mobile bottom bar
  // For check-in and invoices, we need special handling

  // Special: check-in — go to home first, then click "Check-In" quick action
  if (navPage === 'check-in') {
    // First go home
    await page.evaluate(() => {
      const el = document.querySelector('[data-tour="nav-home"]');
      if (el) el.click();
    });
    await sleep(1500);
    // Now click the Check-In quick action button on home page
    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find(b => /check-in/i.test(b.textContent));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!clicked) {
      console.log('     ⚠ Check-In button not found on home, trying sessionStorage...');
      await page.evaluate(() => {
        sessionStorage.setItem('fitcore-client-page', 'check-in');
        location.reload();
      });
      await sleep(3000);
    }
    await sleep(2000);
    return;
  }

  // Special: invoices — not in mobile bottom nav, navigate via settings or direct
  if (navPage === 'invoices') {
    // Try clicking settings gear in header, which might have invoices link
    // Or use sessionStorage + reload as last resort
    await page.evaluate(() => {
      sessionStorage.setItem('fitcore-client-page', 'invoices');
      location.reload();
    });
    await sleep(3500);
    return;
  }

  // Normal bottom nav pages
  const clicked = await page.evaluate((target) => {
    const el = document.querySelector(`[data-tour="nav-${target}"]`);
    if (el) { el.click(); return true; }
    return false;
  }, navPage);

  if (!clicked) {
    console.log(`     ⚠ nav-${navPage} not found, trying text fallback...`);
    await page.evaluate((target) => {
      const all = [...document.querySelectorAll('button, a, [role="button"]')];
      const match = all.find(el => el.textContent?.trim().toLowerCase().includes(target) && el.offsetParent !== null);
      if (match) match.click();
    }, navPage);
  }

  await sleep(2500);
}

// ═══════════════════════════════════════
//  SCREENSHOT
// ═══════════════════════════════════════

async function takeScreenshot(page, filepath) {
  await page.evaluate(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    // Remove toasts
    document.querySelectorAll('[class*="toast"], [class*="Toast"]').forEach(el => el.remove());
  });
  await sleep(300);
  await page.screenshot({ path: filepath, type: 'png', fullPage: false });
}

async function dismissModals(page) {
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="button"]')];
    const dismiss = btns.find(b => /skip|close|dismiss|got it|pomiń|zamknij|rozumiem|next|dalej/i.test(b.textContent));
    if (dismiss) dismiss.click();
    document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="Overlay"]').forEach(o => {
      if (o.style) o.click();
    });
  });
  await sleep(400);
}

// ═══════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════

async function run() {
  await mkdir(OUT, { recursive: true });

  console.log('═══════════════════════════════════════');
  console.log('  FitCore Mobile Story Screenshots');
  console.log('  iPhone 14 Pro — 390×844 @3x');
  console.log('═══════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: MOBILE,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ─── COACH DASHBOARD ───
  console.log('📱 COACH DASHBOARD\n');
  try {
    const p = await browser.newPage();
    await p.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Skip any onboarding/walkthrough modals
    await p.evaluate(() => {
      localStorage.setItem('fitcore-onboarding-done', 'true');
    });

    await login(p, COACH_EMAIL, COACH_PASS);

    // Dismiss any remaining modals
    await dismissModals(p);
    await sleep(1000);
    await dismissModals(p);

    // Check if we're actually past login
    const isLoggedIn = await p.evaluate(() => !document.querySelector('input[type="email"]'));
    if (!isLoggedIn) {
      console.log('  ✗ Still on login page — skipping dashboard screenshots');
    } else {
      for (const screen of dashboardScreens) {
        console.log(`  📸 ${screen.name}...`);
        await navigateDashboard(p, screen.navPage);
        await dismissModals(p);
        await takeScreenshot(p, `${OUT}/${screen.name}.png`);
        console.log(`     ✓ ${screen.name}.png`);
      }
    }
    await p.close();
  } catch (err) {
    console.error('  ✗ Dashboard error:', err.message);
  }

  // ─── CLIENT PORTAL ───
  console.log('\n📱 CLIENT PORTAL\n');
  try {
    const p = await browser.newPage();
    await p.goto(CLIENT_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Pre-set localStorage to skip onboarding walkthrough modal
    await p.evaluate(() => {
      localStorage.setItem('fitcore-client-walkthrough-done', 'true');
      sessionStorage.setItem('fitcore-walkthrough-checked', 'true');
    });

    await login(p, CLIENT_EMAIL, CLIENT_PASS);

    await dismissModals(p);
    await sleep(1000);
    await dismissModals(p);

    const isLoggedIn = await p.evaluate(() => !document.querySelector('input[type="email"]'));
    if (!isLoggedIn) {
      console.log('  ✗ Still on login page — skipping client screenshots');
    } else {
      for (const screen of clientScreens) {
        console.log(`  📸 ${screen.name}...`);
        await navigateClient(p, screen.navPage);
        await dismissModals(p);
        await takeScreenshot(p, `${OUT}/${screen.name}.png`);
        console.log(`     ✓ ${screen.name}.png`);
      }
    }
    await p.close();
  } catch (err) {
    console.error('  ✗ Client portal error:', err.message);
  }

  await browser.close();

  console.log('\n═══════════════════════════════════════');
  console.log('  ✓ DONE! Screenshots in ./story-screenshots/');
  console.log('═══════════════════════════════════════');
}

run().catch(e => { console.error(e); process.exit(1); });
