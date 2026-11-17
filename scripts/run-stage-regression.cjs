// 3D delivery course (activity 8): plays both stretches with the keyboard and with the on-screen
// buttons, then checks the records, the bench fallback and resuming after a reload.
// TEST_URL=http://127.0.0.1:4196/ node scripts/run-stage-regression.cjs [output folder]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TEST_URL || 'http://127.0.0.1:5173/';
const out = process.argv[2] || 'test-results/run-stage';
const empty = () => ({ values: {}, points: {}, records: [], mask: [], trials: [] });
const seedState = (settings = {}) => ({
  version: 2, revision: 1, started: true, updated: new Date().toISOString(), completed: [1, 2, 3, 4, 5, 6, 7],
  evidence: [0, 1, 2].map(stage => ({ stage, date: new Date().toISOString(), activities: [empty(), empty()], summary: [] })),
  activities: {}, design: { template: 'box', pair: 'iron', pole: 'N', gap: 65, aligned: false, revision: 0 }, designs: {}, resume: 8, city: { x: 233, y: 245 },
  settings: { sound: false, music: false, musicVersion: 1, effects: false, musicVolume: .35, motion: true, nickname: '', autoplay: true, autoplaySpeed: 1, ...settings },
  final: { report: false, latch: 'N', ring: 'N', plate: 80, complete: false, date: '' }, greetedResidents: [0, 1, 2], mapEncounters: {},
});
const passed = [];
const check = name => { passed.push(name); console.log('ok -', name); };

async function open(browser, viewport, settings) {
  const context = await browser.newContext({ viewport }), page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + '\nwindow.__lab={get save(){return s},get screen(){return screen},startActivity,go,flush};' });
  });
  await page.goto(base); await page.waitForFunction(() => !!window.__lab);
  await page.evaluate(state => new Promise((resolve, reject) => {
    const request = indexedDB.open('push-pull-city'); request.onerror = reject;
    request.onsuccess = () => { const db = request.result, tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(state, 'main'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = reject; };
  }), seedState(settings));
  await page.reload(); await page.waitForFunction(() => !!window.__lab);
  await page.locator('[data-action="start"]').click();
  await page.waitForFunction(() => window.__lab.screen === 8 && !!document.querySelector('.mission-board'));
  return { context, page, errors };
}
const activity = page => page.evaluate(() => structuredClone(window.__lab.save.activities[8]));
const at = page => page.evaluate(() => Number(document.querySelector('.mission-board').dataset.runAt));
const car = async page => Number((await activity(page)).values.car ?? 27);
async function until(page, test, label, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await test()) return; await page.waitForTimeout(60); }
  throw new Error('timeout: ' + label + ' · at ' + await at(page) + ' · car ' + await car(page));
}

/** Controls for one pass: how to hold a direction, jump, flip and lower the magnet. */
const keyboard = page => ({
  name: '키보드',
  hold: direction => page.keyboard.down({ up: 'ArrowUp', down: 'KeyS' }[direction]),
  release: direction => page.keyboard.up({ up: 'ArrowUp', down: 'KeyS' }[direction]),
  jump: () => page.keyboard.press('Space'), flip: () => page.keyboard.press('KeyF'), lower: () => page.keyboard.press('KeyE'),
});
const buttons = page => ({
  name: '화면 버튼',
  hold: direction => page.evaluate(d => { const b = document.querySelector(`[data-run-dir="${d}"]`), r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 31, button: 0, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); }, direction),
  release: () => page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 31 }))),
  jump: () => page.evaluate(() => document.querySelector('[data-run="jump"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 32, button: 0 }))),
  flip: () => page.locator('[data-mission="flip"]').click(), lower: () => page.locator('[data-mission="detach"]').click(),
});

async function play(page, control, shots) {
  assert.equal(await page.locator('.mission-world.run-mode').count(), 1, '새 활동 8은 3D 화면으로 열린다');
  assert.equal(await page.locator('[data-drag="controller"]').count(), 0);
  await page.waitForSelector('.mission-board[data-run-ready]', { timeout: 20000 });
  await page.locator('[data-mission="crisis-go"]').click();
  assert.equal((await activity(page)).values.view, 'run');
  await page.screenshot({ path: `${out}/${shots}-1-start.png` });
  // Practice lane: walk, jump the step and the gap.
  await control.hold('up');
  let jumps = 0;
  await until(page, async () => { const s = await at(page); if (s < 1 && ++jumps % 7 === 0) await control.jump(); return s >= 4; }, '연습 길 통과', 60000);
  assert.ok(await car(page) === 27, '힘이 닿지 않는 연습 길에서는 수레가 움직이지 않는다');
  check(`${control.name}: 연습 길(턱·틈)을 지나 출발역에 닿는다`);
  // Stretch 1: get in front of the cart and pull it to the middle station.
  await until(page, async () => await car(page) >= 42.2, '1구간 끌기');
  await control.release('up');
  await page.screenshot({ path: `${out}/${shots}-2-stretch1.png` });
  await control.lower();
  await page.waitForFunction(() => window.__lab.save.activities[8].values.segment0 === true, null, { timeout: 6000 });
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(), false, '중간역 정차만으로는 끝나지 않는다');
  check(`${control.name}: 1구간 — 당겨서 중간역 칸에 세운다`);
  await page.locator('[data-mission="delivery-next"]').click();
  await page.waitForFunction(() => window.__lab.save.activities[8].values.round === 1);
  await page.waitForSelector('.mission-board[data-run-ready]');
  // Stretch 2: the glass door is closed. Step back behind the cart, flip, push.
  await control.hold('down'); await until(page, async () => await at(page) <= 37, '수레 뒤로 가기'); await control.release('down');
  assert.ok(await at(page) <= 47.6, '2구간에서는 유리문을 넘지 못한다');
  await control.flip();
  await page.waitForFunction(() => window.__lab.save.activities[8].values.controllerPole === 'S');
  await control.hold('up');
  await until(page, async () => await car(page) >= 58, '2구간 밀기');
  await control.release('up');
  assert.ok(await at(page) <= 47.6, '밀이는 유리문 앞에 멈춘다');
  await page.screenshot({ path: `${out}/${shots}-3-stretch2.png` });
  await control.lower();
  await page.waitForFunction(() => window.__lab.save.activities[8].values.segment1 === true, null, { timeout: 6000 });
  const a = await activity(page), proof = key => a.trials.find(t => t.key === key && t.outcome === 'success');
  assert.ok(proof('delivery0') && proof('delivery1'), '증거 delivery0·delivery1');
  assert.equal(proof('delivery0').conditions.method, 'pull'); assert.equal(proof('delivery1').conditions.method, 'push');
  assert.equal(proof('delivery1').conditions.course, 'glass-room'); assert.equal(proof('delivery1').conditions.manual, true);
  assert.ok(Math.abs(a.values.car - 60) < 3 && a.values.controlled1 > 5 && a.values.cartMethod1 === 'push');
  await page.waitForFunction(() => document.querySelector('[data-action="complete"]')?.disabled === false);
  await page.screenshot({ path: `${out}/${shots}-4-done.png` });
  check(`${control.name}: 2구간 — 유리문 앞에서 밀어 보관실 칸에 세우고 기존 기록이 남는다`);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless: true });
  try {
    // 1. Keyboard, 1280×800.
    let run = await open(browser, { width: 1280, height: 800 });
    await play(run.page, keyboard(run.page), 'keys-1280');
    // The records survive a reload and the finished course opens again as the 3D view.
    await run.page.evaluate(() => window.__lab.flush()); await run.page.reload(); await run.page.waitForFunction(() => !!window.__lab);
    await run.page.locator('[data-action="start"]').click(); await run.page.waitForSelector('.mission-board[data-run-ready]', { timeout: 20000 });
    const kept = await activity(run.page); assert.equal(kept.values.segment0, true); assert.equal(kept.values.segment1, true); assert.equal(kept.values.view, 'run');
    check('새로고침 뒤에도 기록과 3D 화면이 이어진다');
    assert.deepEqual(run.errors, [], 'console errors'); await run.context.close();

    // 2. On-screen buttons, 1024×768, with a switch to the bench and back in the middle.
    run = await open(browser, { width: 1024, height: 768 });
    const page = run.page;
    await page.waitForSelector('.mission-board[data-run-ready]', { timeout: 20000 });
    for (const selector of ['.run-pad [data-run-dir]', '[data-run="jump"]', '[data-mission="flip"]', '[data-mission="detach"]', '[data-mission="view-bench"]']) {
      for (const box of await page.locator(selector).evaluateAll(list => list.map(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.x, y: r.y, label: el.getAttribute('aria-label') || el.textContent }; }))) {
        assert.ok(box.w >= 52 && box.h >= 48, `${selector} ${JSON.stringify(box)}`);
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= 1024 && box.y + box.h <= 768, `${selector} 화면 안 ${JSON.stringify(box)}`);
        assert.ok(box.label, `${selector} 이름`);
      }
    }
    check('1024×768: 조작 버튼이 화면 안에 있고 52px 이상이며 이름이 있다');
    await play(page, buttons(page), 'buttons-1024');
    assert.deepEqual(run.errors, [], 'console errors'); await run.context.close();

    // 3. The bench stays available: switch in the middle of the first stretch and back.
    run = await open(browser, { width: 1280, height: 800 });
    await run.page.waitForSelector('.mission-board[data-run-ready]', { timeout: 20000 });
    await run.page.locator('[data-mission="crisis-go"]').click();
    await run.page.locator('[data-mission="view-bench"]').click();
    await run.page.waitForSelector('[data-drag="controller"]');
    assert.equal(await run.page.locator('.run-mode').count(), 0); assert.equal((await activity(run.page)).values.view, 'bench');
    await run.page.screenshot({ path: `${out}/bench-fallback.png` });
    await run.page.locator('[data-mission="view-run"]').click();
    await run.page.waitForSelector('.mission-board[data-run-ready]', { timeout: 20000 });
    check('「기존 방식으로 하기」와 「3D 달리기로 하기」로 오갈 수 있다');
    // The bench still finishes the same delivery by dragging, as before.
    await run.page.locator('[data-mission="view-bench"]').click();
    await run.page.waitForSelector('[data-drag="controller"]');
    const put = (x, y) => run.page.locator('[data-drag="controller"]').evaluate((el, p) => el.dispatchEvent(new CustomEvent('piece-place', { detail: p })), { x, y });
    for (let r = 0; r < 2; r++) {
      const goal = [44, 60][r];
      if (r === 1) await run.page.locator('[data-mission="flip"]').click();
      for (let j = 0; j < 240 && Math.abs(await car(run.page) - goal) >= 1.5; j++) { const now = await car(run.page); await put(r === 1 ? Math.min(47.5, now - 10) : now + Math.sign(goal - now) * 10, 59); await run.page.waitForTimeout(90); }
      await run.page.locator('[data-mission="detach"]').click();
      await run.page.waitForFunction(round => window.__lab.save.activities[8].values['segment' + round] === true, r, { timeout: 5000 });
      if (r === 0) await run.page.locator('[data-mission="delivery-next"]').click();
    }
    const benched = await activity(run.page);
    assert.ok(benched.trials.some(t => t.key === 'delivery0') && benched.trials.some(t => t.key === 'delivery1'));
    await run.page.waitForFunction(() => document.querySelector('[data-action="complete"]')?.disabled === false);
    check('기존 2D 실험대로도 두 구간을 끝까지 배달하고 같은 기록이 남는다');
    assert.deepEqual(run.errors, [], 'console errors'); await run.context.close();

    // 4. Reduced motion opens the bench and offers no 3D button.
    run = await open(browser, { width: 1280, height: 800 }, { motion: false });
    await run.page.waitForSelector('[data-drag="controller"]');
    assert.equal(await run.page.locator('.run-mode').count(), 0); assert.equal(await run.page.locator('[data-mission="view-run"]').count(), 0);
    check('움직임 줄이기에서는 기존 실험대로 열린다');
    assert.deepEqual(run.errors, [], 'console errors'); await run.context.close();
    console.log(`\n${passed.length} checks passed`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
