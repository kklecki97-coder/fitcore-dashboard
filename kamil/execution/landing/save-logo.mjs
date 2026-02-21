import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 800, height: 800 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  // Navigate to the export page
  await page.goto('http://localhost:5174/export-avatar.html', {
    waitUntil: 'networkidle2',
    timeout: 15000,
  });

  // Wait for fonts and canvas rendering
  await new Promise(r => setTimeout(r, 3000));

  // Extract the 512px canvas as PNG base64
  const base64 = await page.evaluate(() => {
    const canvas = document.getElementById('c512');
    return canvas.toDataURL('image/png').replace('data:image/png;base64,', '');
  });

  const buf = Buffer.from(base64, 'base64');

  // Save to multiple locations
  const paths = [
    resolve('public', 'fitcore-logo.png'),
    resolve('..', '..', '..', 'shared', 'fitcore-logo.png'),
  ];

  for (const p of paths) {
    await writeFile(p, buf);
    console.log(`Saved: ${p}`);
  }

  await browser.close();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
