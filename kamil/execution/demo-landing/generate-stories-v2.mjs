/**
 * Generate all v2 Instagram Stories automatically.
 *
 * Opens story-highlights-v2.html in Puppeteer, loads screenshots from "SS IG" folder,
 * renders each story, and saves to "IG STORIES v2" on Desktop.
 *
 * Usage: node generate-stories-v2.mjs
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DESKTOP = 'C:\\Users\\Kamil\\Desktop';
const SS_DIR = path.join(DESKTOP, 'SS IG');
const OUTPUT_DIR = path.join(DESKTOP, 'IG STORIES v2');
const HTML_PATH = path.join(__dirname, 'public', 'story-highlights-v2.html');

// Map: screenshot filename → story ID in the generator
const SCREENSHOT_MAP = {
  'Zrzut ekranu 2026-03-20 131956.png': 'panel-overview',
  'Zrzut ekranu 2026-03-20 130323.png': 'panel-clients',
  'Zrzut ekranu 2026-03-20 131750.png': 'panel-analytics',
  'Zrzut ekranu 2026-03-20 133429.png': 'prog-import',
  'Zrzut ekranu 2026-03-20 134710.png': 'prog-builder',
  'Zrzut ekranu 2026-03-20 135220.png': 'prog-exercises',
  'Zrzut ekranu 2026-03-20 135043.png': 'prog-ai',
  'Zrzut ekranu 2026-03-20 140438.png': 'app-home',
  'Zrzut ekranu 2026-03-20 141920.png': 'app-workout',
  'Zrzut ekranu 2026-03-20 142754.png': 'app-progress',
  'Zrzut ekranu 2026-03-20 144751.png': 'ci-form',
  'Zrzut ekranu 2026-03-20 144556.png': 'ci-coach',
  'Zrzut ekranu 2026-03-20 144709.png': 'ci-history',
  'Zrzut ekranu 2026-03-20 145954.png': 'chat-coach',
  'Zrzut ekranu 2026-03-20 145928.png': 'chat-client',
  'Zrzut ekranu 2026-03-20 155259.png': 'pay-invoices',
  'Zrzut ekranu 2026-03-20 155339.png': 'pay-client',
};

// Category folders for organized output
const CATEGORY_MAP = {
  'panel': 'PANEL TRENERA',
  'prog': 'PROGRAMY',
  'app': 'APKA KLIENTA',
  'ci': 'CHECK INY',
  'chat': 'CHAT',
  'pay': 'PLATNOSCI',
};

function getCategoryFolder(storyId) {
  for (const [prefix, folder] of Object.entries(CATEGORY_MAP)) {
    if (storyId.startsWith(prefix)) return folder;
  }
  return 'OTHER';
}

async function main() {
  // Create output directory structure
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
  for (const folder of Object.values(CATEGORY_MAP)) {
    const dir = path.join(OUTPUT_DIR, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  }

  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Load the v2 generator
  const fileUrl = `file:///${HTML_PATH.replace(/\\/g, '/')}`;
  console.log(`📄 Loading ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts and initial render
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 2000));

  // Upload screenshots to their respective stories
  console.log('\n📱 Uploading screenshots...');
  for (const [filename, storyId] of Object.entries(SCREENSHOT_MAP)) {
    const filePath = path.join(SS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  Missing: ${filename} → skipping ${storyId}`);
      continue;
    }

    // Read the image as base64 and inject it
    const imgData = fs.readFileSync(filePath);
    const base64 = imgData.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    await page.evaluate((sid, src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          screenshotImages[sid] = img;
          drawStory(sid);
          resolve();
        };
        img.src = src;
      });
    }, storyId, dataUrl);

    console.log(`  ✅ ${storyId} ← ${filename}`);
  }

  // Wait for all canvases to render
  await new Promise(r => setTimeout(r, 1000));

  // Get all story IDs from the page
  const allStoryIds = await page.evaluate(() => {
    const ids = [];
    highlights.forEach(h => {
      h.stories.forEach(s => ids.push(s.id));
    });
    return ids;
  });

  // Download each story canvas as PNG
  console.log(`\n💾 Saving ${allStoryIds.length} stories...`);
  for (const storyId of allStoryIds) {
    // Make sure story is drawn
    await page.evaluate((sid) => drawStory(sid), storyId);

    const dataUrl = await page.evaluate((sid) => {
      const canvas = document.getElementById('canvas-' + sid);
      return canvas ? canvas.toDataURL('image/png') : null;
    }, storyId);

    if (!dataUrl) {
      console.log(`  ⚠️  No canvas for ${storyId}`);
      continue;
    }

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const folder = getCategoryFolder(storyId);
    const outPath = path.join(OUTPUT_DIR, folder, `fitcore-story-v2-${storyId}.png`);
    fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    console.log(`  ✅ ${folder}/fitcore-story-v2-${storyId}.png`);
  }

  await browser.close();
  console.log(`\n🎉 Done! All stories saved to: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
