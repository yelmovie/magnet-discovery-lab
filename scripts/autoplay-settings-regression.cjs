// Isolated browser contexts and a synthetic save. The hook only navigates and injects fixtures.
// Experiment autoplay left the learner screens on 2026-11-13 (d69e19f): the activity demo panel, the teacher
// switch in settings and the apparatus figure (with its speed selector) are no longer shown. This script keeps
// it that way, so a student never sees the experiment play itself, and checks that saves written while those
// controls existed (autoplay off, 2x speed) still load, keep their values and open every activity.
// TEST_URL needs the Vite dev server for the hook. TEST_FIXTURE is the student.json from playful-regression.cjs.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TEST_URL || 'http://127.0.0.1:4196/';
const out = process.env.TEST_OUT || 'test-results/autoplay-settings';
const fixture = JSON.parse(fs.readFileSync(process.env.TEST_FIXTURE, 'utf8'));
fs.mkdirSync(out, { recursive: true });
const results = [], errors = [];
let browser, page;
const pass = name => { results.push({name,status:'pass'}); console.log('PASS '+name); };
const AUTOPLAY = '.experiment-autoplay, [data-demo], [data-autoplay-speed], [data-figure-action="autoplay"], [data-action="visual-guide"]';

async function open(viewport, settings) {
  const context = await browser.newContext({viewport,hasTouch:true});
  page = await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.routeWebSocket('**',socket=>socket.close());
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nwindow.__qa={get save(){return s},set save(v){s=v},startActivity,go,flush};'});
  });
  await page.goto(base);
  await page.locator('[data-action="start"]').waitFor();
  await page.evaluate(settings=>{
    const s=window.__qa.save=JSON.parse(JSON.stringify(window.__fixture));
    s.settings={...s.settings,motion:true,sound:false,music:false,effects:false,...settings};
  },settings);
  return context;
}

async function activities(viewport) {
  const context=await open(viewport,{autoplay:true,autoplaySpeed:1});
  for(let n=1;n<=10;n++){
    await page.evaluate(n=>window.__qa.startActivity(n),n);
    await page.locator('main.page-activity').waitFor();
    assert.equal(await page.locator(AUTOPLAY).count(),0,`activity ${n} shows an autoplay control`);
  }
  await page.screenshot({path:`${out}/activity-10-${viewport.width}.png`});
  await page.locator('[data-action="settings"]').click();
  assert.equal(await page.locator('[data-settings-action="autoplay"], dialog [data-autoplay-speed]').count(),0,'settings has no autoplay switch');
  assert.equal(await page.locator('[data-settings-action="close"]').count(),1,'settings has one close button');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog.game-settings[open]').count(),0);
  pass(`${viewport.width}x${viewport.height} ten activities and settings show no autoplay control`);
  await context.close();
}

async function oldSave() {
  const viewport={width:1280,height:800};
  const context=await open(viewport,{autoplay:false,autoplaySpeed:2});
  await page.evaluate(()=>window.__qa.flush());
  await page.reload();
  await page.locator('[data-action="start"]').waitFor();
  assert.deepEqual(await page.evaluate(()=>({a:window.__qa.save.settings.autoplay,b:window.__qa.save.settings.autoplaySpeed})),{a:false,b:2});
  for(const n of [2,7,8]){
    await page.evaluate(n=>window.__qa.startActivity(n),n);
    await page.locator('main.page-activity').waitFor();
    assert.equal(await page.locator(AUTOPLAY).count(),0);
  }
  pass('a save with autoplay off and 2x speed reloads with both values kept and opens its activities');
  await context.close();
}

(async()=>{
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
  // The fixture is handed to each page through an init script so every context starts from the same save.
  const original=browser.newContext.bind(browser);
  browser.newContext=async options=>{const c=await original(options);await c.addInitScript(f=>{window.__fixture=f;},fixture);return c;};
  for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:1920,height:1080},{width:915,height:412},{width:830,height:515}])await activities(viewport);
  await oldSave();
  assert.deepEqual(errors,[]);
 }catch(error){results.push({name:'autoplay settings',status:'fail',message:error.stack});console.error(error);if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
 finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,errors},null,2));await browser?.close();}
})();
