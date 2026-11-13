const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const out=process.env.TEST_OUT||'test-results/resume-20261110';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:768,height:1024}]){
 const context=await browser.newContext({viewport,hasTouch:true});const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/main.ts*',async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+'\nwindow.__review={go};'});});
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5185');await page.waitForFunction(()=>window.__review);await page.evaluate(()=>document.fonts.ready);
 const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 async function fonts(selector){const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});assert.ok(fonts.some(f=>f.postScriptName.startsWith('NanumSquareNeo')&&f.isCustomFont),JSON.stringify(fonts));return fonts;}
 const titleFonts=await fonts('[data-action="start"]');await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${viewport.width}-title.png`});
 await page.evaluate(()=>window.__review.go('city'));await page.locator('[data-map-overview]').click();await page.waitForTimeout(500);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`${out}/${viewport.width}-map.png`});assert.equal(await page.locator('.expedition-building').count(),6);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log('PASS font and layout',viewport,JSON.stringify({titleFonts}));await context.close();
 }
 const page=await browser.newPage();await page.goto(process.env.TEST_URL||'http://127.0.0.1:5185');
 await page.evaluate(async()=>{window.a=await import('/src/game-audio.ts');a.ensureAudio({music:true,effects:true});const button=document.createElement('button');button.id='qa-voice';button.textContent='음성 검사';button.style='position:fixed;top:0;left:0;z-index:999999';button.onclick=()=>a.playNarration('/audio/voices/resident-1-hello.mp3');document.body.append(button);});
 await page.locator('#qa-voice').click();await page.waitForFunction(()=>{const a=document.querySelector('[data-resident-voice]');return a&&!a.paused&&a.currentTime>0});
 await page.evaluate(()=>a.playNarration('/audio/voices/resident-1-hello.mp3'));await page.waitForTimeout(300);assert.equal(await page.locator('[data-resident-voice]').count(),1);
 await page.evaluate(()=>a.syncAudioSettings({music:false,effects:false}));assert.equal(await page.evaluate(()=>[...document.querySelectorAll('audio')].every(a=>a.paused)),true);console.log('PASS actual narration playback, replacement, mute all media');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
