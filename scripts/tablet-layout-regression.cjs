// Test-only layout fixtures: never writes to the learner's browser or supplies learning evidence.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.TEST_URL||'http://127.0.0.1:5173/';
const out=process.env.TEST_OUT||'test-results/tablet-layout';
fs.mkdirSync(out,{recursive:true});
const sizes=[{width:1024,height:768},{width:1280,height:800},{width:768,height:1024},{width:800,height:1280},{width:1024,height:600}];
const fixtures=[];
for(let n=1;n<=10;n++)fixtures.push({name:`stage-${n}`,n});
fixtures.push(
 {name:'stage-1-open',n:1,values:{open0:true},points:{lid:{x:50,y:37}}},
 {name:'stage-2-closed',n:2,values:{repairClosed:true},points:{lid:{x:50,y:65},'repair-magnet':{x:43,y:59}}},
 {name:'stage-3-extra',n:3,values:{extraMaterials:true}},
 {name:'stage-4-paper',n:4,values:{round:2},points:{'distance-magnet':{x:49,y:55}}},
 {name:'stage-5-stickers',n:5,values:{test0N:true,test0S:true},points:{probe:{x:48,y:53}}},
 {name:'stage-6-placed',n:6,points:{ring0:{x:68,y:71},ring1:{x:68,y:56}}},
 {name:'stage-8-end',n:8,values:{car:73,controlled0:46},points:{controller:{x:82,y:59}}},
 {name:'stage-9-box',n:9,values:{chosen:true}},
 {name:'stage-9-remote',n:9,values:{chosen:true},template:'remote'},
 {name:'stage-10-remote',n:10,template:'remote'},
 {name:'stage-10-adjust',n:10,template:'remote',values:{adjusting:true}}
);
for(const n of [2,4,6,8,10]){
 const keys={2:['repair0'],4:['far','near','paper'],6:['float2','join2'],8:['stop0','stop1','delivery0','delivery1'],10:['use0']}[n];
 const trials=keys.map(key=>({id:`${n}:${key}`,key,activity:n,modelVersion:1,conditions:{gap:key==='far'?36:12,paper:key==='paper'},initialObjects:[],objects:[],input:[],outcome:'success',template:'box',designRevision:0}));
 fixtures.push({name:`stage-${n}-reflection`,n,values:{inquiryPhase:'explain',with0:true,without0:true,segment0:true,segment1:true},trials});
}
let browser,page,cdp;const reports=[],errors=[],touchChecks=[];
async function show(f){await page.evaluate(f=>window.__tablet.show(f),f);await page.locator('.quest-activity').waitFor();}
async function audit(name,shot=false){
 const result=await page.evaluate(()=>{
  const viewport={width:innerWidth,height:innerHeight};
  const describe=e=>e.getAttribute('data-drag')||e.getAttribute('data-mission')||e.getAttribute('data-action')||e.getAttribute('aria-label')||e.textContent.trim().slice(0,35);
  const visible=e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
  const elements=[...document.querySelectorAll('#app button,#app summary,#app select')].filter(e=>visible(e)&&!e.disabled);
  const issues=[],targets=[];
  for(const e of elements){
   const r=rect(e),id=describe(e);targets.push({id,...r});
   if(r.w<43.5||r.h<43.5)issues.push({type:'small',id,...r});
   if(r.x<-.5||r.y<-.5||r.x+r.w>innerWidth+.5||r.y+r.h>innerHeight+.5)issues.push({type:'outside',id,...r});
   const samples=[[.5,.5],[.22,.5],[.78,.5],[.5,.25],[.5,.75]];
   let blocked=[];
   for(const [x,y] of samples){const top=document.elementFromPoint(r.x+r.w*x,r.y+r.h*y);if(top&&top!==e&&!e.contains(top))blocked.push(describe(top.closest('button,summary')||top));}
   if(blocked.length>=3)issues.push({type:'blocked',id,by:[...new Set(blocked)],...r});
   if(e.scrollWidth>e.clientWidth+2&&e.clientWidth)issues.push({type:'text-width',id,scroll:e.scrollWidth,width:e.clientWidth});
  }
  for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){
   const a=elements[i],b=elements[j];if(a.contains(b)||b.contains(a))continue;
   const ar=rect(a),br=rect(b),w=Math.min(ar.x+ar.w,br.x+br.w)-Math.max(ar.x,br.x),h=Math.min(ar.y+ar.h,br.y+br.h)-Math.max(ar.y,br.y);
   if(w>8&&h>8&&w*h/Math.min(ar.w*ar.h,br.w*br.h)>.12)issues.push({type:'overlap',id:describe(a),by:[describe(b)],w,h});
  }
  const board=document.querySelector('.mission-board'),head=document.querySelector('.mission-head');
  if(board&&head){const h=rect(head);for(const e of elements.filter(e=>e.matches('[data-drag]'))){const r=rect(e);if(Math.min(h.x+h.w,r.x+r.w)-Math.max(h.x,r.x)>4&&Math.min(h.y+h.h,r.y+r.h)-Math.max(h.y,r.y)>4)issues.push({type:'header-overlap',id:describe(e),...r});}}
  return {viewport,issues,targets,board:board?rect(board):null,documentWidth:document.documentElement.scrollWidth};
 });
 const entry={name,...result};reports.push(entry);
 if(shot)await page.screenshot({path:`${out}/${result.viewport.width}x${result.viewport.height}-${name}.png`});
 return entry;
}
async function finger(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1,radiusX:9,radiusY:9,force:1}]});}
async function dragPiece(id,x,y,edge=false){
 const piece=page.locator(`[data-drag="${id}"]`),r=await piece.boundingBox(),b=await page.locator('.mission-board').boundingBox();
 assert.ok(r&&b,`visible piece ${id}`);
 const offset=edge?r.width*.38:0,sx=r.x+r.width/2+offset,sy=r.y+r.height/2,tx=b.x+b.width*x/100+offset,ty=b.y+b.height*y/100;
 await finger('touchStart',sx,sy);
 for(let i=1;i<=12;i++){await finger('touchMove',sx+(tx-sx)*i/12,sy+(ty-sy)*i/12);await page.waitForTimeout(12);}
 await finger('touchEnd');
}
const current=n=>page.evaluate(n=>structuredClone(window.__tablet.save.activities[n]),n);
async function touchMatrix(size){
 await show({n:1});await dragPiece('lid',50,37,true);assert.equal((await current(1)).values.open0,true);
 await dragPiece('hidden-magnet',78,52,true);assert.equal((await current(1)).values.found0,true);
 await show({n:2});await dragPiece('lid',50,65,true);await page.locator('[data-mission="shake"]').tap();assert.equal((await current(2)).values.without0,true);
 await dragPiece('repair-magnet',43,59,true);await dragPiece('lid',50,65);await page.locator('[data-mission="shake"]').tap();assert.equal((await current(2)).values.with0,true);
 await show({n:3});await dragPiece('sweep-magnet',36,42,true);assert.equal((await current(3)).values['tested-clip'],true);
 await dragPiece('sweep-magnet',86,38);assert.equal((await current(3)).values['sorted-clip'],true);
 await dragPiece('sweep-magnet',66,43);await dragPiece('material-2',86,70,true);assert.equal((await current(3)).values['sorted-aluminum'],true);
 await show({n:4});await dragPiece('distance-magnet',49,55,true);assert.ok(Math.abs((await current(4)).points['distance-magnet'].x-49)<1);
 await show(fixtures.find(f=>f.name==='stage-4-paper'));await dragPiece('paper',55,55,true);await page.locator('[data-mission="release"]').tap();assert.equal((await current(4)).values.done2,true);
 await show({n:5});await dragPiece('probe',48,53,true);await page.locator('[data-mission="flip"]').tap();assert.equal((await current(5)).values.test0N,true);
 await dragPiece('stickerS',59,40);await dragPiece('stickerN',70,40);assert.equal((await current(5)).values.solved0,true);
 await show({n:6});await dragPiece('ring0',68,71,true);await dragPiece('ring1',68,56,true);await page.locator('.ring-flip').nth(1).tap();await page.locator('[data-mission="check"]').tap();assert.equal((await current(6)).values.done0,true);
 await show({n:7});await dragPiece('cleaner',35,47,true);assert.ok(Math.abs((await current(7)).points.cleaner.x-35)<1);
 await show({n:8});await dragPiece('controller',38,59,true);await page.waitForTimeout(200);assert.ok(Number((await current(8)).values.car)>27);
 await show({n:9});await page.locator('[data-mission="box"]').tap();await dragPiece('base',50,61,true);await dragPiece('design-magnet',43,55,true);await dragPiece('design-target',57,55,true);await page.locator('[data-mission="prototype"]').tap();assert.ok((await current(9)).trials.some(t=>t.key==='prototype'));
 await show({n:10});await dragPiece('use-handle',50,65,true);await page.locator('[data-mission="test"]').tap();assert.equal((await current(10)).values.use0,true);
 await show({n:10,template:'remote'});await dragPiece('use-handle',43,42,true);await page.locator('[data-mission="test"]').tap();assert.equal((await current(10)).values.use0,true);
 // Rotate during a real touch: the old gesture cannot place the piece, and a new drag still works.
 await show({n:3});const r=await page.locator('[data-drag="sweep-magnet"]').boundingBox();
 await finger('touchStart',r.x+r.width/2,r.y+r.height/2);await finger('touchMove',r.x+r.width/2+24,r.y+r.height/2);
 await page.setViewportSize({width:size.height,height:size.width});await finger('touchEnd');assert.equal(await page.locator('.dragging').count(),0);
 await dragPiece('sweep-magnet',36,42);assert.equal((await current(3)).values['tested-clip'],true);
 await page.setViewportSize(size);
 touchChecks.push(`${size.width}x${size.height}: 10 stages, paper, both inventions, edge grips and rotation`);
 console.log('TOUCH PASS '+touchChecks.at(-1));
}
async function main(){
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:sizes[0],hasTouch:true});page=await context.newPage();
 cdp=await context.newCDPSession(page);
 await page.routeWebSocket('**',socket=>socket.close());
 await page.route('**/src/main.ts*',async route=>{
  const headers={...route.request().headers()};delete headers['if-none-match'];delete headers['if-modified-since'];
  const response=await route.fetch({headers});assert.equal(response.status(),200);
  const hook=`\nwindow.__tablet={get save(){return s},show(f){cleanPage();practiceBackup=null;adminBackup=null;s=freshSave();s.settings.sound=false;s.settings.motion=false;s.completed=[1,2,3,4,5,6,7,8,9,10];s.design={template:f.template||'box',pair:'iron',pole:'N',gap:28,aligned:true,revision:0};screen=f.n;const a=s.activities[f.n]=emptyActivity();a.values={playVersion:4,mechanicsVersion:1,paceVersion:1,inquiryVersion:2,inquiryActivity:f.n,inquiryPhase:'experiment',...f.values};a.points=f.points||{};a.trials=f.trials||[];if(f.n!==9){s.activities[9]||=emptyActivity();s.activities[9].points['design-magnet']={x:43,y:55};s.activities[9].points['design-target']={x:57,y:55};}page='activity';render();}};`;
  await route.fulfill({response,body:(await response.text())+hook});
 });
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(base);await page.waitForFunction(()=>window.__tablet);
 for(const size of sizes){
  await page.setViewportSize(size);
  for(const f of fixtures){await show(f);await audit(f.name,process.env.CAPTURE==='all'||(!process.env.CAPTURE&&(size.width===768||size.width===1024)&&!f.name.includes('reflection')));}
  // Optional overlays are real UI states, opened by touch rather than fixture flags.
  for(const n of [1,3,5,6,8,10]){
   await show({name:'overlay',n});await page.locator('.coach-toggle').tap();await audit(`stage-${n}-hint`);
   await page.locator('.coach-close').tap();await page.locator('.mission-access summary').tap();await audit(`stage-${n}-placement`);
   await show({name:'think',n});await page.locator('.play-question summary').tap();await audit(`stage-${n}-question`);
  }
  console.log(`AUDIT ${size.width}x${size.height}: ${reports.filter(r=>r.viewport.width===size.width&&r.viewport.height===size.height).reduce((a,r)=>a+r.issues.length,0)} candidates`);
  if(process.env.TOUCH==='1')await touchMatrix(size);
 }
 await context.close();
}
main().catch(e=>{errors.push(e.stack);process.exitCode=1;}).finally(async()=>{
 fs.writeFileSync(`${out}/audit.json`,JSON.stringify({reports,touchChecks,errors},null,2));
 const grouped={};for(const r of reports)for(const i of r.issues){const k=`${i.type}: ${i.id}${i.by?' <- '+i.by.join('|'):''}`;(grouped[k]||=[]).push(`${r.viewport.width}x${r.viewport.height}/${r.name}`);}
 fs.writeFileSync(`${out}/issues.json`,JSON.stringify(grouped,null,2));
 console.log(JSON.stringify({screens:reports.length,issues:reports.reduce((a,r)=>a+r.issues.length,0),errors}));
 await browser?.close();
 if(process.env.STRICT==='1'&&(errors.length||reports.some(r=>r.issues.length)))process.exitCode=1;
});
