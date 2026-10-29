// Isolated browser contexts only. Navigation hook never supplies completion evidence.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.TEST_OUT || 'test-results/playful-20261028';
fs.mkdirSync(out, { recursive: true });
const base = process.env.TEST_URL || 'http://127.0.0.1:5173/';
const results = [];
let browser, page;
const check = name => { results.push({ name, status: 'pass' }); console.log('PASS ' + name); };
const wait = ms => page.waitForTimeout(ms);
const save = () => page.evaluate(() => structuredClone(window.__lab.save));
const action = id => page.locator(`[data-action="${id}"]`).click();
const mission = id => page.locator(`[data-mission="${id}"]`).click();
// Exercise the same placement handler used by keyboard/tap placement. Real pointer checks follow below.
const put = (id,x,y) => page.locator(`[data-drag="${id}"]`).evaluate((el,p)=>el.dispatchEvent(new CustomEvent('piece-place',{detail:p})),{x,y});
async function fresh(viewport) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  page = await context.newPage();
  await page.routeWebSocket('**', socket => socket.close());
  await page.route('**/src/main.ts*', async route => {
    const headers={...route.request().headers()};delete headers['if-none-match'];delete headers['if-modified-since'];
    const response = await route.fetch({headers});
    assert.equal(response.status(),200,'test navigation hook receives a complete source response');
    await route.fulfill({response, body:(await response.text())+'\nwindow.__lab={get save(){return s},get screen(){return screen},startActivity,go,flush};'});
  });
  page.on('pageerror', error => results.push({name:'pageerror', status:'fail', message:error.message}));
  page.on('response', response => { if(response.status()>=400)results.push({name:'HTTP '+response.status(),status:'fail',url:response.url()}); });
  await page.goto(base); await page.waitForFunction(()=>!!window.__lab);
  await action('start'); await action('modal-close');
  return context;
}
async function reload() {
  await page.evaluate(()=>window.__lab.flush()); await page.reload();
  await page.waitForFunction(()=>!!window.__lab); await action('start');
}
async function seed(state) {
  await page.evaluate(()=>window.__lab.flush());
  await page.evaluate(state=>new Promise((resolve,reject)=>{
    const req=indexedDB.open('push-pull-city',1);req.onerror=reject;
    req.onsuccess=()=>{const db=req.result,tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(state,'main');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=reject;};
  }),state);
  await page.reload();await page.waitForFunction(()=>!!window.__lab);await action('start');
}
async function begin(n) {
  await page.evaluate(n=>window.__lab.startActivity(n),n);
  assert.equal(await page.evaluate(()=>window.__lab.screen),n);
  assert.equal(await page.locator('[data-phase]').getAttribute('data-phase'),'experiment');
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);
}
async function bounds(n) {
  const v=page.viewportSize();
  for (const selector of ['.mission-board','.mission-cta','.mission-actions']) {
    const el=page.locator(selector);if(!await el.count())continue;
    const box=await el.boundingBox();assert.ok(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=v.width+1&&box.y+box.height<=v.height+1,`${n} ${selector}: ${JSON.stringify(box)}`);
  }
}
async function experiments(n) {
  await bounds(n);
  if(n===1){await put('lid',50,37);await put('hidden-magnet',78,52);await put('hidden-magnet',68,59);}
  if(n===2){await put('lid',50,65);await mission('shake');assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);await put('repair-magnet',43,59);await put('lid',50,65);await mission('shake');}
  if(n===3){await put('sweep-magnet',36,42);await put('sweep-magnet',86,38);for(const [i,x,y] of [[2,66,43],[3,36,65]]){await put('sweep-magnet',x,y);await put('material-'+i,86,70);}}
  if(n===4){await mission('release');await mission('next');await put('distance-magnet',52,55);await mission('release');await reload();assert.equal((await save()).activities[4].values.done1,true);await mission('next');await put('paper',56.5,55);await mission('release');check('controlled distance/paper comparison survives reload');}
  if(n===5){await put('probe',48,53);await mission('flip');await put('probe',48,53);await put('stickerS',59,40);await put('stickerN',70,40);}
  if(n===6){for(let i=0;i<2;i++)await put('ring'+i,68,71-i*15);await mission('check');await wait(750);assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);await page.locator('.ring-flip').nth(1).click();await mission('check');await wait(750);await mission('next');await page.locator('.ring-flip').nth(1).click();await mission('check');await wait(750);}
  if(n===7){
    await put('cleaner',77,74);await wait(100);assert.match(await page.locator('.mission-feedback').textContent(),/너무 멀어/);
    await put('cleaner',30,48);await wait(160);
    for(const [i,target] of [[0,[40,44]],[1,[66,44]],[2,[59,65]]]){
      let p=(await save()).activities[7].points.cleaner;
      while(Math.hypot(p.x-target[0],p.y-target[1])>1){p={x:p.x+Math.sign(target[0]-p.x)*Math.min(1,Math.abs(target[0]-p.x)),y:p.y+Math.sign(target[1]-p.y)*Math.min(1,Math.abs(target[1]-p.y))};await put('cleaner',p.x,p.y);await wait(60);}
      for(let k=0;k<30&&!(await save()).activities[7].values['clean'+i];k++){await put('cleaner',target[0]+(k%2?5:-5),target[1]);await wait(360);}
      assert.equal((await save()).activities[7].values['clean'+i],true);
    }
  }
  if(n===8){for(let r=0;r<2;r++){
    if(r===1)await mission('flip');
    for(let j=0;j<210;j++){const a=(await save()).activities[8],car=Number(a.values.car??27);if(Math.abs(car-73)<2)break;await put('controller',car+(r===0?7:-7),59);await wait(90);}
    assert.ok(Math.abs(Number((await save()).activities[8].values.car)-73)<3,'cart reaches destination');
    assert.notEqual((await save()).activities[8].values['segment'+r],true,'must stop to deliver');
    await mission('detach');await wait(100);assert.equal((await save()).activities[8].values['segment'+r],true);if(r===0)await mission('next');
  }}
  if(n===9){await mission('box');await put('base',50,61);await put('design-magnet',43,55);await put('design-target',57,55);await mission('prototype');}
  if(n===10){await mission('test');assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);await put('use-handle',50,65);await mission('test');}
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(),true,'activity '+n+' actual evidence unlocks continuation');
}
async function finish(n) {
  await action('complete');
  if(n%2===1)await page.waitForFunction(n=>window.__lab.screen===n+1,n);
  if(n%2===0){
    const options=page.locator('[data-inquiry-group="reflection"]');
    const q=await page.evaluate(async n=>(await import('/src/inquiry-content.ts')).discoveries[n/2-1],n);
    const answer=q.answer;
    await options.nth((answer+1)%await options.count()).click();
    assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);
    await page.locator('[data-inquiry-group="reflection"]').nth(answer).click();
    await action('complete');
    assert.equal(await page.locator('.concept-video').count(),0,'no automatic video');
    await action('next-zone');
  }
  assert.equal((await save()).completed.includes(n),true);check('activity '+n+' complete with real evidence');
}
async function student() {
  const context=await fresh({width:1024,height:768});
  for(let n=1;n<=10;n++){if(n===1)await begin(n);else assert.equal(await page.evaluate(()=>window.__lab.screen),n);await experiments(n);await page.screenshot({path:out+`/activity-${n}.png`});await finish(n);}
  assert.equal((await save()).evidence.length,5);
  await put('blueprint',53,56);
  assert.equal(await page.locator('[data-mission="test"]').count(),0,'validated design does not repeat use test after installation');
  await page.locator('[data-restoration="finish"]').click();assert.equal((await save()).final.complete,true);
  await action('certificate');await page.screenshot({path:out+'/certificate.png'});await reload();assert.equal((await save()).final.complete,true);
  check('five districts, final restoration, certificate and reload');
  const original=await save();fs.writeFileSync(out+'/student.json',JSON.stringify(original,null,2));
  await context.close();return original;
}
async function touchMatrix(){
  for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:768,height:1024}]){
    const context=await fresh(viewport);await begin(1);await bounds(1);
    const piece=page.locator('[data-drag="lid"]'),board=page.locator('.mission-board');
    await piece.tap();const b=await board.boundingBox();await board.tap({position:{x:b.width*.5,y:b.height*.37}});
    assert.equal((await save()).activities[1].values.open0,true,'real tap-to-place opens lid');
    await page.screenshot({path:out+`/touch-${viewport.width}.png`});check(`${viewport.width}x${viewport.height} real touch placement and layout`);await context.close();
  }
}
async function alternateAndReplay(original){
  const context=await fresh({width:1280,height:800});await seed(original);
  const evidence=JSON.stringify((await save()).evidence);
  await page.evaluate(()=>window.__lab.startActivity(1,true));await experiments(1);await action('complete');await page.waitForFunction(()=>window.__lab.screen===2);await experiments(2);
  await action('complete');const q=await page.evaluate(async()=>(await import('/src/inquiry-content.ts')).discoveries[0]);
  await page.locator(`[data-inquiry-group="reflection"][data-value="${q.answer}"]`).click();await action('complete');await page.locator('.quest-city').waitFor();
  assert.equal(JSON.stringify((await save()).evidence),evidence);check('re-exploration keeps original evidence');
  const fixture=structuredClone(original);fixture.activities[9]={values:{},points:{},records:[],mask:[]};fixture.activities[10]={values:{},points:{},records:[],mask:[]};fixture.resume=9;fixture.final={report:false,latch:'N',ring:'N',plate:60,complete:false,date:''};await seed(fixture);
  await mission('remote');await put('base',50,61);await put('design-magnet',43,55);await put('design-target',57,55);await mission('prototype');await finish(9);
  // A bad revision must be corrected and used again; an old prototype cannot supply usage evidence.
  await mission('adjust');await put('design-target',70,70);await mission('adjust');await mission('test');
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);
  await mission('adjust');await put('design-target',57,55);await mission('adjust');
  for(const y of [51,47,43,42])await put('use-handle',43,y);await mission('test');await finish(10);
  await put('blueprint',53,56);
  assert.equal(await page.locator('[data-mission="test"]').count(),0,'validated remote design installs without duplicate use test');
  await page.locator('[data-restoration="finish"]').click();await page.waitForFunction(()=>window.__lab.save.final.complete);
  check('alternative remote invention: failed placement, revision, real use and final restoration');await context.close();
}
(async()=>{try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const original=await student();await touchMatrix();await alternateAndReplay(original);assert.equal(results.some(r=>r.status==='fail'),false);
}catch(error){console.error(error);results.push({name:'regression',status:'fail',message:error.stack});if(page&&!page.isClosed())await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;
}finally{fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser?.close();}})();
