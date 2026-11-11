// Isolated browser contexts and a synthetic save. The hook only navigates and injects fixtures.
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
async function start(n, speed=1, viewport={width:1280,height:800}) {
  const context = await browser.newContext({viewport,hasTouch:true});
  page = await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.routeWebSocket('**',socket=>socket.close());
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nwindow.__qa={get save(){return s},set save(v){s=v},startActivity,go,flush,setTeacherPreview};'});
  });
  await page.goto(base);
  await page.locator('[data-action="start"]').waitFor();
  await page.evaluate(({s,n,speed})=>{
    s.settings={...s.settings,motion:true,sound:false,music:false,effects:false,autoplay:true,autoplaySpeed:speed};
    s.started=true;s.resume=n===11?0:n;s.completed=s.completed.filter(i=>i<n);
    s.evidence=s.evidence.filter(e=>e.stage<Math.floor((n-1)/2));
    for(const key of Object.keys(s.activities))if(Number(key)>=n)delete s.activities[key];
    s.final.complete=false;delete s.final.review;delete s.final.puzzle;
    window.__qa.save=s;
    if(n===11){s.final.report=true;s.activities[8].values.puzzleRevision=2;window.__qa.go('core');}
    else window.__qa.startActivity(n);
  },{s:fixture,n,speed});
  if(n!==11)await page.locator('[data-mission="crisis-go"]').click();
  return context;
}
async function teacherToggle() {
  await page.locator('[data-action="settings"]').click();
  await page.locator('summary').filter({hasText:'교사용 가이드'}).click();
  await page.locator('summary').filter({hasText:'교사용 도구'}).click();
  await page.locator('[data-settings-action="autoplay"]').click();
  await page.locator('.settings-close-icon').click();
}
async function controls(viewport) {
  const context=await start(2,1,viewport);
  const select=page.locator('[data-autoplay-speed]');
  await select.selectOption('2');
  assert.equal(await page.evaluate(()=>window.__qa.save.settings.autoplaySpeed),2);
  const box=await select.boundingBox();
  assert.ok(box.height>=44&&box.x>=0&&box.x+box.width<=viewport.width,'speed selector is a visible touch target');
  await page.screenshot({path:`${out}/controls-${viewport.width}.png`});
  await page.locator('[data-demo="toggle"]').click();
  await page.waitForTimeout(200);
  await teacherToggle();
  assert.equal(await page.locator('.experiment-autoplay').count(),0);
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(()=>document.querySelector('#experiment-root').inert),false);
  assert.equal(await page.evaluate(()=>window.__qa.save.activities[2].values.with0===true),false);
  await page.locator('[data-action="visual-guide"]').click();
  assert.equal(await page.locator('[data-figure-action="autoplay"]').isVisible(),false);
  assert.equal(await page.locator('[data-autoplay-speed]').count(),0);
  await page.locator('.modal-close').click();
  await page.evaluate(()=>window.__qa.flush());
  await page.reload();await page.locator('[data-action="start"]').click();
  assert.equal(await page.locator('.experiment-autoplay').count(),0);
  await teacherToggle();
  assert.equal(await page.locator('[data-autoplay-speed]').inputValue(),'2');
  pass(`${viewport.width}x${viewport.height} speed selection, teacher off during play and reload persistence`);
  await context.close();
}
async function timed(n,speed) {
  const context=await start(n,speed);
  const began=Date.now();
  await page.locator('[data-demo="toggle"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-demo="toggle"]')?.textContent.includes('관찰 완료'),null,{timeout:120000});
  const elapsed=Date.now()-began;
  const trial=await page.evaluate(n=>window.__qa.save.activities[n].trials.find(t=>t.key===(n===2?'repair0':'delivery2')),n);
  assert.ok(trial?.conditions.autoplay);
  assert.equal(await page.locator('.puzzle-stars .on').count(),0);
  pass(`activity ${n} at ${speed}x completes with autoplay evidence in ${elapsed}ms`);
  await context.close();return elapsed;
}
async function plaza() {
  const context=await start(11,2);
  await teacherToggle();
  assert.equal(await page.locator('[data-mission="plaza-demo"]').count(),0);
  await teacherToggle();
  assert.equal(await page.locator('[data-autoplay-speed]').inputValue(),'2');
  await page.locator('[data-mission="plaza-demo"]').click();
  await page.locator('[data-mission="plaza-next"]').waitFor();
  assert.ok(await page.evaluate(()=>window.__qa.save.final.puzzle.trials[0].conditions.autoplay));
  pass('plaza obeys teacher setting and plays at the saved speed');await context.close();
}
async function teacherPreview() {
  const context=await start(2);
  await page.evaluate(()=>window.__qa.setTeacherPreview(true));
  await teacherToggle();
  await page.evaluate(()=>window.__qa.setTeacherPreview(false));
  assert.equal(await page.evaluate(()=>window.__qa.save.settings.autoplay),false);
  await page.evaluate(()=>window.__qa.flush());await page.reload();await page.locator('[data-action="start"]').waitFor();
  assert.equal(await page.evaluate(()=>window.__qa.save.settings.autoplay),false);
  pass('teacher preview updates the student autoplay preference and persists after reload');await context.close();
}
async function physicalCancel() {
  const context=await start(6);
  await page.locator('[data-demo="toggle"]').click();
  await page.waitForFunction(()=>document.querySelector('#experiment-root')?.inert,{},{timeout:30000});
  await teacherToggle();
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(()=>document.querySelector('#experiment-root').inert),false);
  assert.equal(await page.locator('.experiment-autoplay').count(),0);
  assert.equal(await page.evaluate(()=>window.__qa.save.activities[6].values.done2===true),false);
  pass('teacher can cancel an active physical ring animation without completing the puzzle');
  await context.close();
}
async function figureTiming(n,speed) {
  const context=await start(n,speed);
  await page.locator('[data-action="visual-guide"]').click();
  const auto=page.locator('[data-figure-action="autoplay"]');
  assert.equal(await page.locator('.apparatus-figure [data-autoplay-speed]').inputValue(),String(speed));
  const began=Date.now();
  await auto.click();
  await page.waitForFunction(()=>document.querySelector('[data-figure-action="autoplay"]')?.textContent==='다시 보기',null,{timeout:15000});
  const elapsed=Date.now()-began;
  pass(`apparatus figure ${n} at ${speed}x completes in ${elapsed}ms`);
  await context.close();return elapsed;
}
(async()=>{
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
  for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:1920,height:1080},{width:915,height:412},{width:830,height:515}])await controls(viewport);
  for(const n of [2,8]){
    const normal=await timed(n,1),fast=await timed(n,2);
    assert.ok(fast<normal*.75,`2x must materially shorten activity ${n}: ${fast} vs ${normal}`);
  }
  await plaza();await teacherPreview();await physicalCancel();
  for(const n of [2,7]){
    const normal=await figureTiming(n,1),fast=await figureTiming(n,2);
    assert.ok(fast<normal*.8,`2x must shorten figure ${n}: ${fast} vs ${normal}`);
  }
  assert.deepEqual(errors,[]);
 }catch(error){results.push({name:'autoplay settings',status:'fail',message:error.stack});console.error(error);if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
 finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,errors},null,2));await browser?.close();}
})();
