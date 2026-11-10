// Isolated contexts. Fixture tokens are not learner evidence.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out=process.env.TEST_OUT||'test-results/villain-sprite';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const broken of [false,true]){
  const context=await browser.newContext({viewport:{width:1024,height:768}}),page=await context.newPage();
  if(broken)await page.route('**/scrap-goblin-sheet.webp',r=>r.abort());
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:5299');
  await page.evaluate(async()=>{const {mountMapVillains}=await import('/src/map-villains.js');const world=document.createElement('div');world.id='sprite-fixture';world.style='position:fixed;inset:0;z-index:99999;background:#d8e7e8';document.body.append(world);window.hits=0;window.cleanup=mountMapVillains(world,{key:'sprite-regression',power:'자석 파동',reduced:false,preview:false,stages:[{name:'검사',x:50,y:50,ready:true,token:'one'}],sound:()=>window.hits++});});
  const target=page.locator('#sprite-fixture .mv-target');
  if(!broken)await page.locator('#sprite-fixture .mv-sprite').waitFor();else{await page.waitForTimeout(400);assert.equal(await page.locator('#sprite-fixture .mv-sprite').count(),0);}
  await page.screenshot({path:`${out}/${broken?'fallback':'sheet'}-idle.png`});
  await target.evaluate(e=>{for(let i=0;i<8;i++)e.click();});assert.equal(await page.evaluate(()=>window.hits),1);
  if(!broken)assert.match(await target.locator('.mv-creature').evaluate(e=>getComputedStyle(e).animationName),/mv-sprite-hit/);
  await page.waitForTimeout(350);await target.click();await page.waitForTimeout(350);await target.click();await page.waitForTimeout(700);
  assert.equal(await target.getAttribute('data-state'),'cleared');
  await target.evaluate(e=>e.click());assert.equal(await page.evaluate(()=>window.hits),3);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sprite-regression'))[0]),'one');
  await page.evaluate(()=>window.cleanup());assert.equal(await page.locator('#sprite-fixture .mv-target').count(),0);
  console.log('PASS',broken?'image failure fallback':'sprite loaded and hit frames','rapid click, exactly three hits, persistence, cleanup');await context.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
