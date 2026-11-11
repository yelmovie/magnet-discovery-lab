// All renewed activity pages, science guides and next-action cues at tablet/phone sizes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fixture = JSON.parse(fs.readFileSync(process.env.TEST_FIXTURE, 'utf8'));
const base = process.env.TEST_URL || 'http://127.0.0.1:4196/';
const out = process.env.TEST_OUT || 'test-results/science-ux';
fs.mkdirSync(out, { recursive: true });
const results = [], errors = [];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  try {
    const page = await browser.newPage({ hasTouch: true });
    page.on('pageerror', e => errors.push(e.message));
    await page.routeWebSocket('**', socket => socket.close());
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + '\nwindow.__edu={start(v,n){modalCleanup?.();s=v;practiceBackup=null;adminBackup=null;startActivity(n);},get save(){return s}};' });
    });
    await page.goto(base);
    await page.waitForFunction(() => !!window.__edu);
    for (const [width, height] of [[1280,800],[1024,768],[915,412],[768,1024],[375,812]]) {
      await page.setViewportSize({ width, height });
      for (let n = 1; n <= 10; n++) {
        const state = structuredClone(fixture);
        state.completed = state.completed.filter(value => value < n);
        state.evidence = state.evidence.filter(e => e.stage < Math.floor((n - 1) / 2));
        for (const key of Object.keys(state.activities)) if (Number(key) >= n) delete state.activities[key];
        if (n === 9) delete state.idea;
        Object.assign(state.settings, { effects: false, music: false, motion: false });
        await page.evaluate(({ state, n }) => window.__edu.start(state, n), { state, n });
        const crisis = page.locator('[data-mission="crisis-go"]');
        if (await crisis.count()) await crisis.click();
        await page.waitForFunction(() => [...document.images].filter(i => i.getBoundingClientRect().width).every(i => i.complete && i.naturalWidth > 0));
        if (n <= 8) {
          const cue = page.locator('.next-action-target');
          assert.equal(await cue.count(), 1, `activity ${n} ${width} next action`);
          assert.ok(await cue.isVisible());
          assert.ok(await cue.isEnabled());
          assert.ok((await page.locator('.mission-next-action').innerText()).length > 5);
          if (width === 1280 || width === 915) await page.screenshot({ path: `${out}/${width}-activity-${n}.png` });
          if (!await page.locator('.learning-visual-preview').isVisible()) await page.locator('.coach-toggle').click();
          await page.locator('[data-action="visual-guide"]:visible, [data-action="science-guide"]:visible').first().click();
          const note = page.locator('.science-note');
          await note.scrollIntoViewIfNeeded();
          assert.ok(await note.isVisible());
          assert.ok(await note.locator('.science-emphasis').count());
          if ([4,5,6,8].includes(n)) assert.match(await page.locator('.learning-visual-frame img').getAttribute('src'), /^data:image\/webp/);
          const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
          assert.equal(wide, false, `guide ${n} ${width} horizontal overflow`);
          if (width === 1280 || n === 4) await page.screenshot({ path: `${out}/${width}-guide-${n}.png` });
          await page.locator('.modal-close').click();
        } else {
          assert.ok(await page.locator('.idea-head h1').isVisible());
          assert.ok(await page.locator('.idea-next').isVisible());
          if (width === 1280 || width === 915) await page.screenshot({ path: `${out}/${width}-activity-${n}.png` });
        }
        results.push({ width, height, activity: n, passed: true });
        console.log(`PASS ${width} activity ${n}`);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
