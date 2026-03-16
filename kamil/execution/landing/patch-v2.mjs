import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const OUT_DIR = resolve('public');
const FILES = ['1-overview.png', '2-clients.png', '3-programs.png', '5-analytics.png'];

async function patchImage(browser, file) {
  const srcPath = resolve(OUT_DIR, file.replace('.png', '-orig.png'));
  const logoPath = resolve(OUT_DIR, 'fitcore-logo.png');

  const imgB64 = readFileSync(srcPath).toString('base64');
  const logoB64 = readFileSync(logoPath).toString('base64');

  const page = await browser.newPage();

  const result = await page.evaluate(async (imgB64, logoB64) => {
    const loadImg = (b64) => new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = 'data:image/png;base64,' + b64;
    });

    const [img, logo] = await Promise.all([loadImg(imgB64), loadImg(logoB64)]);

    const W = img.width;   // 2880
    const H = img.height;  // 1800

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const SBG = '#0c1117';
    const ROW_W = 504; // sidebar width px

    // ── 1. Remove Schedule nav item (y≈820, h≈80) ──
    ctx.fillStyle = SBG;
    ctx.fillRect(0, 820, ROW_W, 80);

    // ── 2. Remove Coach Kamil block (y≈1620 to bottom) ──
    ctx.fillRect(0, 1620, ROW_W, H - 1620);

    // ── 3. Replace logo ──
    // Old logo top-left ~8,8 size ~76x76
    ctx.fillStyle = SBG;
    ctx.fillRect(6, 6, 80, 80);
    ctx.drawImage(logo, 8, 8, 76, 76);

    // ── 4. Move Settings + Log Out lower ──
    // Original positions in the -orig images:
    // Settings: y≈1400, h≈56
    // Log Out:  y≈1456, h≈56
    const ROW_H = 56;
    const SETTINGS_Y_OLD = 1398;
    const LOGOUT_Y_OLD   = 1455;
    const SETTINGS_Y_NEW = 1500;
    const LOGOUT_Y_NEW   = 1560;

    // Capture rows before erasing
    const capSettings = document.createElement('canvas');
    capSettings.width = ROW_W; capSettings.height = ROW_H;
    capSettings.getContext('2d').drawImage(img, 0, SETTINGS_Y_OLD, ROW_W, ROW_H, 0, 0, ROW_W, ROW_H);

    const capLogout = document.createElement('canvas');
    capLogout.width = ROW_W; capLogout.height = ROW_H;
    capLogout.getContext('2d').drawImage(img, 0, LOGOUT_Y_OLD, ROW_W, ROW_H, 0, 0, ROW_W, ROW_H);

    // Erase old positions
    ctx.fillStyle = SBG;
    ctx.fillRect(0, SETTINGS_Y_OLD - 4, ROW_W, ROW_H + 8);
    ctx.fillRect(0, LOGOUT_Y_OLD - 4,   ROW_W, ROW_H + 8);

    // Draw at new positions
    ctx.drawImage(capSettings, 0, 0, ROW_W, ROW_H, 0, SETTINGS_Y_NEW, ROW_W, ROW_H);
    ctx.drawImage(capLogout,   0, 0, ROW_W, ROW_H, 0, LOGOUT_Y_NEW,   ROW_W, ROW_H);

    return canvas.toDataURL('image/png').split(',')[1];
  }, imgB64, logoB64);

  const destPath = resolve(OUT_DIR, file);
  writeFileSync(destPath, Buffer.from(result, 'base64'));
  await page.close();
  console.log(`Saved: ${file}`);
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  for (const file of FILES) {
    await patchImage(browser, file);
  }
  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
