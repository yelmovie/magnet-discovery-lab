// Production bundle only, in throwaway browser contexts. No application hooks.
// node scripts/release-smoke.cjs <url> <output-folder>
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sharp=require('sharp');
const base=(process.argv[2]||'https://magnet-city.pages.dev').replace(/\/$/,'')+'/';
const out=process.argv[3]||'test-results/release-smoke';fs.mkdirSync(out,{recursive:true});
const action=(page,id)=>page.locator(`[data-action="${id}"]`);
const seed=(page,save)=>page.evaluate(s=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('push-pull-city');request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(s,'main');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
}),save);
function fixture(count){
  const date=new Date().toISOString();
  const act=(values={})=>({points:{},values,records:[],trials:[],mask:[]});
  const s={version:2,revision:0,started:true,updated:date,completed:Array.from({length:count*2},(_,i)=>i+1),
    evidence:Array.from({length:count},(_,stage)=>({stage,date,activities:[],summary:[]})),activities:{},
    design:{template:'box',pair:'iron',pole:'N',gap:20,aligned:true,revision:0},designs:{},resume:0,city:{x:233,y:245},
    settings:{sound:false,music:false,musicVersion:1,effects:false,musicVolume:.35,motion:true,nickname:''},
    final:{report:false,latch:'N',ring:'N',plate:80,complete:false,date:''}};
  if(count===2){
    s.completed.push(5);s.resume=6;
    s.activities[6]=act({playVersion:4,mechanicsVersion:1,paceVersion:1,inquiryVersion:2,inquiryActivity:6,inquiryPhase:'experiment',ringPole1:'S'});
    s.activities[6].points={ring0:{x:68,y:71},ring1:{x:68,y:56}};
  }else{
    s.idea={problem:'pins',custom:'',properties:['iron'],strokes:[],arrows:[],stickers:[],name:'철 압정 구조대',
      pitch:'막대 끝에 달린 자석이 떨어진 철 압정을 끌어당겨.',voice:false,shown:true,feedback:[],chosen:-1,change:'',step9:2,step10:2,checked:false};
    s.activities[10]=act({ideaVersion:1});
    Object.assign(s.final,{report:true,review:{version:1,page:4,answers:[1,0,2,0,-1]}});
  }
  return s;
}
const results=[];
const record=(name,detail={})=>{results.push({name,...detail});console.log(`PASS ${name}`);};
(async()=>{
  const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'}),
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const [width,height] of [[1280,800],[1024,768]]){
      for(const kind of ['title','rings','notebook']){
        const context=await browser.newContext({viewport:{width,height},hasTouch:true});
        try{
          const page=await context.newPage(),errors=[],failed=[],external=new Set();
          page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
          page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
          page.on('request',r=>{const url=new URL(r.url());if(/^https?:$/.test(url.protocol)&&url.origin!==new URL(base).origin)external.add(url.origin);});
          if(kind==='title'){
            const cdp=await context.newCDPSession(page);
            await cdp.send('Network.enable');
            await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
            await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1500000,uploadThroughput:750000});
          }
          await page.goto(base,{waitUntil:'domcontentloaded'});await action(page,'start').waitFor();
          if(kind==='title'){
            const readyMs=await page.evaluate(()=>Math.round(performance.now()));
            await page.waitForLoadState('networkidle');
            const initial=await page.evaluate(()=>({bytes:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.transferSize,performance.getEntriesByType('navigation')[0]?.transferSize||0),
              broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)}));
            assert.deepEqual(initial.broken,[]);
            await page.screenshot({path:`${out}/${width}-title.png`});
            await action(page,'start').click();await page.locator('[data-story="skip"]').click();await page.locator('[data-story="finish"]').click();
            await page.evaluate(()=>localStorage.setItem('unlockedStages',JSON.stringify([true,true,true,true,true])));
            await page.locator('[data-map-overview]').click();
            assert.match(await page.locator('[data-place="4"]').getAttribute('class'),/locked/);
            await action(page,'walk-next').click();await action(page,'enter').click();
            await page.locator('[data-mission="fit-part"]').click();
            await page.getByRole('button',{name:/2\. 뚜껑 연결/}).waitFor();
            const pieceSaved=()=>page.evaluate(()=>new Promise(resolve=>{
              const r=indexedDB.open('push-pull-city');
              r.onsuccess=()=>{const db=r.result,q=db.transaction('saves').objectStore('saves').get('main');q.onsuccess=()=>{db.close();resolve(q.result?.activities[1]?.values['assembly-body']===true);};q.onerror=()=>{db.close();resolve(false);};};
              r.onerror=()=>resolve(false);
            }));
            let saved=false;
            for(let attempt=0;attempt<35&&!saved;attempt++){
              saved=await pieceSaved();
              if(!saved)await page.waitForTimeout(100);
            }
            assert.equal(saved,true,'the piece commits to IndexedDB before the reload');
            await page.reload();await action(page,'start').click();
            await page.getByRole('button',{name:/2\. 뚜껑 연결/}).waitFor({timeout:8000});
            if(width===1280){
              await page.setViewportSize({width:375,height:812});
              await page.getByRole('button',{name:/2\. 뚜껑 연결/}).waitFor();
              await page.setViewportSize({width,height});
              await page.getByRole('button',{name:/2\. 뚜껑 연결/}).waitFor();
            }
            record(`${width}x${height} title, locked district, first piece, save and resume`,{readyMs,bytes:initial.bytes,external:[...external]});
          }else{
            await seed(page,fixture(kind==='rings'?2:5));await page.reload();await action(page,'start').click();
            if(kind==='rings'){
              await page.locator('[data-mission="view3d"]').click();
              const stage=page.locator('.view3d-stage');
              await stage.locator('canvas').waitFor({timeout:30000});
              await stage.locator('.view3d-loading').waitFor({state:'hidden',timeout:30000});
              const {data}=await sharp(await stage.screenshot()).resize(64,64).removeAlpha().raw().toBuffer({resolveWithObject:true}),colors=new Set();
              for(let i=0;i<data.length;i+=3)colors.add((data[i]>>4)<<8|(data[i+1]>>4)<<4|data[i+2]>>4);
              assert.ok(colors.size>20,'ring stage draws the model');
              await page.screenshot({path:`${out}/${width}-rings.png`});
              record(`${width}x${height} ring 3D`,{colors:colors.size});
            }else{
              await page.locator('.final-note-photos .idea-card').getByText('철 압정 구조대').waitFor();
              await page.locator('[data-review-answer="0"]').click();
              assert.equal(await page.locator('[data-review-next]').isEnabled(),false);
              await page.locator('[data-review-answer="1"]').click();await page.locator('[data-review-next]').click();
              await page.screenshot({path:`${out}/${width}-notebook.png`});
              await page.locator('[data-restoration="finish"]').click();
              await page.locator('[data-story="skip"]').click();await page.locator('[data-story="finish"]').click();
              await page.locator('#nickname').fill('과학 탐험가');
              assert.equal(await page.locator('#certificate-name').textContent(),'과학 탐험가');
              await page.pdf({path:`${out}/${width}-certificate.pdf`,format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true});
              record(`${width}x${height} invention notebook, festival and certificate`);
              if(width===1280){
                await page.evaluate(()=>new Promise((resolve,reject)=>{
                  const r=indexedDB.open('push-pull-city');r.onerror=()=>reject(r.error);
                  r.onsuccess=()=>{const db=r.result,tx=db.transaction(['saves','recordings'],'readwrite');
                    tx.objectStore('saves').put({version:1},'v1-backup');
                    tx.objectStore('recordings').put(new Blob(['test recording']),'old');
                    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
                  };
                }));
                await action(page,'settings').click();
                await page.locator('[data-settings-action="reset"]').click();
                await page.locator('[data-confirm="cancel"]').click();
                assert.equal(await page.locator('#nickname').inputValue(),'과학 탐험가');
                await page.locator('[data-settings-action="reset"]').click();
                await page.locator('[data-confirm="reset"]').click();
                await page.getByRole('button',{name:'시작하기',exact:true}).waitFor();
                const state=await page.evaluate(()=>new Promise((resolve,reject)=>{
                  const r=indexedDB.open('push-pull-city');r.onerror=()=>reject(r.error);
                  r.onsuccess=()=>{const db=r.result,tx=db.transaction(['saves','recordings']);
                    const keys=tx.objectStore('saves').getAllKeys(),rec=tx.objectStore('recordings').count(),main=tx.objectStore('saves').get('main');
                    tx.oncomplete=()=>{db.close();resolve({keys:keys.result,recordings:rec.result,nickname:main.result.settings.nickname,completed:main.result.completed});};
                    tx.onerror=()=>reject(tx.error);
                  };
                }));
                assert.deepEqual(state,{keys:['main'],recordings:0,nickname:'',completed:[]});
                record('confirmed reset clears nickname, progress, migrated backup and old recordings together');
              }
            }
          }
          assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);assert.deepEqual([...external],[]);
        }finally{await context.close();}
      }
    }
    const context=await browser.newContext();
    const page=await context.newPage();await page.goto(base);await action(page,'start').waitFor();
    await context.setOffline(true);
    let offline=false;
    try{await page.reload({timeout:5000});offline=await action(page,'start').isVisible();}catch{}
    results.push({name:'offline revisit',offline});await context.close();
  }finally{
    fs.writeFileSync(`${out}/smoke.json`,JSON.stringify({base,results},null,2));await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
