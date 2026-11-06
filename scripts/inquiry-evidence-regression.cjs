// 예상·관찰·자동재생 구분·학습 증거와 예전 지적 사항 회귀. 앱 내부 훅 없이 화면 조작과 IndexedDB 읽기만 쓴다.
// TEST_FIXTURE: 이전 빌드로 완주한 학생 저장. 앞 구역을 여는 데와 이전 기록 호환 시험에 쓴다.
// TEST_URL=http://127.0.0.1:4197/ TEST_FIXTURE=<student.json> node scripts/inquiry-evidence-regression.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {assembleMailbox}=require('./browser-mailbox.cjs');
const fixture=JSON.parse(fs.readFileSync(process.env.TEST_FIXTURE,'utf8'));
const base=process.env.TEST_URL||'http://127.0.0.1:5173/';
const out=process.env.TEST_OUT||'test-results/inquiry-evidence';fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];let browser;
const pass=(name,detail)=>{results.push({name,status:'pass',...detail});console.log('PASS '+name+(detail?' '+JSON.stringify(detail):''));};
const save=p=>p.evaluate(()=>new Promise((res,rej)=>{const q=indexedDB.open('push-pull-city');q.onerror=()=>rej(q.error);q.onsuccess=()=>{const db=q.result,r=db.transaction('saves').objectStore('saves').get('main');r.onsuccess=()=>{db.close();res(r.result);};r.onerror=()=>rej(r.error);};}));
const seed=(p,s)=>p.evaluate(s=>new Promise((res,rej)=>{const q=indexedDB.open('push-pull-city');q.onsuccess=()=>{const db=q.result,tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(s,'main');tx.oncomplete=()=>{db.close();res();};tx.onerror=()=>rej(tx.error);};}),s);
const action=(p,id)=>p.locator(`[data-action="${id}"]`);
const settled=p=>p.waitForTimeout(650);
const put=(p,id,x,y)=>p.locator(`[data-drag="${id}"]`).evaluate((el,q)=>el.dispatchEvent(new CustomEvent('piece-place',{detail:q})),{x,y});
const quiet=s=>{Object.assign(s.settings,{sound:false,music:false,effects:false,motion:true});return s;};
async function open(viewport={width:1280,height:800}){
  const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await action(page,'start').waitFor();return {context,page};
}
async function firstActivity(p){await action(p,'start').click();await p.locator('[data-story="skip"]').click();await p.locator('[data-story="finish"]').click();await action(p,'walk-next').click();await action(p,'enter').click();await p.locator('#experiment-root canvas').waitFor();}
function at(n){
  const s=quiet(structuredClone(fixture));s.resume=n;s.started=true;s.completed=s.completed.filter(i=>i<n);s.evidence=s.evidence.filter(e=>e.stage<Math.floor((n-1)/2));
  s.final={report:false,latch:'N',ring:'N',plate:80,complete:false,date:''};delete s.idea;for(const k of Object.keys(s.activities))if(Number(k)>=n)delete s.activities[k];return s;
}
async function resume(p,s){await seed(p,s);await p.reload();await action(p,'start').click();await p.locator('#experiment-root').waitFor();}
async function inside(p,selector,label){
  const v=p.viewportSize(),box=await p.locator(selector).first().boundingBox();
  assert.ok(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=v.width+1&&box.y+box.height<=v.height+1,`${label} ${selector} ${JSON.stringify(box)} in ${v.width}x${v.height}`);
}
async function targets(p,label){
  for(const b of await p.locator('.thinking-option').all()){const box=await b.boundingBox();assert.ok(box.height>=47.5,`${label} button height ${box.height}`);
    const hit=await b.evaluate(el=>{const r=el.getBoundingClientRect(),t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return el===t||el.contains(t);});assert.ok(hit,`${label} button is covered`);}
}
const shot=(p,name)=>p.screenshot({path:`${out}/${name}.png`});
const finishedDemo=p=>p.waitForFunction(()=>document.querySelector('[data-demo="toggle"]')?.textContent.includes('관찰 완료'),null,{timeout:120000});

async function directMailbox(){
  const {context,page:p}=await open();await firstActivity(p);await assembleMailbox(p);
  assert.equal(await p.locator('[data-prompt-kind="predict"]').count(),1);
  const text=await p.locator('.thinking-card').innerText();assert.doesNotMatch(text,/정답/);
  assert.equal(await p.locator('[data-mission="close-lid"]').isDisabled(),true,'lid waits for the prediction');
  await targets(p,'predict');await shot(p,'direct-predict');await p.waitForTimeout(700);
  await p.reload();await action(p,'start').click();await p.locator('[data-prompt-kind="predict"]').waitFor();
  await p.locator('[data-prompt-choice="apart"]').tap();
  assert.equal(await p.locator('.thinking-card').count(),0);await shot(p,'direct-after-predict');
  await p.locator('[data-mission="close-lid"]').tap();
  await p.locator('[data-prompt-kind="compare"]').waitFor();await settled(p);
  assert.match(await p.locator('.thinking-pair').innerText(),/안 붙을 것 같아[\s\S]*자석과 철판이 붙었어/);
  assert.equal(await action(p,'complete').isDisabled(),true);await shot(p,'direct-compare');
  await p.locator('[data-prompt-choice="same"]').tap();assert.match(await p.locator('.thinking-note').innerText(),/두 칸/);
  await p.locator('[data-prompt-choice="different"]').tap();await settled(p);
  assert.match(await p.locator('.thinking-note').innerText(),/생각/);assert.equal(await action(p,'complete').isEnabled(),true);await shot(p,'direct-compare-done');
  const a=(await save(p)).activities[1];
  assert.equal(a.values.predict,'apart');assert.equal(a.values.predictCompare,'different');assert.equal(a.values.autoObserved,undefined);
  assert.ok(a.trials.every(t=>t.conditions.manual===true&&t.conditions.autoplay===undefined));
  await action(p,'observations').click();const drawer=await p.locator('.record-drawer-content').innerText();
  assert.match(drawer,/직접 해봄/);assert.match(drawer,/안 붙을 것 같아/);assert.match(drawer,/처음 예상과 달랐어/);await shot(p,'direct-records');
  pass('우편함 직접 실험: 예상 → 관찰 → 비교, 새로고침 유지, 직접 해봄 기록');await context.close();
}
async function keyboardMailbox(){
  const {context,page:p}=await open();await firstActivity(p);await assembleMailbox(p);
  await p.locator('[data-prompt-choice="stick"]').focus();await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>document.activeElement?.dataset.mission),'close-lid','focus moves to the next action');
  await p.keyboard.press('Enter');await p.locator('[data-prompt-kind="compare"]').waitFor();await settled(p);
  await p.locator('[data-prompt-choice="same"]').focus();await p.keyboard.press('Enter');await settled(p);
  assert.equal((await save(p)).activities[1].values.predictCompare,'same');assert.equal(await action(p,'complete').isEnabled(),true);
  pass('우편함 키보드만으로 같은 목표 도달');await context.close();
}
async function autoMailbox(){
  const {context,page:p}=await open();await firstActivity(p);
  await p.locator('[data-demo="toggle"]').click();
  await p.locator('[data-prompt-kind="predict"]').waitFor({timeout:60000});await p.waitForTimeout(1600);
  let a=(await save(p)).activities[1];assert.equal(a.values.predict,undefined,'demonstration never predicts for the learner');assert.notEqual(a.values.latch0,true);
  assert.match(await p.locator('.demo-caption').innerText(),/예상/);await shot(p,'auto-waits-for-prediction');
  await p.locator('[data-prompt-choice="stick"]').click();
  await p.locator('[data-prompt-kind="watch"]').waitFor({timeout:30000});await finishedDemo(p);await settled(p);
  assert.equal(await action(p,'complete').isDisabled(),true);await targets(p,'watch');await shot(p,'auto-watch');
  await p.locator('[data-prompt-choice="1"]').click();assert.match(await p.locator('.thinking-note').innerText(),/다시 보기/);
  await p.locator('[data-prompt-choice="0"]').click();await p.locator('[data-prompt-kind="compare"]').waitFor();
  await p.locator('[data-prompt-choice="same"]').click();await settled(p);
  a=(await save(p)).activities[1];
  assert.equal(a.values.watchFirst,1);assert.equal(a.values.watchChoice,0);assert.ok(a.trials.every(t=>t.conditions.autoplay===true));
  await action(p,'observations').click();const drawer=await p.locator('.record-drawer-content').innerText();
  assert.match(drawer,/자동으로 관찰함/);assert.match(drawer,/자동 관찰 후 처음 고른 결과/);assert.match(drawer,/다시 고친 결과/);await shot(p,'auto-records');
  await p.locator('.modal-close').click();assert.equal(await action(p,'complete').isEnabled(),true);
  pass('우편함 자동재생: 예상은 학생이 고르고, 관찰 결과를 고르며, 자동으로 관찰함 표시');await context.close();
}
async function autoOthers(){
  for(const n of [3,7]){
    const {context,page:p}=await open(n===7?{width:1024,height:768}:undefined);await resume(p,at(n));
    await p.locator('[data-demo="toggle"]').click();await p.locator('[data-prompt-kind="watch"]').waitFor({timeout:120000});await finishedDemo(p);await settled(p);
    await targets(p,`activity ${n}`);await shot(p,`auto-watch-${n}`);
    assert.equal(await action(p,'complete').isDisabled(),true);
    await p.locator(`[data-prompt-choice="${n===3?1:2}"]`).click();await settled(p);
    assert.equal(await action(p,'complete').isEnabled(),true);assert.equal(await p.locator('.thinking-card').count(),0);
    pass(`활동 ${n} 자동재생 뒤 관찰 결과 선택`);await context.close();
  }
}
async function discovery(){
  const {context,page:p}=await open();const s=at(2);s.activities[1]=fixture.activities[1];s.completed=[1];
  s.activities[2]=structuredClone(fixture.activities[2]);Object.assign(s.activities[2].values,{inquiryPhase:'explain',reflected:false});delete s.activities[2].values.reflection;
  s.activities[2].records=s.activities[2].records.filter(r=>r.key!=='inquiry-discovery');
  await resume(p,s);await p.locator('[data-phase="explain"]').waitFor();
  await p.locator('[data-inquiry-group="reflection"]').nth(1).click();await settled(p);
  await p.reload();await action(p,'start').click();await p.locator('[data-phase="explain"]').waitFor();
  await p.locator('[data-inquiry-group="reflection"]').nth(0).click();await settled(p);
  await action(p,'complete').click();await action(p,'next-zone').waitFor();await settled(p);
  const after=await save(p),a=after.activities[2];assert.equal(a.values.reflectionFirst,1);assert.equal(a.values.reflection,0);
  assert.ok(after.evidence[0].summary.some(t=>t.startsWith('처음 고른 답')));
  await p.keyboard.press('Escape');await p.locator('.modal-backdrop').waitFor({state:'detached'});
  await action(p,'settings').click();await p.getByText('앱 정보 · 배움과 보상',{exact:true}).click();await p.locator('[data-settings-action="records"]').click();await p.locator('.modal').waitFor();await p.locator('.evidence-tabs [role=tab]').first().click();
  const text=await p.locator('.modal').innerText();assert.match(text,/처음 고른 근거/);assert.match(text,/다시 고친 근거/);await shot(p,'notebook-evidence');
  pass('발견 정리: 최초 선택과 고친 선택 보존, 연구 가방에 구분 표시');await context.close();
}
async function oldSave(){
  const {context,page:p}=await open();const s=quiet(structuredClone(fixture));await seed(p,s);await p.reload();await action(p,'start').waitFor();
  assert.deepEqual((await save(p)).completed,s.completed);
  await action(p,'start').click();await p.waitForTimeout(600);
  const loaded=await save(p);assert.equal(loaded.final.complete,true);assert.equal(loaded.evidence.length,5);assert.equal(JSON.stringify(loaded.evidence),JSON.stringify(s.evidence));
  await context.close();
  const b=await open();const mid=at(1);mid.activities[1]=structuredClone(fixture.activities[1]);mid.resume=1;
  await resume(b.page,mid);assert.equal(await b.page.locator('.thinking-card').count(),0,'already closed old mailbox asks nothing');
  assert.equal(await action(b.page,'complete').isEnabled(),true);
  await action(b.page,'observations').click();const drawer=await b.page.locator('.record-drawer-content').innerText();
  assert.doesNotMatch(drawer,/직접 해봄|자동으로 관찰함|실험 전 내 예상/);await b.context.close();
  pass('이전 저장: 수료·증거 보존, 구분 정보 없는 기록은 표시를 지어내지 않고 막지도 않음');
}
async function teacherPreview(){
  const {context,page:p}=await open();const s=quiet(structuredClone(fixture));await seed(p,s);await p.reload();await action(p,'start').waitFor();
  const before=JSON.stringify(await save(p));
  const tools=async()=>{await action(p,'settings').click();await p.getByText('교사용 가이드',{exact:true}).click();await p.getByText('교사용 도구',{exact:true}).click().catch(()=>{});};
  await tools();await p.locator('[data-settings-action="admin"]').click();await p.locator('.quest-city').waitFor();
  await p.locator('[data-map-overview]').click();await p.locator('[data-place="0"]').click();await p.locator('#experiment-root.screen-1').waitFor({timeout:25000});
  assert.equal(await action(p,'complete').isEnabled(),true,'preview moves on freely before any choice');await action(p,'complete').click();await p.locator('#experiment-root.screen-2').waitFor();
  await action(p,'home').click();await p.locator('.quest-city').waitFor();
  await tools();await p.locator('[data-settings-action="reset"]').click();await p.locator('[data-confirm="reset"]').click();await p.waitForTimeout(900);
  assert.equal(JSON.stringify(await save(p)),before,'preview reset leaves the student save');
  await tools();await p.locator('[data-settings-action="admin"]').click();await p.waitForTimeout(700);
  assert.equal(JSON.stringify(await save(p)),before);
  pass('교사용 미리보기: 자유 이동 유지, 초기화해도 실제 기록 그대로');await context.close();
}
async function workshopGate(){
  const {context,page:p}=await open();await resume(p,at(9));await p.locator('[data-idea-step]').waitFor();const next=()=>p.locator('.idea-next');
  assert.equal(await next().isDisabled(),true);await p.locator('[data-problem]').first().click();await p.keyboard.press('Escape');await next().click();
  assert.equal(await next().isDisabled(),true);await p.locator('[data-property]').first().click();await next().click();await next().click();await p.locator('.screen-10').first().waitFor();
  assert.equal(await next().isDisabled(),true);assert.match(await p.locator('.idea-gate').textContent(),/이름/);
  await p.locator('#idea-name').fill('  ');await p.locator('#idea-pitch').fill('          ');assert.equal(await next().isDisabled(),true);
  pass('학생 발명공방: 문제·성질·이름·설명이 비면 발표로 못 감');await context.close();
}
async function regressions(){
  { // 극 반응: 저장된 움직임과 문구가 같은 방향인지
    const {context,page:p}=await open();await resume(p,at(5));
    const a0=()=>save(p).then(s=>s.activities[5]);
    await put(p,'probe',48,53);await p.waitForFunction(()=>!document.querySelector('#experiment-root').inert);await settled(p);await shot(p,'pole-first');
    await p.locator('[data-mission="flip"]').click();await p.waitForFunction(()=>!document.querySelector('#experiment-root').inert);await settled(p);
    await put(p,'probe',48,53);await p.waitForFunction(()=>!document.querySelector('#experiment-root').inert);await settled(p);await shot(p,'pole-second');
    const a=await a0(),rows=[];
    for(const t of a.trials.filter(t=>/^pole0/.test(t.key))){
      const from=t.initialObjects.find(o=>o.id==='unknown-magnet'),to=t.objects.find(o=>o.id==='unknown-magnet'),probe=t.objects.find(o=>o.id==='probe');
      const toward=Math.abs(to.x-probe.x)<Math.abs(from.x-probe.x),same=t.conditions.facing===t.conditions.hidden;
      assert.equal(t.outcome,same?'repel':'attract');assert.equal(toward,!same,'같은 극은 멀어지고 다른 극은 가까워져야 해');rows.push({facing:t.conditions.facing,hidden:t.conditions.hidden,outcome:t.outcome,toward});
    }
    assert.equal(rows.length,2);pass('회귀: 극 반응 움직임·기록 일치',{rows});await context.close();
  }
  { // 고리 뒤집기 뒤 위치
    const {context,page:p}=await open();await resume(p,at(6));
    await put(p,'ring0',68,71);await put(p,'ring1',68,56);await settled(p);
    const before=(await save(p)).activities[6].points;await p.locator('.ring-flip').nth(1).click();await settled(p);const after=(await save(p)).activities[6].points;
    assert.deepEqual([after.ring0,after.ring1],[before.ring0,before.ring1],'뒤집어도 기둥 위치 유지');await shot(p,'ring-flip');
    pass('회귀: 고리 뒤집기 후 위치 유지',{ring1:after.ring1});await context.close();
  }
  { // 분류한 철못이 다음 입력을 가리는지
    const {context,page:p}=await open();await resume(p,at(3));
    await put(p,'sweep-magnet',52,42);await put(p,'sweep-magnet',86,42);await settled(p);
    assert.equal((await save(p)).activities[3].values['sorted-nail'],true);
    const blocked=await p.evaluate(()=>[...document.querySelectorAll('[data-drag]:not(:disabled)')].filter(el=>el.style.pointerEvents!=='none').map(el=>{const r=el.getBoundingClientRect(),t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{id:el.dataset.drag,ok:el===t||el.contains(t),by:t?.dataset?.drag||t?.className}}).filter(x=>!x.ok));
    assert.deepEqual(blocked,[],'남은 입력이 가려지지 않아야 해');await shot(p,'sorted-nail');pass('회귀: 분류한 철못이 남은 입력을 가리지 않음');await context.close();
  }
  for(const viewport of [{width:1280,height:800},{width:1024,height:768}]){ // 택배 자석과 상단 UI
    const {context,page:p}=await open(viewport);await resume(p,at(8));
    for(let i=0;i<40;i++)await p.locator('[data-drag="controller"]').press('ArrowUp');await p.locator('[data-drag="controller"]').press('Enter');await settled(p);
    const box=await p.locator('[data-drag="controller"]').boundingBox(),covered=[];
    for(const selector of ['[data-action="home"]','[data-action="back"]','[data-action="sound"]','[data-action="settings"]','[data-demo="toggle"]','.bench-view-toggle']){
      if(!await p.locator(selector).count())continue;const b=await p.locator(selector).first().boundingBox();
      if(b&&box.x<b.x+b.width&&box.x+box.width>b.x&&box.y<b.y+b.height&&box.y+box.height>b.y)covered.push(selector);
    }
    assert.deepEqual(covered,[],'택배 자석이 상단 UI와 겹치지 않아야 해');await shot(p,`delivery-top-${viewport.width}`);
    pass(`회귀: 택배 자석이 상단 UI를 가리지 않음 ${viewport.width}`,{magnetTop:Math.round(box.y)});await context.close();
  }
  for(const viewport of [{width:1280,height:800},{width:1024,height:768}]){ // 스크롤 튐
    const {context,page:p}=await open(viewport);await firstActivity(p);await assembleMailbox(p);
    const y0=await p.evaluate(()=>scrollY),h=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
    await p.locator('[data-prompt-choice="stick"]').tap();await p.locator('[data-mission="close-lid"]').tap();await p.locator('[data-prompt-kind="compare"]').waitFor();await settled(p);
    assert.equal(await p.evaluate(()=>scrollY),y0);assert.ok(h<=1,`페이지 스크롤 ${h}`);pass(`회귀: 실험 중 스크롤 튐 없음 ${viewport.width}`);await context.close();
  }
}
async function layouts(){
  for(const [w,h] of [[1920,1080],[1280,800],[1280,720],[1024,768],[1024,600],[915,412],[830,515],[768,1024],[375,812]]){
    const {context,page:p}=await open({width:w,height:h});await firstActivity(p);await assembleMailbox(p);
    await inside(p,'.thinking-card',`${w}x${h} predict`);await targets(p,`${w}x${h} predict`);await shot(p,`layout-${w}x${h}-predict`);
    await p.locator('[data-prompt-choice="apart"]').tap();await inside(p,'[data-mission="close-lid"]',`${w}x${h}`);
    await p.locator('[data-mission="close-lid"]').tap();await p.locator('[data-prompt-kind="compare"]').waitFor();await settled(p);
    await inside(p,'.thinking-card',`${w}x${h} compare`);await targets(p,`${w}x${h} compare`);await shot(p,`layout-${w}x${h}-compare`);
    pass(`레이아웃 ${w}x${h}`);await context.close();
  }
  for(const [w,h] of [[1280,800],[1024,768],[915,412],[830,515],[768,1024]]){
    const {context,page:p}=await open({width:w,height:h});const s=at(3);await resume(p,s);
    await p.locator('[data-demo="toggle"]').click();await p.locator('[data-prompt-kind="watch"]').waitFor({timeout:120000});await finishedDemo(p);await settled(p);
    await inside(p,'.thinking-card',`${w}x${h} watch`);await targets(p,`${w}x${h} watch`);await shot(p,`layout-${w}x${h}-watch`);pass(`레이아웃 ${w}x${h} 자동 관찰 질문`);await context.close();
  }
}
(async()=>{
  browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'}),headless:true});
  const only=process.env.ONLY?.split(',');const all={directMailbox,keyboardMailbox,autoMailbox,autoOthers,discovery,oldSave,teacherPreview,workshopGate,regressions,layouts};
  let failed=0;
  for(const [name,run] of Object.entries(all)){if(only&&!only.includes(name))continue;try{await run();}catch(e){failed++;results.push({name,status:'fail',message:e.message});console.error('FAIL '+name+': '+e.message.slice(0,500));}}
  if(errors.length){failed++;console.error('page errors',errors);}
  fs.writeFileSync(out+'/results.json',JSON.stringify({results,errors},null,2));await browser.close();process.exitCode=failed?1:0;
})();
