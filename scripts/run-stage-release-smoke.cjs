// Plays the 3D delivery course on a deployed origin with the keyboard, reading only the page and its saved record.
//   node scripts/run-stage-release-smoke.cjs https://magnet-city.pages.dev [output folder]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = (process.argv[2] || 'https://magnet-city.pages.dev').replace(/\/$/, '') + '/';
const out = process.argv[3] || 'test-results/run-stage-release';
const empty = () => ({ values: {}, points: {}, records: [], mask: [], trials: [] });
const state = {
  version: 2, revision: 1, started: true, updated: new Date().toISOString(), completed: [1, 2, 3, 4, 5, 6, 7],
  evidence: [0, 1, 2].map(stage => ({ stage, date: new Date().toISOString(), activities: [empty(), empty()], summary: [] })),
  activities: {}, design: { template: 'box', pair: 'iron', pole: 'N', gap: 65, aligned: false, revision: 0 }, designs: {}, resume: 8, city: { x: 233, y: 245 },
  settings: { sound: false, music: false, musicVersion: 1, effects: false, musicVolume: .35, motion: true, nickname: '', autoplay: true, autoplaySpeed: 1 },
  final: { report: false, latch: 'N', ring: 'N', plate: 80, complete: false, date: '' }, greetedResidents: [0, 1, 2], mapEncounters: {},
};
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(origin); await page.locator('[data-action="start"]').waitFor();
    await page.evaluate(save => new Promise((resolve, reject) => {
      const request = indexedDB.open('push-pull-city'); request.onerror = reject;
      request.onsuccess = () => { const db = request.result, tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(save, 'main'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = reject; };
    }), state);
    await page.reload(); await page.locator('[data-action="start"]').click();
    await page.waitForSelector('.mission-world.run-mode .mission-board[data-run-ready]', { timeout: 30000 });
    await page.locator('[data-mission="crisis-go"]').click();
    const at = () => page.evaluate(() => Number(document.querySelector('.mission-board').dataset.runAt));
    const status = () => page.evaluate(() => document.querySelector('.delivery-state')?.textContent || '');
    const saved = () => page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('push-pull-city'); request.onerror = reject;
      request.onsuccess = () => { const db = request.result, get = db.transaction('saves').objectStore('saves').get('main'); get.onsuccess = () => { db.close(); resolve(get.result.activities[8]); }; get.onerror = reject; };
    }));
    const until = async (test, label, timeout = 60000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await test()) return; await page.waitForTimeout(50); } throw new Error('timeout: ' + label + ' at ' + await at() + ' · ' + await status()); };
    const done = round => page.waitForFunction(r => document.querySelector(`[data-run-step="${r + 1}"]`)?.dataset.state === 'done', round, { timeout: 8000 });
    await page.keyboard.down('ArrowUp');
    let jumps = 0;
    await until(async () => { const s = await at(); if (s < 1 && ++jumps % 7 === 0) await page.keyboard.press('Space'); return s >= 30; }, '출발역 지나기');
    await until(async () => (await status()).startsWith('배달 장소야'), '1구간');
    await page.keyboard.up('ArrowUp'); await page.keyboard.press('KeyE'); await done(0);
    await page.screenshot({ path: `${out}/stretch1.png` });
    await page.locator('[data-mission="delivery-next"]').click();
    await page.waitForSelector('.mission-board[data-run-ready]');
    await page.keyboard.down('KeyS'); await until(async () => await at() <= 37, '수레 뒤로'); await page.keyboard.up('KeyS');
    await page.keyboard.press('KeyF'); await page.keyboard.down('ArrowUp');
    await until(async () => (await status()).startsWith('배달 장소야'), '2구간');
    await page.keyboard.up('ArrowUp'); await page.keyboard.press('KeyE'); await done(1);
    await page.waitForFunction(() => document.querySelector('[data-action="complete"]')?.disabled === false);
    await page.screenshot({ path: `${out}/done.png` });
    await page.waitForTimeout(1500);
    const a = await saved(), proof = key => a.trials.find(t => t.key === key && t.outcome === 'success');
    assert.equal(a.values.view, 'run'); assert.equal(a.values.segment0, true); assert.equal(a.values.segment1, true);
    assert.ok(proof('delivery0') && proof('delivery1'), 'delivery0 · delivery1');
    assert.equal(proof('delivery1').conditions.course, 'glass-room');
    await page.locator('[data-mission="view-bench"]').click(); await page.waitForSelector('[data-drag="controller"]');
    assert.deepEqual(errors, []);
    console.log(`${origin}: 3D course played to the end with the keyboard; segment0·1 and delivery0·1 saved; bench fallback opens`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
