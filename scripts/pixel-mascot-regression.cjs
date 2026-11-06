// Test hooks exist only in responses inside fresh browser contexts, never in shipped code.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.TEST_OUT || 'test-results/pixel-mascots-20261101';
const base = process.env.TEST_URL || 'http://127.0.0.1:5173/';
fs.mkdirSync(out, { recursive: true });
const checks = [], errors = []; let activePage;
const pass = name => { checks.push(name); console.log('PASS ' + name); };
const wait = (page, ms = 120) => page.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 1024, height: 768 }]) {
      const context = await browser.newContext({ viewport, hasTouch: true }), page = await context.newPage(), requested = [];
      activePage = page;
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      page.on('request', r => requested.push(r.url()));
      await page.routeWebSocket('**', socket => socket.close());
      await page.route('**/src/main.ts*', async route => {
        const headers = { ...route.request().headers() }; delete headers['if-none-match']; delete headers['if-modified-since'];
        const response = await route.fetch({ headers }); assert.equal(response.status(), 200);
        await route.fulfill({ response, body: (await response.text()) + '\nwindow.__pixelTest={get save(){return s},get city(){return city},go,startActivity,showPlace,showReward};' });
      });
      await page.goto(base); await page.waitForFunction(() => !!window.__pixelTest);
      await page.evaluate(() => document.fonts.ready); await page.waitForLoadState('networkidle');
      const title = await page.locator('.quest-title .sprite-mascot').evaluateAll(elements => elements.map(e => ({ image: getComputedStyle(e).backgroundImage, pixels: getComputedStyle(e).imageRendering, width: e.getBoundingClientRect().width })));
      assert.equal(title.length, 2); assert.ok(title.every(e => e.image.includes('-poses-pixel.webp') && e.pixels === 'pixelated' && e.width > 60));
      await page.screenshot({ path: `${out}/${viewport.width}-title.png` }); pass(`${viewport.width}: title uses both pixel mascots`);
      await page.locator('[data-action="start"]').click();
      await page.locator('[data-story="skip"]').click();
      await page.locator('[data-story="finish"]').waitFor({ state: 'visible' });
      await page.locator('[data-story="finish"]').click({ force: true });
      await page.locator('.map-mascot').first().waitFor();
      const move = async (position, x, y) => {
        await page.evaluate(p => { window.__pixelTest.go('title'); window.__pixelTest.save.city = p; window.__pixelTest.go('city'); }, position);
        await page.evaluate(([x, y]) => window.__pixelTest.city.direction(x, y), [x, y]);
        await wait(page, 160);
      };
      const sprite = page.locator('.expedition-player .map-mascot');
      for (const [facing, x, y, position] of [
        ['up', 0, -1, { x: 50, y: 82 }], ['down', 0, 1, { x: 50, y: 67 }],
        ['left', -1, 0, { x: 49, y: 65.25 }], ['right', 1, 0, { x: 43, y: 60.75 }],
      ]) {
        await move(position, x, y); assert.equal(await sprite.getAttribute('data-facing'), facing);
        const frames = new Set(); for (let n = 0; n < 7; n++) { frames.add(await sprite.getAttribute('data-step')); await wait(page, 65); }
        assert.ok(frames.size >= 3, `${facing} alternates actual foot frames`);
        await page.screenshot({ path: `${out}/${viewport.width}-map-${facing}.png` });
        await page.evaluate(() => window.__pixelTest.city.direction(0, 0)); await wait(page);
        assert.equal(await sprite.getAttribute('data-facing'), facing); assert.equal(await sprite.getAttribute('data-step'), '1');
      }
      pass(`${viewport.width}: all four directions walk and retain facing on stop`);
      // Use an actual held touch-control button, including its pointer capture/release.
      await move({ x: 50, y: 82 }, 0, 0);
      const dpad = await page.locator('[data-dir="0,-1"]').boundingBox();
      await page.mouse.move(dpad.x + dpad.width / 2, dpad.y + dpad.height / 2); await page.mouse.down(); await wait(page, 260);
      assert.equal(await sprite.getAttribute('data-facing'), 'up'); await page.mouse.up(); await wait(page);
      assert.equal(await sprite.getAttribute('data-step'), '1'); pass(`${viewport.width}: held direction button and release`);
      // A clicked map button keeps focus. Keyboard movement must still work from it.
      for (const [key, facing, position] of [
        ['ArrowUp', 'up', { x: 50, y: 82 }], ['ArrowDown', 'down', { x: 50, y: 67 }],
        ['ArrowLeft', 'left', { x: 49, y: 65.25 }], ['ArrowRight', 'right', { x: 43, y: 60.75 }],
        ['w', 'up', { x: 50, y: 82 }],
      ]) {
        await move(position, 0, 0);
        await page.locator('[data-map-pan]').click();
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-map-pan')), true);
        const before = await page.locator('.expedition-player').getAttribute('style');
        await page.keyboard.down(key); await wait(page, 200); await page.keyboard.up(key); await wait(page);
        assert.notEqual(await page.locator('.expedition-player').getAttribute('style'), before, `${key} moves with button focus`);
        assert.equal(await sprite.getAttribute('data-facing'), facing); assert.equal(await sprite.getAttribute('data-step'), '1');
        assert.equal(await page.locator('[data-map-pan]').getAttribute('aria-pressed'), 'false');
      }
      pass(`${viewport.width}: keyboard arrows and WASD work after clicking map controls`);
      // Following through a corner must use the follower's path, not copy the leader's facing.
      await move({ x: 50, y: 66 }, 0, 0); await page.evaluate(() => window.__pixelTest.city.goTo(0));
      let differentFacing = false, followerWalked = false;
      for (let n = 0; n < 70; n++) {
        const state = await page.evaluate(() => {
          const player = document.querySelector('.expedition-player'), follower = document.querySelector('.expedition-npc');
          return { a: player.querySelector('.map-mascot').dataset.facing, b: follower.querySelector('.map-mascot').dataset.facing, walking: follower.dataset.walking, modal: !!document.querySelector('.modal-backdrop') };
        });
        if (state.walking === 'true') { followerWalked = true; if (state.a !== state.b) differentFacing = true; }
        if (state.modal) break; await wait(page, 100);
      }
      assert.ok(followerWalked); assert.ok(differentFacing, 'follower turns only after reaching the corner');
      pass(`${viewport.width}: follower follows and turns independently`);
      // Reduced motion retains direction but suppresses gait, including when paused.
      await move({ x: 50, y: 82 }, 0, 0); await page.evaluate(() => { window.__pixelTest.save.settings.motion = false; window.__pixelTest.city.direction(0, -1); });
      await wait(page, 250); assert.equal(await sprite.getAttribute('data-facing'), 'up'); assert.equal(await sprite.getAttribute('data-step'), '1');
      await page.evaluate(() => { window.__pixelTest.save.settings.motion = true; window.__pixelTest.city.pause(true); });
      const paused = await page.locator('.expedition-player').getAttribute('style'); await wait(page, 250);
      assert.equal(await page.locator('.expedition-player').getAttribute('style'), paused); assert.equal(await sprite.getAttribute('data-step'), '1');
      pass(`${viewport.width}: reduced motion and pause`);
      // Shared expression atlas must also reach the activity, entrance, reward and certificate.
      await page.evaluate(() => window.__pixelTest.startActivity(1)); await wait(page, 300);
      assert.equal(await page.locator('.coach-robot').count(), 1);
      await page.screenshot({ path: `${out}/${viewport.width}-activity.png` });
      await page.evaluate(() => { window.__pixelTest.go('city'); window.__pixelTest.showPlace(0); }); await wait(page);
      assert.ok((await page.locator('.entrance-portrait .sprite-mascot').getAttribute('style')).includes('-poses-pixel.webp'));
      await page.screenshot({ path: `${out}/${viewport.width}-entrance.png` });
      await page.evaluate(() => { window.__pixelTest.go('city'); window.__pixelTest.showReward(0); }); await wait(page);
      assert.equal(await page.locator('.reward-celebration .sprite-mascot').count(), 2);
      await page.screenshot({ path: `${out}/${viewport.width}-reward.png` });
      await page.evaluate(() => {
        window.__pixelTest.go('core');
        const s=window.__pixelTest.save;
        Object.assign(s.final.route,{installed:true,operated:true,revision:s.design.revision,template:s.design.template});
        window.__pixelTest.go('core');
      }); await wait(page);
      assert.equal(await page.locator('.restoration-team .sprite-mascot').count(), 2);
      await page.screenshot({ path: `${out}/${viewport.width}-restoration.png` });
      await page.evaluate(() => window.__pixelTest.go('certificate')); await wait(page);
      assert.equal(await page.locator('.certificate-bottom .sprite-mascot').count(), 2);
      await page.screenshot({ path: `${out}/${viewport.width}-certificate.png` });
      pass(`${viewport.width}: activity, entrance, reward, restoration and certificate`);
      if(viewport.width===1024){
        await page.evaluate(()=>{
          const {save,go}=window.__pixelTest;
          save.settings.motion=false;
          save.completed=Array.from({length:10},(_,i)=>i+1);
          save.evidence=Array.from({length:5},(_,stage)=>({stage,date:save.updated,activities:[],summary:[]}));
          go('city');
        });
        await page.locator('[data-map-overview]').click();
        for(const size of [{width:390,height:844},{width:844,height:390}]){
          await page.setViewportSize(size);await wait(page);
          const map=await page.evaluate(()=>{
            const world=document.querySelector('.expedition-world').getBoundingClientRect();
            return {
              width:document.documentElement.scrollWidth,
              pad:document.querySelector('.expedition-dpad').getBoundingClientRect().bottom,
              buttons:[...document.querySelectorAll('[data-place], [data-resident]')].map(button=>{
                const rect=button.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
                return hit?.closest('button')===button;
              }),
              feet:[...document.querySelectorAll('[data-resident]')].map(button=>
                Math.abs(button.querySelector('img').getBoundingClientRect().bottom-(world.y+world.height*parseFloat(button.style.top)/100))),
            };
          });
          assert.equal(map.width,size.width);assert.ok(map.pad<=size.height);
          assert.equal(map.buttons.length,11);assert.ok(map.buttons.every(Boolean));
          assert.ok(map.feet.every(offset=>offset<1),'resident shoes stay on their map anchors');
          for(const resident of await page.locator('[data-resident]').all()){
            await resident.tap();await page.locator('.resident-dialog').waitFor();await page.keyboard.press('Escape');
            assert.ok(await resident.evaluate(el=>el===document.activeElement));
          }
          pass(`${size.width}×${size.height}: five residents, six entrances, grounded feet and accessible dialog return`);
        }
      }
      assert.equal(requested.some(url => /poses-tablet|poses-v2/.test(url)), false);
      await context.close();
    }
    assert.deepEqual(errors, []); pass('no missing assets or browser errors');
  } catch (error) { console.error(error); errors.push(error.stack); if(activePage&&!activePage.isClosed())await activePage.screenshot({path:`${out}/failure.png`}); process.exitCode = 1; }
  finally { fs.writeFileSync(`${out}/results.json`, JSON.stringify({ checks, errors }, null, 2)); await browser.close(); }
})();
