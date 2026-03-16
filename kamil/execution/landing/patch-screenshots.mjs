import puppeteer from 'puppeteer';
import { resolve, basename } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const OUT_DIR = resolve('public');

// Each file: list of rectangles to paint over (as % of image dimensions)
// Measured from the original 1440x900 @2x = 2880x1800 px images
// sidebar bg color: #0c1117
// Image is 2880x1800 (1440x900 @2x)
// Sidebar width: ~252px display = 504px image
// "Schedule" nav item: y~820px image, h~80px
// "Coach Kamil" block: y~1620px image, to bottom
const PATCHES = {
  '1-overview.png': [
    { x: 0, y: 820/1800,  w: 504/2880, h: 80/1800,            color: '#0c1117' },
    { x: 0, y: 1620/1800, w: 504/2880, h: (1800-1620)/1800,   color: '#0c1117' },
  ],
  '2-clients.png': [
    { x: 0, y: 820/1800,  w: 504/2880, h: 80/1800,            color: '#0c1117' },
    { x: 0, y: 1620/1800, w: 504/2880, h: (1800-1620)/1800,   color: '#0c1117' },
  ],
  '3-programs.png': [
    { x: 0, y: 820/1800,  w: 504/2880, h: 80/1800,            color: '#0c1117' },
    { x: 0, y: 1620/1800, w: 504/2880, h: (1800-1620)/1800,   color: '#0c1117' },
  ],
  '5-analytics.png': [
    { x: 0, y: 820/1800,  w: 504/2880, h: 80/1800,            color: '#0c1117' },
    { x: 0, y: 1620/1800, w: 504/2880, h: (1800-1620)/1800,   color: '#0c1117' },
  ],
};

async function patchImage(browser, srcPath, destPath, patches) {
  const imgData = readFileSync(srcPath).toString('base64');
  const page = await browser.newPage();

  const result = await page.evaluate(async (b64, patches) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        for (const p of patches) {
          ctx.fillStyle = p.color;
          ctx.fillRect(
            Math.round(p.x * img.width),
            Math.round(p.y * img.height),
            Math.round(p.w * img.width),
            Math.round(p.h * img.height)
          );
        }
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  }, imgData, patches);

  writeFileSync(destPath, Buffer.from(result, 'base64'));
  await page.close();
}

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  for (const [file, patches] of Object.entries(PATCHES)) {
    const srcPath = resolve(OUT_DIR, file.replace('.png', '-orig.png'));
    const destPath = resolve(OUT_DIR, file);
    console.log(`Patching ${file}...`);
    await patchImage(browser, srcPath, destPath, patches);
    console.log(`Saved: ${destPath}`);
  }

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
