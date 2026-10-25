// Measures the mission head against the HUD and the movable pieces on every
// experiment, at the four required tablet/whiteboard profiles. Fresh contexts only.
const {chromium}=require('playwright');
const fs=require('node:fs');
const base=process.env.TEST_URL||'http://127.0.0.1:4176/';
const out=process.env.TEST_OUT||'test-results/layout-20261025';fs.mkdirSync(out,{recursive:true});
const profiles=[[906,755],[873,580],[1280,800],[1920,1080]];
const overlap=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
async function seed(page,n,phase){await page.evaluate(async([n,phase])=>{
  const d=await import('/src/domain.ts');const s=d.freshSave();s.started=true;s.resume=n;
  for(let k=0;k<Math.floor((n-1)/2);k++)s.evidence.push({stage:k,date:new Date().toISOString(),activities:[],summary:['기록']});
  for(let i=1;i<n;i++)s.completed.push(i);
  s.activities[n]={...d.emptyActivity(),values:{playVersion:4,mechanicsVersion:1,inquiryVersion:1,inquiryPhase:phase,prediction:0,round:0}};
  await new Promise((res,rej)=>{const r=indexedDB.open('push-pull-city',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>{const tx=r.result.transaction('saves','readwrite');tx.objectStore('saves').put(s,'main');tx.oncomplete=()=>{r.result.close();res();};tx.onerror=rej;};});
},[n,phase]);await page.reload();await page.locator('[data-action="start"]').click();await page.locator('.mission-head').waitFor();await page.waitForTimeout(700);}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),rows=[];
  for(const [width,height] of profiles){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base);await page.locator('[data-action="start"]').waitFor();
    for(const [n,phase] of [[1,'predict'],...Array.from({length:10},(_,i)=>[i+1,'experiment'])]){
      await seed(page,n,phase);
      const m=await page.evaluate(()=>{
        const r=el=>el.getBoundingClientRect(),head=r(document.querySelector('.mission-head'));
        const hud=[...document.querySelectorAll('.quest-hud button, [data-action="home"],[data-action="back"],[data-action="sound"],[data-action="settings"]')].map(r);
        const hits=[...document.querySelectorAll('.canvas-hit')].filter(e=>e.offsetParent).map(r);
        const card=document.querySelector('.inquiry-card');
        const small=[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())&&e.offsetParent&&!e.closest('.sr-only')&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.className||e.tagName);
        return {headBottom:Math.round(head.bottom),hudHit:hud.some(h=>h.width&&h.left<head.right&&head.left<h.right&&h.top<head.bottom&&head.top<h.bottom),
          minHitTop:hits.length?Math.round(Math.min(...hits.map(h=>h.top))):null,cardTop:card?Math.round(r(card).top):null,
          overflowX:document.documentElement.scrollWidth>innerWidth,small:[...new Set(small)].slice(0,5)};
      });
      const pass=!m.hudHit&&!m.overflowX&&(m.minHitTop===null||m.headBottom<=m.minHitTop)&&(m.cardTop===null||m.cardTop>=m.headBottom)&&!m.small.length;
      rows.push({profile:`${width}x${height}`,screen:n,phase,pass,...m});
      if(!pass||n===1||n===6||n===8)await page.screenshot({path:`${out}/${width}x${height}-s${n}-${phase}.png`});
      console.log(`${pass?'PASS':'FAIL'} ${width}x${height} s${n} ${phase} head=${m.headBottom} hit=${m.minHitTop} card=${m.cardTop}${m.small.length?' small='+m.small.join('|'):''}`);
    }
    if(errors.length)rows.push({profile:`${width}x${height}`,errors});
    await context.close();
  }
  fs.writeFileSync(out+'/layout-results.json',JSON.stringify(rows,null,1));await browser.close();
  process.exitCode=rows.some(r=>r.pass===false||r.errors)?1:0;
})();
