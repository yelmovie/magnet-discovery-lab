// Production-bundle QA: isolated contexts, ordinary UI, no internal application hook.
// TEST_FIXTURE points to a completed student save used only to unlock earlier districts.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const fixture=JSON.parse(fs.readFileSync(process.env.TEST_FIXTURE,'utf8'));
const base=process.env.TEST_URL||'http://127.0.0.1:5173/';
const out=process.env.TEST_OUT||'test-results/autoplay-progress';
fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];
let browser;
const save=page=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('push-pull-city');request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result,r=db.transaction('saves').objectStore('saves').get('main');r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);};
}));
const check=(name,detail)=>{results.push({name,status:'pass',...detail});console.log('PASS '+name);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));};
async function fresh(n,viewport={width:1280,height:800}){
  const context=await browser.newContext({viewport}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('[data-action="start"]').waitFor();
  const state=structuredClone(fixture);
  state.resume=n;state.started=true;state.completed=state.completed.filter(i=>i<n);
  state.evidence=state.evidence.filter(e=>e.stage<Math.floor((n-1)/2));
  state.final.complete=false;
  Object.assign(state.settings,{sound:false,music:false,effects:false,motion:true});
  state.activities[n]={values:{playVersion:4,paceVersion:1,mechanicsVersion:1,inquiryVersion:2,inquiryActivity:n,inquiryPhase:'experiment'},points:{},records:[],mask:[],trials:[]};
  await page.evaluate(state=>new Promise((resolve,reject)=>{const request=indexedDB.open('push-pull-city');request.onsuccess=()=>{const db=request.result,tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(state,'main');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);}),state);
  await page.reload();await page.locator('[data-action="start"]').click();
  await page.locator('#experiment-root canvas').waitFor();
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);
  return {context,page,state};
}
async function finishAuto(page,n){
  await page.locator('[data-demo="toggle"]').click();
  assert.equal(await page.locator('[data-demo="toggle"]').textContent(),'일시정지');
  assert.equal(await page.locator('[data-demo="toggle"]').getAttribute('aria-label'),'일시정지');
  await page.waitForFunction(()=>document.querySelector('[data-action="complete"]')?.disabled===false&&document.querySelector('[data-demo="toggle"]')?.textContent.includes('관찰 완료'),null,{timeout:120000});
  await page.waitForTimeout(800);
  const state=await save(page),a=state.activities[n];
  assert.equal(await page.locator('[data-action="complete"]').isVisible(),true);
  assert.ok(a.trials.length>0);
  await page.screenshot({path:path.join(out,`autoplay-${n}.png`)});
  return state;
}
async function autoplay(){
  {
    const {context,page,state}=await fresh(3);
    await page.locator('[data-demo="toggle"]').click();
    await page.waitForFunction(()=>Number((document.querySelector('.discovery-count')?.textContent||'0').replace(/\D/g,''))>0,null,{timeout:30000});
    await page.locator('[data-demo="stop"]').click();await page.waitForTimeout(800);
    const stopped=await save(page);assert.ok(stopped.activities[3].trials.length>0);
    const observed=stopped.activities[3].trials.map(t=>t.id);
    assert.deepEqual(stopped.evidence,state.evidence);assert.deepEqual(stopped.completed,state.completed);
    await page.reload();await page.locator('[data-action="start"]').click();
    const done=await finishAuto(page,3);
    for(const id of observed)assert.ok(done.activities[3].trials.some(t=>t.id===id));
    for(const id of ['clip','nail','nut','aluminum','wood','plastic'])assert.equal(done.activities[3].values['sorted-'+id],true);
    assert.deepEqual(done.evidence,state.evidence);assert.deepEqual(done.completed,state.completed);
    check('autoplay 3 sorts all materials, preserves stopped/reloaded observations, submits no answer');await context.close();
  }
  for(const n of [7,8]){
    const {context,page,state}=await fresh(n,n===7?{width:1024,height:768}:undefined);
    const done=await finishAuto(page,n);
    if(n===7)for(let i=0;i<3;i++)assert.equal(done.activities[n].values['clean'+i],true);
    else {assert.equal(done.activities[8].values.segment0,true);assert.equal(done.activities[8].values.segment1,undefined);}
    assert.deepEqual(done.evidence,state.evidence);assert.deepEqual(done.completed,state.completed);
    check(`autoplay ${n} completes actual required manipulation without answering the question`,{trials:done.activities[n].trials.map(t=>t.key)});await context.close();
  }
}
async function dragTo(page,id,target){
  const el=page.locator(`[data-drag="${id}"]`),piece=await el.boundingBox(),board=await page.locator('.mission-board').boundingBox();
  const old=await el.evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));
  const x=piece.x+piece.width/2,y=piece.y+piece.height/2;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x+(target.x-old.x)*board.width/100,y+(target.y-old.y)*board.height/100,{steps:3});await page.mouse.up();
}
async function manualCart(pushing){
  const {context,page}=await fresh(8);
  if(pushing)await page.locator('[data-mission="flip"]').click();
  for(const id of ['checkpoint','next','tool'])assert.equal(await page.locator(`[data-mission="${id}"]`).count(),0);
  let car=27;
  for(let i=0;i<140;i++){
    car=await page.locator('[data-object="cart-magnet"]').evaluate(el=>parseFloat(el.style.left));
    if(car>=71)break;
    await dragTo(page,'controller',{x:car+(pushing?-8:8),y:59});await page.waitForTimeout(120);
  }
  assert.ok(car>=71&&car<76,'cart reaches its flag');
  assert.equal(await page.locator('[data-action="complete"]').isEnabled(),false);
  await page.locator('[data-mission="detach"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-action="complete"]')?.disabled===false,null,{timeout:5000});
  await page.waitForTimeout(700);
  const done=await save(page),a=done.activities[8];
  assert.equal(a.values.segment0,true);assert.equal(a.values.segment1,undefined);assert.equal(a.values.cartSpeed,0);
  assert.equal(a.trials.find(t=>t.key==='delivery0').conditions.method,pushing?'push':'pull');
  await page.screenshot({path:path.join(out,`cart-${pushing?'push':'pull'}.png`)});
  check(`manual ${pushing?'push':'pull'} delivers once and unlocks the question`);await context.close();
}
async function run(){
  browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'});
  try{await manualCart(false);await manualCart(true);await autoplay();assert.deepEqual(errors,[]);}
  finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
