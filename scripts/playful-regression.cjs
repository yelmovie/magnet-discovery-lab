// Isolated browser contexts only. Navigation hook never supplies completion evidence.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { assembleMailbox } = require('./browser-mailbox.cjs');
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
  await action('start'); await page.locator('[data-story="skip"]').click();await page.locator('[data-story="finish"]').click();
  return context;
}
async function reload() {
  await page.evaluate(()=>window.__lab.flush()); await page.reload();
  await page.waitForFunction(()=>!!window.__lab); await action('start');
}
async function seed(state) {
  await page.evaluate(()=>window.__lab.flush());
  await page.evaluate(state=>new Promise((resolve,reject)=>{
    const req=indexedDB.open('push-pull-city');req.onerror=reject;
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
  for (const selector of ['.mission-board','.mission-cta:visible','.mission-actions']) {
    const el=page.locator(selector);if(!await el.count())continue;
    const box=await el.boundingBox();assert.ok(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=v.width+1&&box.y+box.height<=v.height+1,`${n} ${selector}: ${JSON.stringify(box)}`);
  }
}
async function experiments(n) {
  await bounds(n);
  if(n===1){await assembleMailbox(page);await put('lid',50,37);await put('lid',44,59);await page.waitForFunction(()=>window.__lab.save.activities[1].values.latch0);}
  if(n===2){await put('lid',50,65);await mission('shake');await page.waitForFunction(()=>!document.querySelector('#experiment-root[inert]'));assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);await put('repair-magnet',50,44);await put('lid',50,65);await mission('shake');await page.waitForFunction(()=>!document.querySelector('#experiment-root[inert]'));}
  if(n===3){
    for(const [index,x,y,magnetic] of [[0,36,42,true],[1,52,42,true],[6,66,65,true],[2,66,43,false],[3,36,65,false],[4,52,65,false]]){
      await put('sweep-magnet',x,y);
      if(magnetic)await put('sweep-magnet',86,42);
      else {
        if(index===2){
          await put('material-2',86,44);
          assert.equal((await save()).activities[3].values['sorted-aluminum'],undefined,'shiny aluminum cannot go in the magnetic bin');
        }
        await put('material-'+index,86,70);
      }
    }
  }
  if(n===4){await mission('release');await mission('next');await put('distance-magnet',52,55);await mission('release');await reload();assert.equal((await save()).activities[4].values.done1,true);await mission('next');await put('paper',56.5,55);await mission('release');check('controlled distance/paper comparison survives reload');}
  if(n===5){
    await put('probe',48,53);await page.waitForFunction(()=>!document.querySelector('#experiment-root').inert);
    await mission('flip');await page.waitForFunction(()=>!document.querySelector('#experiment-root').inert);
    assert.equal((await save()).activities[5].values.test0N,undefined);
    await put('probe',48,53);await page.waitForFunction(()=>!document.querySelector('#experiment-root').inert);
    const bar=(await save()).activities[5].points['unknown-magnet'];
    await put('stickerS',bar.x-5.5,bar.y);await put('stickerN',bar.x+5.5,bar.y);
  }
  if(n===6){for(let i=0;i<2;i++)await put('ring'+i,68,71-i*15);await mission('check');await wait(750);assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);await page.locator('.ring-flip').nth(1).click();await mission('check');await wait(750);await mission('next');await page.locator('.ring-flip').nth(1).click();await mission('check');await wait(750);}
  if(n===7){
    await put('cleaner',77,74);await wait(100);assert.match(await page.locator('.mission-feedback').textContent(),/너무 멀어/);
    await put('cleaner',30,48);await wait(160);
    for(const [i,target] of [[0,[37.5,50.5]],[1,[72.4,47]],[2,[55.3,55.2]]]){
      let p=(await save()).activities[7].points.cleaner;
      while(Math.hypot(p.x-target[0],p.y-target[1])>1){p={x:p.x+Math.sign(target[0]-p.x)*Math.min(1,Math.abs(target[0]-p.x)),y:p.y+Math.sign(target[1]-p.y)*Math.min(1,Math.abs(target[1]-p.y))};await put('cleaner',p.x,p.y);await wait(60);}
      for(let k=0;k<30&&!(await save()).activities[7].values['clean'+i];k++){await put('cleaner',target[0]+(k%2?5:-5),target[1]);await wait(360);}
      assert.equal((await save()).activities[7].values['clean'+i],true);
    }
  }
  if(n===8){for(let r=0;r<1;r++){
    if(r===1)await mission('flip');
    for(let j=0;j<210;j++){const a=(await save()).activities[8],car=Number(a.values.car??27);if(Math.abs(car-73)<2)break;await put('controller',car+(r===0?7:-7),59);await wait(90);}
    assert.ok(Math.abs(Number((await save()).activities[8].values.car)-73)<3,'cart reaches destination');
    assert.notEqual((await save()).activities[8].values['segment'+r],true,'must stop to deliver');
    await mission('detach');
    await page.waitForFunction(round=>window.__lab.save.activities[8].values['segment'+round]===true,r,{timeout:3000});
    assert.equal((await save()).activities[8].values.cartSpeed,0);
  }}
  await page.waitForFunction(()=>!document.querySelector('#experiment-root').inert);
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(),true,'activity '+n+' actual evidence unlocks continuation');
}
async function finish(n) {
  await action('complete');
  if(n%2===1)await page.waitForFunction(n=>window.__lab.screen===n+1,n);
  if(n%2===0){
    assert.equal(await page.locator('.quiz-scenes img[src^="data:image/webp;"]').count(),2,'both completed experiments have snapshots');
    assert.ok(await page.locator('.quiz-video').isVisible(),'concept replay is visible with the question');
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
// The final notebook only opens the next page after the right answer, then restoration can finish.
async function reviewNotebook(start=0){
  const questions=await page.evaluate(async()=>(await import('/src/final-review.ts')).finalQuestions.map(q=>q.answer));
  for(const [i,answer] of questions.entries()){
    if(i<start)continue;
    await page.locator(`[data-review-answer="${(answer+1)%3}"]`).click();
    assert.equal(await page.locator('[data-review-next]').isEnabled(),false,'wrong notebook answer '+i+' cannot continue');
    await page.locator(`[data-review-answer="${answer}"]`).click();
    await page.locator('[data-review-next]').click();
  }
}
async function workshop() {
  const step = () => page.locator('[data-idea-step]');
  const next = () => page.locator('[data-act="next"]');
  await step().waitFor();
  assert.equal(await next().isEnabled(),false);
  await page.locator('.idea-resident-tab[data-resident="pins"]').click();
  await page.locator('[data-problem="pins"]').click();
  await page.locator('.idea-example[open] img').waitFor();
  await page.waitForFunction(()=>document.querySelector('.idea-example img')?.naturalWidth>0);
  await page.keyboard.press('Escape');
  await page.locator('.idea-example').waitFor({state:'hidden'});
  await page.locator('#idea-custom').focus();
  assert.equal((await save()).idea.problem,'pins','tabbing through the custom field preserves the chosen resident');
  await next().click();
  await page.locator('[data-property="iron"]').click();
  await next().click();
  await page.locator('#idea-name').fill('철 압정 구조대');
  await page.locator('#idea-pitch').fill('막대 끝의 자석이 책장 아래 떨어진 철 압정을 끌어당겨.');
  await page.locator('[data-sticker="0"]').click();
  await page.locator('#idea-canvas').press('ArrowRight');
  await page.locator('#idea-canvas').press('Enter');
  const sticker=(await save()).idea.stickers[0];
  assert.equal(sticker.pole,'N');
  await page.locator('[data-edit="flip"]').click();
  assert.equal((await save()).idea.stickers[0].pole,'S');
  await page.locator('[data-edit="undo"]').click();
  assert.deepEqual((await save()).idea.stickers,[sticker]);
  await page.screenshot({path:out+'/activity-9.png'});
  await reload();
  assert.equal(await step().getAttribute('data-idea-step'),'2','continue restores the workshop draft at its actual step');
  assert.equal(await page.locator('#idea-name').inputValue(),'철 압정 구조대');
  assert.deepEqual((await save()).idea.stickers,[sticker]);
  await finish(9);
  await next().click();
  assert.equal(await next().isEnabled(),false,'the invention needs to be hung before completing the workshop');
  await page.locator('[data-act="hang"]').click();
  await page.locator('[data-act="present"]').click();
  await page.locator('.idea-present[open]').waitFor();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.idea-present').evaluate(el=>el.contains(document.activeElement)||document.activeElement===document.body),true,'presentation never tabs into the underlying game');
  await page.keyboard.press('Escape');
  await page.locator('.idea-present').waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-act="present"]').evaluate(el=>el===document.activeElement),true);
  const download=page.waitForEvent('download');
  await page.locator('[data-act="export"]').click();
  const card=await download;
  assert.equal(card.suggestedFilename().endsWith('.png'),true);
  await card.saveAs(out+'/invention-card.png');
  await next().click();
  await page.locator('[data-act="buddy"]').click();
  assert.equal((await save()).idea.feedback.length,2);
  await page.screenshot({path:out+'/activity-10.png'});
  await action('complete');
  await page.locator('[data-action="next-zone"]').waitFor();
  assert.equal((await save()).evidence.length,5);
  assert.equal((await save()).completed.includes(10),true);
  check('activities 9 and 10: resident, draft reload, presentation, PNG and workshop completion');
  await action('next-zone');
}
async function student() {
  const context=await fresh({width:1024,height:768});
  const began=Date.now();
  await action('walk-next');await action('enter');
  for(let n=1;n<=8;n++){assert.equal(await page.evaluate(()=>window.__lab.screen),n);await experiments(n);await page.screenshot({path:out+`/activity-${n}.png`});await finish(n);}
  await workshop();
  await page.locator('[data-review-answer="1"]').click();
  await page.locator('[data-review-next]').click();
  await reload();
  assert.equal(await page.locator('[data-review-page="1"]').getAttribute('aria-current'),'step','continue restores the current notebook page');
  await page.locator('.final-bookmarks [data-review-page="0"]').click();
  await page.locator('[data-review-next]').click();
  await reviewNotebook(1);
  assert.match(await page.locator('.final-review-summary').textContent(),/어디에 쓰고 어떤 힘/);
  await page.locator('[data-restoration="finish"]').click();
  await page.waitForFunction(()=>window.__lab.save.final.complete);
  await page.locator('[data-story="skip"]').click();await page.locator('[data-story="finish"]').click();await page.screenshot({path:out+'/certificate.png'});await reload();assert.equal((await save()).final.complete,true);
  check('five districts, final notebook reload, festival and certificate ('+Math.round((Date.now()-began)/1000)+'s scripted)');
  const original=await save();fs.writeFileSync(out+'/student.json',JSON.stringify(original,null,2));
  await context.close();return original;
}
async function touchMatrix(){
  for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:768,height:1024},{width:915,height:412},{width:830,height:515},{width:375,height:812}]){
    const context=await fresh(viewport);await begin(1);await bounds(1);await assembleMailbox(page);
    const piece=page.locator('[data-drag="lid"]'),board=page.locator('.mission-board');
    await piece.tap();const b=await board.boundingBox();await board.tap({position:{x:b.width*.5,y:b.height*.60}});
    await page.waitForFunction(()=>window.__lab.save.activities[1].values.latch0);
    assert.equal((await save()).activities[1].values.latch0,true,'real tap-to-place closes the assembled lid');
    await page.screenshot({path:out+`/touch-${viewport.width}.png`});check(`${viewport.width}x${viewport.height} real touch placement and layout`);await context.close();
  }
}
async function teacherUnlock(){
  const context=await fresh({width:1024,height:768});
  const tools=async()=>{
    await action('settings');
    await page.getByText('교사용 가이드',{exact:true}).click();
    await page.getByText('교사용 도구',{exact:true}).click();
  };
  await begin(1);
  await action('home');await action('home');
  const student=await save();
  await tools();await page.locator('[data-settings-action="admin"]').click();
  await page.locator('.quest-city').waitFor();
  assert.equal(await page.locator('.expedition-building.locked').count(),0);
  assert.equal(await page.locator('.expedition-building.available').count(),6);
  assert.equal(await page.locator('.modal-backdrop').count(),0,'unlock opens the whole map without a stage picker');
  assert.match(await page.locator('.expedition-next').textContent(),/모든 스테이지 열림/);
  await action('home');await action('city');
  await page.locator('[data-map-overview]').click();
  await page.locator('[data-place="3"]').click();
  await page.locator('#experiment-root.screen-7').waitFor({timeout:25000});
  await action('complete');
  await page.locator('#experiment-root.screen-8').waitFor();
  await action('complete');await page.locator('[data-phase="explain"]').waitFor();
  await action('complete');await page.locator('#experiment-root.screen-9').waitFor();
  await tools();await page.locator('[data-settings-action="admin"]').click();
  await page.locator('.quest-title').waitFor();
  await action('start');await page.locator('#experiment-root.screen-1').waitFor();
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);
  assert.deepEqual((await save()).completed,student.completed);
  assert.deepEqual((await save()).activities,student.activities);
  check('teacher unlock opens unplayed activities and restores the original student route and progress');
  await context.close();
}
async function alternateAndReplay(original){
  const context=await fresh({width:1280,height:800});await seed(original);
  const evidence=JSON.stringify((await save()).evidence);
  await page.evaluate(()=>window.__lab.startActivity(1,true));await experiments(1);await action('complete');await page.waitForFunction(()=>window.__lab.screen===2);await experiments(2);
  await action('complete');const q=await page.evaluate(async()=>(await import('/src/inquiry-content.ts')).discoveries[0]);
  await page.locator(`[data-inquiry-group="reflection"][data-value="${q.answer}"]`).click();await action('complete');await page.locator('.quest-city').waitFor();
  assert.equal(JSON.stringify((await save()).evidence),evidence);check('re-exploration keeps original evidence');
  const firstIdea=structuredClone((await save()).idea);
  await page.evaluate(()=>window.__lab.startActivity(9,true));
  await page.locator('#idea-custom').fill('연습에서만 만든 발명');
  assert.equal((await save()).idea.custom,'연습에서만 만든 발명');
  await reload();
  assert.deepEqual((await save()).idea,firstIdea,'practice draft is never saved over the original invention');
  await page.evaluate(()=>window.__lab.startActivity(9,true));
  await page.locator('#idea-custom').fill('두 번째 연습 발명');
  await action('home');
  assert.deepEqual((await save()).idea,firstIdea,'leaving practice restores the first invention card');
  assert.equal(JSON.stringify((await save()).evidence),evidence);
  check('workshop re-exploration preserves the original invention and five district records');await context.close();
}
(async()=>{try{
  browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {channel:'chrome'}),headless:true});
  await teacherUnlock();const original=await student();await touchMatrix();await alternateAndReplay(original);assert.equal(results.some(r=>r.status==='fail'),false);
}catch(error){console.error(error);results.push({name:'regression',status:'fail',message:error.stack});if(page&&!page.isClosed())await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;
}finally{fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser?.close();}})();
