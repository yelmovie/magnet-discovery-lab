// Production smoke in fresh browser contexts: title, the ring 3D card and both invention demos.
// Seeds a throwaway save inside each new context only; never touches a real learner's browser.
//   node scripts/release-smoke.cjs https://magnet-city.pages.dev test-results/release-x
const {chromium}=require('playwright');
const fs=require('node:fs');
const sharp=require('sharp');
const base=(process.argv[2]||'https://magnet-city.pages.dev').replace(/\/$/,'')+'/';
const out=process.argv[3]||'test-results/release-smoke';fs.mkdirSync(out,{recursive:true});
const seed=(page,save)=>page.evaluate(s=>new Promise((res,rej)=>{const r=indexedDB.open('push-pull-city',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>{const tx=r.result.transaction('saves','readwrite');tx.objectStore('saves').put(s,'main');tx.oncomplete=()=>{r.result.close();res();};tx.onerror=rej;};}),save);
function save(kind,template){
  const now=new Date().toISOString(),act=v=>({points:{},values:v,records:[],trials:[],mask:[]});
  const s={version:2,revision:0,started:true,updated:now,completed:[],evidence:[],activities:{},design:{template,pair:'iron',pole:'N',gap:20,aligned:true,revision:1},designs:{},resume:0,city:{x:233,y:245},settings:{sound:false,music:false,musicVersion:1,effects:false,musicVolume:.35,motion:true,nickname:''},final:{report:false,latch:'N',ring:'N',plate:80,complete:false,date:''}};
  if(kind==='rings'){for(let k=0;k<2;k++)s.evidence.push({stage:k,date:now,activities:[],summary:['기록']});for(let i=1;i<6;i++)s.completed.push(i);s.resume=6;
    s.activities[6]=act({playVersion:4,mechanicsVersion:1,inquiryVersion:1,inquiryPhase:'experiment',prediction:0,round:0,ringPole1:'S'});s.activities[6].points={ring0:{x:68,y:71},ring1:{x:68,y:56}};}
  else{for(let k=0;k<5;k++)s.evidence.push({stage:k,date:now,activities:[],summary:['기록']});for(let i=1;i<=10;i++)s.completed.push(i);s.final.report=true;
    s.final.route={mode:'basic',repair:'invention',installed:true,operated:true,segments:['invention'],revision:1,template,replayEvidenceIds:[0,1,2,3,4],attempt:act({})};}
  return s;
}
const results=[];const check=(name,ok,detail={})=>{results.push({name,ok,...detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const [w,h] of [[1280,800],[1024,768]]){
    for(const kind of ['title','rings','box','remote']){
      const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:true}),page=await context.newPage(),errors=[],failed=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('requestfailed',r=>failed.push(r.url()));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
      await page.goto(base);await page.locator('[data-action="start"]').waitFor();
      if(kind==='title'){await page.waitForLoadState('networkidle');const broken=await page.evaluate(()=>[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));
        await page.screenshot({path:`${out}/${w}-title.png`});check(`${w}x${h} title`,!errors.length&&!failed.length&&!broken.length,{errors,failed,broken});await context.close();continue;}
      await seed(page,save(kind,kind==='remote'?'remote':'box'));await page.reload();await page.locator('[data-action="start"]').click();
      if(kind==='rings'){await page.locator('[data-mission="view3d"]').click();}
      else{await page.locator('[data-action="walk-next"]').click();await page.locator('[data-action="enter"]').click({timeout:30000});await page.locator('[data-action="reviewed"]').click();await page.locator('[data-restoration="view3d"]').click();}
      await page.locator('.view3d-stage canvas').waitFor({timeout:60000});await page.waitForFunction(()=>!document.querySelector('.view3d-loading'),null,{timeout:60000});await page.waitForTimeout(1200);
      let note='';
      if(kind==='box'){await page.locator('.view3d-slider input').fill('0');await page.waitForTimeout(900);note=await page.locator('.view3d-note').textContent();}
      if(kind==='remote'){await page.locator('.view3d-slider input').fill('100');await page.waitForTimeout(1500);note=await page.locator('.view3d-note').textContent();}
      // A blank stage shows only its gradient; a drawn model adds many distinct colours.
      // (Reading the WebGL canvas directly returns a cleared buffer, so use a real screenshot.)
      const shot=await page.locator('.view3d-stage').screenshot();
      const {data}=await sharp(shot).resize(64,64,{fit:'fill'}).raw().toBuffer({resolveWithObject:true}),seen=new Set();
      for(let i=0;i<data.length;i+=3)seen.add((data[i]>>4)<<8|(data[i+1]>>4)<<4|data[i+2]>>4);const painted=seen.size;
      await page.screenshot({path:`${out}/${w}-${kind}.png`});
      const expected={rings:'',box:'착!',remote:'위 선반'}[kind];
      check(`${w}x${h} ${kind} 3D`,!errors.length&&!failed.length&&painted>20&&note.includes(expected),{errors,failed,painted,note});
      await context.close();
    }
  }
  fs.writeFileSync(`${out}/smoke.json`,JSON.stringify({base,results},null,1));await browser.close();
  process.exitCode=results.every(r=>r.ok)?0:1;
})();
