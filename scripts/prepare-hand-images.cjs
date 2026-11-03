// Resize the original AI-generated transparent sprites without changing their artwork.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(process.argv[2] || '.');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    for (const key of ['held', 'released']) {
      const source = path.join(root, `assets/source/quest/experiment-hand-${key}-20261103.png`);
      const buffer = await fs.readFile(source);
      const encoded = await page.evaluate(async data => {
        const img = new Image(); img.src = data; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 384;
        canvas.getContext('2d').drawImage(img, 0, 0, 384, 384);
        return canvas.toDataURL('image/webp', .9).split(',')[1];
      }, `data:image/png;base64,${buffer.toString('base64')}`);
      const output = path.join(root, `public/assets/quest/experiment-hand-${key}.webp`);
      const data = Buffer.from(encoded, 'base64');
      await fs.writeFile(output, data);
      console.log(`${key}: ${data.length} bytes`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
