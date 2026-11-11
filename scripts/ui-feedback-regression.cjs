// Checks the recorded UI feedback in isolated contexts with synthetic student data.
// TEST_URL needs the Vite dev server for the navigation hook. TEST_PRODUCTION_URL checks the built site.
// TEST_FIXTURE is the student.json produced by scripts/playful-regression.cjs.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.TEST_OUT || 'test-results/ui-feedback';
const base = process.env.TEST_URL || 'http://127.0.0.1:4196/';
const productionUrl = process.env.TEST_PRODUCTION_URL || 'http://127.0.0.1:4198/';
fs.mkdirSync(out, { recursive: true });
const fixture = JSON.parse(fs.readFileSync(process.env.TEST_FIXTURE, 'utf8'));
const results = [], errors = [];
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
 try {
  const context = await browser.newContext({viewport:{width:1280,height:800}});
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.routeWebSocket('**', socket => socket.close());
  await page.route('**/src/main.ts*', async route => {
   const response=await route.fetch();
   await route.fulfill({response,body:(await response.text())+'\nwindow.__qa={setSave(v){modalCleanup?.();s=v;practiceBackup=null;go("city");},showReward,showResident,startActivity,go,flush,get save(){return s}};'});
  });
  await page.goto(base);
  await page.locator('[data-action="start"]').waitFor();
  for (const width of [1280,915]) {
   await page.setViewportSize({width,height:width===915?412:800});
   await page.evaluate(s=>{s.settings={...s.settings,sound:false,music:false,effects:false};window.__qa.setSave(s);},fixture);
   for (let stage=0;stage<4;stage++) {
    await page.evaluate(stage=>window.__qa.showReward(stage,true),stage);
    const labels=await page.locator('.reward-stars > span').allTextContents();
    assert.equal(labels.length,stage===0?1:2);
    assert.equal(new Set(labels).size,labels.length);
    assert.ok(labels.every(s=>s!=='퍼즐 별'&&s!=='undefined'));
    const expected=await page.evaluate(async stage=>{const {puzzleStars}=await import('/src/mission-model.ts');return window.__qa.save.evidence.find(e=>e.stage===stage).activities.filter(a=>a.values.puzzleVersion===1).map(puzzleStars);},stage);
    for(let i=0;i<expected.length;i++)assert.equal(await page.locator('.reward-stars').nth(i).locator('.on').count(),expected[i]);
    if(stage===3){assert.deepEqual(labels,['수조 청소','택배 운반']);await page.waitForTimeout(800);await page.screenshot({path:`${out}/reward-${width}.png`});}
    await page.locator('.modal-close').click();
   }
   results.push(`reward labels at ${width}`);
  }
  await page.setViewportSize({width:1280,height:800});
  for (const effects of [false,true]) {
   await page.evaluate(({s,effects})=>{s.settings={...s.settings,sound:effects,effects,music:false};window.__qa.setSave(s);}, {s:fixture,effects});
   for(let stage=0;stage<5;stage++){
    await page.evaluate(stage=>window.__qa.showResident(stage),stage);
    assert.equal(await page.locator('[data-town-voice],[data-town-audio-status]').count(),0);
    await page.locator('[data-town-reply="news"]').click();
    assert.equal(await page.getByText(/효과음을 켜|목소리 듣기|다시 듣기/).count(),0);
    if(stage===0&&!effects)await page.screenshot({path:`${out}/town-resident.png`});
    await page.locator('.modal-close').click();
   }
   await page.evaluate(()=>{const s=window.__qa.save;delete s.idea;delete s.activities[9];delete s.activities[10];s.completed=s.completed.filter(n=>n<9);window.__qa.startActivity(9);});
   await page.locator('.idea-resident-list').waitFor();
   for(const id of ['eraser','pins','bag','door','cup']){
    await page.locator(`.idea-resident-list [data-resident="${id}"]`).click();
    assert.equal(await page.locator('[data-workshop-voice],[data-workshop-voice-status]').count(),0);
    assert.equal(await page.getByText(/효과음을 켜|목소리 듣기|불편 다시 듣기/).count(),0);
    await page.locator(`[data-problem="${id}"]`).click();
    await page.locator('.idea-example form button').click();
    assert.equal(await page.locator('[data-resident-example]').count(),1);
    if(id==='door'&&!effects)await page.screenshot({path:`${out}/workshop-door.png`});
   }
   results.push(`all ten residents without voice controls, effects ${effects}`);
  }
  for(const expanded of [false,true]) {
   await page.evaluate(({s,expanded})=>{
    s.evidence=[];s.completed=[];s.settings={...s.settings,sound:false,music:false,effects:false};
    for(const a of Object.values(s.activities))delete a.values.puzzleRevision;
    if(expanded)s.activities[2].values.puzzleRevision=2;
    window.__qa.setSave(s);
   },{s:fixture,expanded});
   assert.equal(await page.getByText('탐구 후 힘 충전',{exact:true}).count(),0);
   assert.ok((await page.locator('.mv-label').allTextContents()).every(s=>s===(expanded?'퍼즐 해결 대기':'구역 복구 대기')));
   await page.locator('.mv-target').first().evaluate(el=>el.click());
   assert.match(await page.locator('.mv-status').textContent(),expanded?/퍼즐을 풀면 도깨비가 물러나/:/탐구를 마치면 도깨비를 물리칠/);
   results.push(`map waiting message, expanded ${expanded}`);
  }
  await page.evaluate(s=>window.__qa.setSave(s),fixture);
  for(const destination of ['title','city','report','core','certificate','ending']) {
   await page.evaluate(destination=>window.__qa.go(destination),destination);
   assert.equal(await page.locator('[data-action="sound"]').count(),0);
   assert.equal(await page.locator('.quest-hud [data-action="settings"]').count(),1);
  }
  for(let n=1;n<=10;n++) {
   await page.evaluate(n=>window.__qa.startActivity(n),n);
   assert.equal(await page.locator('[data-action="sound"]').count(),0);
   assert.equal(await page.locator('.quest-hud [data-action="settings"]').count(),1);
  }
  results.push('all pages and ten activities use the settings icon for audio');
  await page.evaluate(s=>{s.settings={...s.settings,sound:false,effects:false,music:false};window.__qa.setSave(s);},fixture);
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-sound="music"]').click();
  assert.equal(await page.locator('[data-sound="music"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-sound="effects"]').getAttribute('aria-pressed'),'false');
  await page.locator('[data-sound="effects"]').click();
  assert.equal(await page.locator('[data-sound="effects"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-sound="music"]').click();
  await page.evaluate(()=>window.__qa.flush());
  await page.reload();
  await page.locator('[data-action="start"]').waitFor();
  await page.locator('[data-action="settings"]').click();
  assert.equal(await page.locator('[data-sound="music"]').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('[data-sound="effects"]').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:`${out}/settings-audio.png`});
  results.push('settings independently control and persist music and effects');
  const production = await context.newPage();
  production.on('pageerror',e=>errors.push(e.message));
  await production.goto(productionUrl);
  await production.locator('[data-action="start"]').waitFor();
  assert.equal(await production.locator('[data-action="sound"]').count(),0);
  await production.locator('[data-action="settings"]').click();
  assert.equal(await production.locator('[data-sound]').count(),2);
  results.push('production preview serves the consolidated audio controls');
  assert.deepEqual(errors,[]);
 } catch (error) {results.push({status:'fail',message:error.stack});throw error;} finally {fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
 console.log('PASS',results);
})().catch(e=>{console.error(e);process.exitCode=1});
