// Runs in new browser contexts only. The main-module hook observes state and uses
// existing navigation guards; it never writes completion flags or production data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='test-results/fixes-20261025';fs.mkdirSync(out,{recursive:true});
const results=process.env.RESUME&&fs.existsSync(out+'/browser-results.json')?JSON.parse(fs.readFileSync(out+'/browser-results.json')).filter(r=>r.status==='pass'):[];
const base=process.env.TEST_URL||'http://127.0.0.1:5175/';
let browser,page;
const check=(name,detail={})=>{results.push({name,status:'pass',...detail});console.log('PASS '+name);fs.writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2));};
const wait=ms=>page.waitForTimeout(ms);
const save=()=>page.evaluate(()=>structuredClone(window.__lab.save));
const action=id=>page.locator(`[data-action="${id}"]`).click();
const mission=id=>page.locator(`[data-mission="${id}"]`).click();
const put=(id,x,y)=>page.locator(`[data-drag="${id}"]`).evaluate((el,p)=>el.dispatchEvent(new CustomEvent('piece-place',{detail:p})),{x,y});
const choose=(group,value)=>page.locator(`[data-inquiry-group="${group}"][data-value="${value}"]`).click();
const field=(key,value)=>page.locator(`[data-field="${key}"]`).selectOption(String(value));
async function reload(){await page.evaluate(()=>window.__lab.flush());await page.reload();await page.waitForFunction(()=>!!window.__lab);await action('start');}
async function fresh(viewport){
 const context=await browser.newContext({viewport,hasTouch:true});page=await context.newPage();
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.__lab={get save(){return s},get screen(){return screen},startActivity,go,flush};'});});
 page.on('pageerror',e=>{results.push({name:'pageerror',status:'fail',message:e.message});});
 await page.goto(base);await page.waitForFunction(()=>!!window.__lab);await page.locator('[data-action="start"]').waitFor();return context;
}
async function seed(state){await page.evaluate(()=>window.__lab.flush());await page.evaluate(state=>new Promise((resolve,reject)=>{const request=indexedDB.open('push-pull-city',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(state,'main');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=reject;};request.onerror=reject;}),state);await page.reload();await page.waitForFunction(()=>!!window.__lab);await page.locator('[data-action="start"]').waitFor();}
async function begin(n){
 await page.evaluate(n=>window.__lab.startActivity(n),n);
 assert.equal(await page.evaluate(()=>window.__lab.screen),n);
 if(await page.locator('[data-phase]').getAttribute('data-phase')==='predict'){await page.locator('[data-inquiry-group="prediction"]').first().click();await page.locator('[data-inquiry="begin"]').click();}
}
async function explain(n){
 await action('complete');const q=await page.evaluate(async n=>(await import('/src/inquiry-content.ts')).inquiries[n-1],n);
 await choose('claim',(q.claim+1)%q.claims.length);await choose('proof',q.proof);await page.locator('[data-inquiry="reason"]').click();
 assert.equal(await page.locator('[data-phase]').getAttribute('data-phase'),'explain');
 await choose('claim',q.claim);await page.locator('[data-inquiry="reason"]').click();
 if(n%2===0)await fields(Math.floor((n-1)/2));
 await action('complete');
 if(n%2===0){await page.locator('[data-concept-action="continue"], [data-concept="continue"], .concept-continue').count().then(async count=>{if(count)await page.locator('[data-concept-action="continue"], [data-concept="continue"], .concept-continue').first().click();});await page.evaluate(()=>document.querySelector('.modal-close')?.click());}
 check('student inquiry '+n+' prediction/experiment/wrong explanation/correction');
}
async function fields(stage){
 for(let round=0;round<2;round++){
  if(stage!==3)await page.locator('[data-inquiry="field-test"]').click();
  if(stage===0||stage===4){
   const scroll=page.locator('.field-content');await scroll.evaluate(el=>el.scrollTop=el.scrollHeight);
   await page.locator('[data-field="material"]').focus();const top=await scroll.evaluate(el=>el.scrollTop);
   for(const material of ['wood','aluminum','iron']){await field('material',material);assert.equal(await page.locator('[data-field="material"]').evaluate(el=>el===document.activeElement),true);assert.ok(Math.abs(await scroll.evaluate(el=>el.scrollTop)-top)<2);}
   await field('gap',12);await field('aligned',true);
   if(stage===4&&round===1){await field('material','magnet');await choose('pole','N');}
  }else if(stage===1){await field('gapA',round?12:34);await field('gapB',12);await field('paperA',false);await field('paperB',!!round);}
  else if(stage===2){await choose('gateA',round?'N':'S');await choose('gateB',round?'S':'N');}
  else{
   await choose('routeSide','left');await choose('routePole',round?'S':'N');
   for(let i=0;i<2;i++)await page.locator('[data-inquiry="route-move"]').click();await page.locator('[data-inquiry="route-stop"]').click();
   for(let i=0;i<2;i++)await page.locator('[data-inquiry="route-move"]').click();await page.locator('[data-inquiry="route-stop"]').click();
  }
  if(stage!==3)await page.locator('[data-inquiry="field-test"]').click();
  assert.equal((await save()).activities[stage*2+2].values[`field-${round}`],true);
  const button=page.locator('[data-inquiry="field-next"]'),r=await button.boundingBox();assert.ok(r&&r.y+r.height<=(await page.viewportSize()).height);
  await button.click();
 }
 check('field missions '+stage+' / 2, scroll, focus, correction');
}
async function experiments(n){
 if(n===1){for(let i=0;i<2;i++){await put('lid',50,37);await put('hidden-magnet',78,52);await put('hidden-magnet',68,59);if(!i)await mission('next');}}
 if(n===2){for(let i=0;i<2;i++){await put('lid',50,65);await mission('shake');await put('repair-magnet',43,59);await put('lid',50,65);await mission('shake');await mission('next');}await put('repair-magnet',43,59);await put('lid',50,65);await mission('shake');await mission('fault-color');await mission('fault-distance');await put('repair-plate',59,59);await put('lid',50,65);await mission('shake');}
 if(n===3){const points=[[36,42],[52,42],[66,43],[36,65],[52,65],[66,65]];for(let i=0;i<6;i++){await put('sweep-magnet',...points[i]);if(i<2)await put('sweep-magnet',86,38);else{if(i===2)await put('material-2',86,44);await put('material-'+i,86,70);}}}
 if(n===4){await mission('release');await mission('next');await put('distance-magnet',52,55);await mission('release');await reload();assert.equal((await save()).activities[4].values.done1,true);await mission('next');await put('paper',56.5,55);await mission('release');await mission('next');await put('distance-magnet',57,42);await mission('release');check('mid-experiment save/reload and fair paper comparison');}
 if(n===5){for(let r=0;r<2;r++){for(let i=0;i<4;i++){const before=(await save()).activities[5],facing=(before.values.probePole||'N')==='N'?'S':'N',hidden=r?'N':'S';await put('probe',48,53);const state=(await save()).activities[5];assert.equal(state.values.reaction,facing===hidden?'밀려났어':'당겨졌어');assert.equal(state.points['unknown-magnet'].x,facing===hidden?72:59);if(i<3)await mission('flip');}await put('sticker'+(r?'N':'S'),59,40);await put('sticker'+(r?'S':'N'),70,40);if(!r)await mission('next');}await action('observations');assert.match(await page.locator('.trial-replay-result').textContent(),/대상 자석/);await page.locator('.modal-close').click();}
 if(n===6){for(let r=0;r<3;r++){const count=r?3:2;for(let i=0;i<count;i++)await put('ring'+i,68,71-i*15);if(!r){await mission('check');await wait(750);}const values=(await save()).activities[6].values;for(let i=0;i<count;i++){const desired=r<2&&i===1?'S':'N';if((values['ringPole'+i]||'N')!==desired)await page.locator('.ring-flip').nth(i).click();}await mission('check');await wait(750);if(r<2)await mission('next');}}
 if(n===7){
  await put('cleaner',77,74);await wait(100);assert.match(await page.locator('.mission-feedback').textContent(),/너무 멀어/);await put('cleaner',30,48);await wait(150);assert.match(await page.locator('.mission-feedback').textContent(),/다시 연결/);
  for(const [i,target] of [[0,[40,44]],[1,[66,44]],[2,[59,65]]]){
   let p=(await save()).activities[7].points.cleaner;
   while(Math.hypot(p.x-target[0],p.y-target[1])>1){p={x:p.x+Math.sign(target[0]-p.x)*Math.min(1,Math.abs(target[0]-p.x)),y:p.y+Math.sign(target[1]-p.y)*Math.min(1,Math.abs(target[1]-p.y))};await put('cleaner',p.x,p.y);await wait(60);}
   for(let k=0;k<60&&!(await save()).activities[7].values['clean'+i];k++){await put('cleaner',target[0]+(k%2?5:-5),target[1]);await wait(360);}
   assert.equal((await save()).activities[7].values['clean'+i],true);
  }
 }
 if(n===8){for(let r=0;r<3;r++){if(r===1)await mission('flip');if(r===2)await mission('flip');const dir=r===2?-1:1;
   async function drive(goal){for(let j=0;j<170;j++){const values=(await save()).activities[8].values,car=Number(values.car??(r===2?74:27));if(goal!==50&&values['segment'+r]||Math.abs(car-goal)<1.5)return;await put('controller',car+(r===0?7:-7),59);await wait(90);}throw Error('cart travel timeout');}
   await drive(50);await mission('detach');await mission('checkpoint');assert.equal((await save()).activities[8].values['checkpoint'+r],true);await drive(r===2?30:73);await wait(150);assert.equal((await save()).activities[8].values['segment'+r],true);if(r<2)await mission('next');
  }}
 if(n===9){await mission('box');await put('base',50,61);await put('design-magnet',43,55);await put('design-target',57,55);await mission('prototype');}
 if(n===10){await put('use-handle',50,65);await mission('test');await mission('next');await put('use-handle',50,65);await mission('test');await put('force-arrow',50,54);}
}
async function student(){
 await fresh({width:1024,height:768});await action('start');await action('modal-close');
 let first=1;if(process.env.RESUME&&fs.existsSync(out+'/student-checkpoint.json')){const checkpoint=JSON.parse(fs.readFileSync(out+'/student-checkpoint.json'));await seed(checkpoint.state);first=checkpoint.next;}for(let n=first;n<=10;n++){await begin(n);await experiments(n);await explain(n);fs.writeFileSync(out+'/student-checkpoint.json',JSON.stringify({next:n+1,state:await save()}));}
 const state=await save();assert.equal(state.evidence.length,5);assert.equal(state.completed.length,10);await page.evaluate(()=>window.__lab.go('report'));await action('reviewed');await put('blueprint',53,56);await put('use-handle',50,65);await mission('test');await page.locator('[data-restoration="finish"]').click();assert.equal((await save()).final.complete,true);await action('certificate');await page.screenshot({path:out+'/student-ending-1024.png'});check('ordinary student all 5 zones / 10 experiments / 10 field missions / plaza / ending');
 await reload();assert.equal((await save()).final.complete,true);check('ending persists after reload');
 fs.writeFileSync(out+'/test-student.json',JSON.stringify(await save(),null,2));
}
async function pointerDrag(id,x,y,fraction=.5,touch=false){
 const el=page.locator(`[data-drag="${id}"]`),r=await el.boundingBox(),b=await page.locator('.mission-board').boundingBox();
 const p=await el.evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));
 const sx=r.x+r.width*fraction,sy=r.y+r.height/2;
 const dx=(x-p.x)*b.width/100,dy=(y-p.y)*b.height/100;
 if(touch){const cdp=await page.context().newCDPSession(page);const point=(k)=>[{x:sx+dx*k,y:sy+dy*k,id:1}];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:point(0)});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:point(i/5)});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.evaluate(()=>new Promise(requestAnimationFrame));await cdp.detach();}
 else{await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+dx,sy+dy,{steps:5});await page.mouse.up();}
}
async function tapPlace(id,x,y){await page.locator(`[data-drag="${id}"]`).tap();await page.waitForFunction(id=>document.querySelector(`[data-drag="${id}"]`)?.classList.contains('piece-selected'),id,{timeout:5000});await page.locator('.mission-board').tap({position:{x:(await page.locator('.mission-board').boundingBox()).width*x/100,y:(await page.locator('.mission-board').boundingBox()).height*y/100}});}
async function previewProtection(original){
 await seed(original);await action('start');await page.evaluate(()=>window.__lab.flush());
 const stored=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('push-pull-city',1);request.onsuccess=()=>{const db=request.result,r=db.transaction('saves').objectStore('saves').get('main');r.onsuccess=()=>{resolve(JSON.stringify(r.result));db.close();};r.onerror=reject;};request.onerror=reject;}));
 const before=await stored();
 const admin=async()=>{await action('settings');const folds=page.locator('details').filter({has:page.locator('[data-settings-action="admin"]')});for(let i=0;i<await folds.count();i++)if(!await folds.nth(i).evaluate(el=>el.open))await folds.nth(i).locator(':scope > summary').click();await page.locator('[data-settings-action="admin"]').click();await wait(100);};
 const reset=async()=>{await action('settings');await page.locator('[data-settings-action="reset"]').click();assert.match(await page.locator('#settings-reset-description').textContent(),/사본/);await page.locator('[data-confirm="reset"]').click();await wait(100);};
 await admin();await begin(5);await put('probe',48,53);await reset();assert.equal(await stored(),before);await admin();assert.equal(await stored(),before);await page.reload();await page.waitForFunction(()=>!!window.__lab);assert.equal(await stored(),before);
 await admin();await reset();await page.reload();await page.waitForFunction(()=>!!window.__lab);assert.equal(await stored(),before);
 check('teacher preview enter/reset/exit/reload: exact IndexedDB original unchanged');
}
async function matrix(){
 const original=JSON.parse(fs.readFileSync(out+'/test-student.json'));
 for(const viewport of process.env.SKIP_SIZES?[]:[{width:1024,height:768},{width:1280,height:800}]){
  await fresh(viewport);let fixture=structuredClone(original);fixture.activities[5]={values:{},points:{},records:[],mask:[]};fixture.resume=5;await seed(fixture);await action('start');await begin(5);
  await page.evaluate(()=>{const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,fill=proto.fillText,line=proto.lineTo;window.__draw={texts:[],lines:[]};proto.clearRect=function(...args){window.__draw={texts:[],lines:[]};return clear.apply(this,args);};proto.fillText=function(...args){window.__draw.texts.push(args);return fill.apply(this,args);};proto.lineTo=function(...args){window.__draw.lines.push(args);return line.apply(this,args);};});
  for(let round=0;round<2;round++){
   for(let i=0;i<6;i++){
    const before=(await save()).activities[5],facing=(before.values.probePole||'N')==='N'?'S':'N',hidden=round?'N':'S',repel=facing===hidden;
    if(i%3===0)await pointerDrag('probe',48,53,.5,i>=3);else if(i%3===1)await tapPlace('probe',48,53);else{await page.locator('[data-drag="probe"]').focus();for(let j=0;j<5;j++)await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');}
    const result=await page.evaluate(()=>({state:window.__lab.save.activities[5],draw:window.__draw}));
    assert.equal(result.state.values.reaction,repel?'밀려났어':'당겨졌어',JSON.stringify({round,i,probe:result.state.points.probe}));assert.equal(result.draw.texts.at(-1)[0],result.state.values.reaction);
    assert.ok(result.draw.lines.some(([x,y])=>Math.abs(x-(repel?72:59)*12.8)<.01&&Math.abs(y-504)<.01));
    if(i<5)await mission('flip');
   }
   await put('sticker'+(round?'N':'S'),59,40);await put('sticker'+(round?'S':'N'),70,40);if(!round)await mission('next');
  }
  check(`${viewport.width}x${viewport.height} poles both targets, both orders, drag/touch-tap/keyboard: immediate text/drawing/record`);
  await page.screenshot({path:out+`/poles-${viewport.width}.png`});
  for(const [mode,fraction] of [['tail',.05],['middle',.5],['head',.95],['touch-tail',.05],['touch-middle',.5],['touch-head',.95],['tap',0],['keyboard',0]]){
   fixture=structuredClone(original);fixture.resume=10;fixture.activities[10].values.inquiryPhase='experiment';delete fixture.activities[10].values['force-arrow'];fixture.activities[10].points['force-arrow']={x:16,y:74};await seed(fixture);await action('start');
   if(mode==='tap')await tapPlace('force-arrow',50,54);
   else if(mode==='keyboard'){await page.locator('[data-drag="force-arrow"]').focus();for(let j=0;j<8;j++)await page.keyboard.press('ArrowRight');for(let j=0;j<5;j++)await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');}
   else await pointerDrag('force-arrow',50,54,fraction,mode.startsWith('touch-'));
   assert.equal((await save()).activities[10].values['force-arrow'],true,mode);
  }
  check(`${viewport.width}x${viewport.height} arrow tail/middle/head + touch tap + keyboard completion`);
  await page.screenshot({path:out+`/arrow-${viewport.width}.png`});
  fixture=structuredClone(original);fixture.resume=8;fixture.activities[8].values.inquiryPhase='experiment';await seed(fixture);await action('start');const proofs=JSON.stringify((await save()).activities[8].trials);
  await pointerDrag('controller',2,2);await pointerDrag('controller',98,98,.5,true);await page.locator('[data-drag="controller"]').focus();for(let i=0;i<30;i++)await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await tapPlace('controller',15,20);await mission('safe');await mission('detach');
  assert.equal(JSON.stringify((await save()).activities[8].trials),proofs);
  const safe=await page.locator('[data-drag="controller"]').boundingBox(),steps=await page.locator('.inquiry-steps').boundingBox(),footer=await page.locator('.mission-actions').boundingBox();assert.ok(safe.y>=steps.y+steps.height&&safe.y+safe.height<footer.y);check(`${viewport.width}x${viewport.height} controller safe limits and recovery preserve evidence`);
  await page.screenshot({path:out+`/delivery-${viewport.width}.png`});
  fixture=structuredClone(original);fixture.resume=2;fixture.activities[2].values.inquiryPhase='apply';fixture.activities[2].values.fieldRound=0;for(const k of Object.keys(fixture.activities[2].values))if(k.startsWith('field:')||k.startsWith('field-'))delete fixture.activities[2].values[k];await seed(fixture);await action('start');await fields(0);check(`${viewport.width}x${viewport.height} field card scroll/focus/footer`);
  await page.evaluate(()=>window.__lab.go('city'));await page.locator('[data-map-overview]').click();await wait(100);const bounds=await page.locator('.expedition-building').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,label:el.textContent};}));assert.ok(bounds.every(r=>r.x>=0&&r.right<=viewport.width&&r.y>=0&&r.bottom<=viewport.height));check(`${viewport.width}x${viewport.height} all six map facility names visible + destination`);await page.screenshot({path:out+`/map-${viewport.width}.png`});
 }
 if(process.env.SKIP_SIZES)await fresh({width:1280,height:800});await previewProtection(original);
 await seed(original);await action('start');const evidence=JSON.stringify((await save()).evidence);await page.evaluate(()=>window.__lab.startActivity(1,true));await page.locator('[data-inquiry-group="prediction"]').first().click();await page.locator('[data-inquiry="begin"]').click();await experiments(1);await explain(1);await begin(2);await experiments(2);await explain(2);assert.equal(JSON.stringify((await save()).evidence),evidence);check('completed-zone re-exploration preserves original evidence');
 let remote=structuredClone(original);remote.activities[9]={values:{},points:{},records:[],mask:[]};remote.activities[10]={values:{},points:{},records:[],mask:[]};remote.resume=9;remote.final={report:false,latch:'N',ring:'N',plate:60,complete:false,date:''};await seed(remote);await action('start');await begin(9);await mission('remote');await put('base',50,61);await put('design-magnet',43,55);await put('design-target',57,55);await mission('prototype');await explain(9);await begin(10);for(const y of [51,47,43,42])await put('use-handle',43,y);await mission('test');await mission('next');for(const y of [46,50,54,58,62,66])await put('use-handle',43,y);await mission('test');await put('force-arrow',50,66);await explain(10);await page.evaluate(()=>window.__lab.go('report'));await action('reviewed');await put('blueprint',53,56);for(const y of [51,47,43,42])await put('use-handle',43,y);await mission('test');await page.locator('[data-restoration="finish"]').click();assert.equal((await save()).final.complete,true);check('alternative remote invention branch / two uses / field missions / plaza / ending');
}
(async()=>{try{browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});if(!process.env.ONLY_MATRIX)await student();if(!process.env.ONLY_STUDENT)await matrix();}catch(e){console.error(e);results.push({name:'browser regression',status:'fail',message:e.stack});if(page)await page.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}finally{fs.writeFileSync(out+'/browser-results.json',JSON.stringify(results,null,2));await browser?.close();}})();
