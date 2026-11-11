// Run on the production preview with a synthetic completed save from playful-regression.cjs.
// Each scenario uses a separate browser context and only the normal UI and IndexedDB.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fixture = JSON.parse(fs.readFileSync(process.env.TEST_FIXTURE, 'utf8'));
const base = process.env.TEST_URL || 'http://127.0.0.1:4198/';
const out = process.env.TEST_OUT || 'test-results/puzzle-regression';
fs.mkdirSync(out, { recursive: true });
const results = [], errors = [];
let browser, page;

async function saved() {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('push-pull-city');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, read = db.transaction('saves').objectStore('saves').get('main');
      read.onsuccess = () => { db.close(); resolve(read.result); };
      read.onerror = () => { db.close(); reject(read.error); };
    };
  }));
}
async function start(n, viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.locator('[data-action="start"]').waitFor();
  const state = structuredClone(fixture);
  state.started = true;
  state.resume = n===11?0:n;
  state.completed = state.completed.filter(i => i < n);
  state.evidence = state.evidence.filter(e => e.stage < Math.floor((n - 1) / 2));
  state.final.complete = false;
  if(n===11){state.final.report=true;delete state.final.review;delete state.final.puzzle;state.activities[8].values.puzzleRevision=2;}
  Object.assign(state.settings, { sound: false, music: false, effects: false, motion: true });
  for (const key of Object.keys(state.activities)) if (Number(key) >= n) delete state.activities[key];
  await page.evaluate(state => new Promise((resolve, reject) => {
    const request = indexedDB.open('push-pull-city');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put(state, 'main');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), state);
  await page.reload();
  await page.locator('[data-action="start"]').click();
  await page.locator(n===11?'#plaza-experiment':`#experiment-root.screen-${n}`).waitFor();
  if(n!==11)await page.locator('[data-mission="crisis-go"]').click();
  await page.waitForTimeout(800);
  return context;
}
const mission = id => page.locator(`[data-mission="${id}"]`).click();
const idle = () => page.waitForFunction(() => !document.querySelector('#experiment-root, #plaza-experiment').inert);
const shot = name => page.screenshot({ path: `${out}/${name}.png` });
function pass(name) { results.push({ name, status: 'pass' }); console.log('PASS ' + name); }
async function drag(id, x, y) {
  const element = page.locator(`[data-drag="${id}"]`);
  const rect = await element.boundingBox(), board = await page.locator('.mission-board').boundingBox();
  assert.ok(rect && board, `${id} is visible`);
  const old = await element.evaluate(el => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) }));
  const sx = rect.x + rect.width / 2, sy = rect.y + rect.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + (x - old.x) * board.width / 100, sy + (y - old.y) * board.height / 100, { steps: 12 });
  await page.mouse.up();
  await idle();
}
async function autoplay(n) {
  const context = await start(n);
  await page.locator('[data-demo="toggle"]').click();
  await page.waitForFunction(() => document.querySelector('[data-demo="toggle"]')?.textContent.includes('관찰 완료'), null, { timeout: 120000 });
  await page.waitForTimeout(800);
  if (n === 5) {
    // The demonstration deliberately leaves the pole-sticker answer to the learner.
    const a = (await saved()).activities[5];
    assert.notEqual(a.values.solved0, true);
    const bar = a.points['unknown-magnet'];
    await drag('stickerS', bar.x - 5.5, bar.y);
    await drag('stickerN', bar.x + 5.5, bar.y);
    await page.locator('[data-demo="toggle"]').click();
    await page.waitForFunction(() => document.querySelector('[data-demo="toggle"]')?.textContent.includes('관찰 완료'), null, { timeout: 30000 });
    await page.waitForTimeout(800);
  }
  const state = await saved(), a = state.activities[n];
  const key = { 2: 'repair0', 4: 'paper', 5: 'door1', 6: 'join2', 8: 'delivery2' }[n];
  assert.equal(a.values.puzzleVersion, 1);
  assert.ok(a.trials.some(t => t.key === key && t.outcome === 'success' && t.conditions.autoplay));
  assert.equal(await page.locator('.puzzle-stars .on').count(), 0);
  assert.match(await page.locator('.puzzle-stars').getAttribute('aria-label'), /자동재생/);
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(), true);
  if (n === 2) {
    assert.equal(a.values.with0, true);
    assert.ok(Math.hypot(a.points['repair-plate'].x - 46.5, a.points['repair-plate'].y - 63) < 1);
  }
  await shot(`autoplay-${n}`);
  pass(`activity ${n} autoplay solves the new puzzle and awards no manual stars`);
  await context.close();
}
async function door(viewport) {
  const context = await start(5, viewport);
  await drag('probe', 48, 53);
  await mission('flip'); await idle();
  await drag('probe', 48, 53);
  await page.waitForTimeout(800);
  const bar = (await saved()).activities[5].points['unknown-magnet'];
  await drag('stickerS', bar.x - 5.5, bar.y);
  await drag('stickerN', bar.x + 5.5, bar.y);
  await page.waitForTimeout(800);
  assert.equal((await saved()).activities[5].values.doorReady, true);
  await shot(`door-${viewport.width}-closed`);
  await drag('probe', 48, 53);
  await page.waitForTimeout(800);
  assert.equal((await saved()).activities[5].values.puzzleMisses, 1);
  await mission('flip'); await idle();
  await drag('probe', 48, 53);
  await page.waitForTimeout(800);
  const a = (await saved()).activities[5];
  assert.equal(a.values.doorOpen, true);
  assert.equal(await page.locator('.puzzle-stars .on').count(), 0);
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(), false);
  await mission('door-next');await mission('flip');await idle();await drag('probe',48,53);await page.waitForTimeout(800);
  assert.equal((await saved()).activities[5].values.doorPullOpen,true);
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(), true);
  assert.equal(await page.locator('.puzzle-stars .on').count(),2);
  await shot(`door-${viewport.width}-open`);
  pass(`${viewport.width}x${viewport.height} actual pointer drag restores labels, retries and opens the door`);
  await context.close();
}
async function misses(n) {
  const context = await start(n);
  if (n === 3) {
    // Deliver the first iron piece before testing aluminum, keeping the hand magnet clear of it.
    await drag('sweep-magnet', 36, 42);
    await drag('sweep-magnet', 86, 38);
    await drag('sweep-magnet', 66, 43);
    for (let i = 0; i < 2; i++) await drag('material-2', 86, 44);
  }
  if (n === 4) {
    await mission('release'); await idle(); await mission('next');
    for (const gap of [3, 2]) { await drag('distance-magnet',55-gap*6,55); await mission('release'); await idle(); }
  }
  if (n === 6) {
    for (let i = 0; i < 2; i++) {
      await drag('ring0', 68, 71); await drag('ring1', 68, 56);
      await mission('check'); await idle();
    }
  }
  if (n === 7) {
    await drag('cleaner', 77, 74); await page.waitForTimeout(800);
    const pad = (await saved()).activities[7].points['inner-pad'];
    await drag('cleaner', pad.x, pad.y); await page.waitForTimeout(200);
    await drag('cleaner', 77, 74); await page.waitForTimeout(200);
  }
  await page.waitForTimeout(800);
  assert.equal((await saved()).activities[n].values.puzzleMisses, 2);
  const clues = { 3: '따라왔는지 떠올려', 4: '몇 칸인지 눈금', 6: '윗면과 위 고리', 7: '얼마나 벌어졌는지' };
  assert.match(await page.locator('.mission-feedback').textContent(), new RegExp(clues[n]));
  await shot(`misses-${n}`);
  await page.reload(); await page.locator('[data-action="start"]').click();
  await page.locator(`#experiment-root.screen-${n}`).waitFor();
  assert.equal((await saved()).activities[n].values.puzzleMisses, 2);
  pass(`activity ${n} shows the second-miss clue and preserves the attempt count after reload`);
  await context.close();
}
async function deliveryLabels(viewport) {
  const context = await start(8, viewport);
  for(let i=0;i<160;i++){
    const car=Number((await saved()).activities[8].values.car??27);
    if(car>=42.5)break;
    await drag('controller',car+10,59);await page.waitForTimeout(90);
  }
  await mission('detach');await page.waitForTimeout(1500);await mission('delivery-next');
  for (const detached of [false, true]) {
    if (detached) { await drag('controller', 47.5, 59); await mission('detach'); }
    await page.waitForTimeout(800);
    const board = await page.locator('.mission-board').boundingBox();
    const message = await page.locator('.delivery-state').boundingBox();
    assert.ok(message.y + message.height < board.y + board.height * .35 - 8, 'status leaves the wall and destination labels visible');
    if (detached) assert.equal((await saved()).activities[8].points.controller.x, 20);
    await shot(`delivery-${viewport.width}-${detached ? 'detached' : 'start'}`);
  }
  pass(`${viewport.width}x${viewport.height} delivery instructions and detached magnet clear the course labels`);
  await context.close();
}
async function mechanisms(viewport){
  let context=await start(4,viewport);
  await mission('release');await idle();await mission('next');
  await drag('distance-magnet',49,55);await mission('release');await idle();await mission('next');
  await drag('paper',56,55);await mission('release');await idle();await page.waitForTimeout(800);
  assert.equal((await saved()).activities[4].trials.find(t=>t.key==='paper').conditions.course,'key-rescue');
  await shot(`key-${viewport.width}-rescued`);await context.close();
  context=await start(6,viewport);
  await drag('ring0',68,71);await drag('ring1',68,56);
  await page.locator('[aria-label="2번 고리 뒤집기"]').click();await mission('check');await idle();await page.waitForTimeout(800);
  assert.equal((await saved()).activities[6].values.platformRaised,true);await shot(`platform-${viewport.width}-raised`);
  await mission('next');await page.locator('[aria-label="2번 고리 뒤집기"]').click();await mission('check');await idle();await page.waitForTimeout(800);
  assert.equal((await saved()).activities[6].values.platformCrossed,true);
  assert.equal(await page.locator('.puzzle-platform .mascot').count(),2);
  const platform = await page.locator('.puzzle-platform').boundingBox();
  const view3d = await page.locator('[data-mission="view3d"]').boundingBox();
  assert.ok(view3d.x + view3d.width <= platform.x || platform.x + platform.width <= view3d.x || view3d.y + view3d.height <= platform.y || platform.y + platform.height <= view3d.y, '3D control leaves the two characters visible');
  await shot(`platform-${viewport.width}-crossed`);
  pass(`${viewport.width}x${viewport.height} key rescue and ring platform work with actual pointer placement`);await context.close();
}
async function plaza(viewport){
  const context=await start(11,viewport);
  await shot(`plaza-${viewport.width}-start`);
  await drag('plaza-magnet',54,55);await drag('plaza-magnet',34,55);await mission('plaza-next');
  await drag('plaza-magnet',30,55);await page.waitForTimeout(800);
  assert.equal((await saved()).final.puzzle.trials.some(t=>t.key==='plaza-distance'),false);
  await drag('plaza-magnet',54,55);await page.waitForTimeout(800);await shot(`plaza-${viewport.width}-key`);await mission('plaza-next');await page.waitForTimeout(800);
  await page.reload();await page.locator('[data-action="start"]').click();await page.locator('#plaza-experiment').waitFor();
  assert.equal((await saved()).final.puzzle.values.round,2);
  await mission('plaza-flip');await drag('plaza-magnet',54,55);await page.waitForTimeout(800);await shot(`plaza-${viewport.width}-pole`);await mission('plaza-next');
  await drag('plaza-magnet',70,55);await page.waitForTimeout(800);assert.ok((await saved()).final.puzzle.points['plaza-magnet'].x<=47);
  await drag('plaza-magnet',46,40);await page.waitForTimeout(800);await shot(`plaza-${viewport.width}-glass`);
  assert.equal((await saved()).final.puzzle.trials.filter(t=>t.outcome==='success').length,4);
  await mission('plaza-next');await page.locator('[data-review-answer]').first().waitFor();
  pass(`${viewport.width}x${viewport.height} plaza drag, distance retry, reload and glass barrier unlock the notebook`);await context.close();
}
(async () => {
  try {
    browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
    for (const n of [2, 4, 5, 6, 8]) await autoplay(n);
    for (const viewport of [{ width: 1280, height: 800 }, { width: 1024, height: 768 }, { width: 1920, height: 1080 }, { width: 915, height: 412 }]) await door(viewport);
    for (const n of [3, 4, 6, 7]) await misses(n);
    for (const viewport of [{ width: 1280, height: 800 }, { width: 915, height: 412 }]) await deliveryLabels(viewport);
    for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:1920,height:1080},{width:915,height:412}]){
      await mechanisms(viewport);await plaza(viewport);
    }
    assert.deepEqual(errors, []);
  } catch (error) {
    results.push({ name: 'puzzle regression', status: 'fail', message: error.stack });
    console.error(error);
    if (page && !page.isClosed()) await shot('failure').catch(() => {});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
    await browser?.close();
  }
})();
