// Local regression only: the navigation hook is never shipped.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.CHROME_CHANNEL||'chrome'});
 try{
  for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:820,height:540},{width:768,height:1024}]){
   const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+'\nwindow.__mapTest={go,get city(){return city},get save(){return s}};'});
   });
   await page.goto(process.env.TEST_URL||'http://127.0.0.1:5175/');
   await page.waitForFunction(()=>!!window.__mapTest);
   await page.evaluate(()=>window.__mapTest.go('city'));
   const pan=page.locator('[data-map-pan]'),overview=page.locator('[data-map-overview]'),world=page.locator('.expedition-world'),player=page.locator('.expedition-player');
   const transform=()=>world.evaluate(e=>getComputedStyle(e).transform);
   const settle=()=>page.waitForTimeout(120);
   await settle();
   for(const button of [pan,overview]){
    assert.equal((await button.textContent()).trim(),'');
    const r=await button.boundingBox();assert.ok(r.width>=44&&r.height>=44);
    assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);
   }
   await pan.focus();await page.keyboard.press('Enter');
   assert.equal(await pan.getAttribute('aria-pressed'),'true');
   const before=await transform(),position=await player.getAttribute('style');
   await page.mouse.move(viewport.width/2,viewport.height*.6);await page.mouse.down();await page.mouse.move(viewport.width/2+100,viewport.height*.6+70,{steps:8});await page.mouse.up();await settle();
   const panned=await transform();assert.notEqual(panned,before);assert.equal(await player.getAttribute('style'),position,'drag cannot walk');
   // Touch-pointer path, cancellation, and resumed pointer input.
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:viewport.width/2,y:viewport.height*.6}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:viewport.width/2+40,y:viewport.height*.6}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   await settle();assert.equal(await page.locator('.is-dragging').count(),0);
   const touchView=await transform();assert.notEqual(touchView,panned);
   await overview.focus();await page.keyboard.press('Space');await settle();
   assert.equal(await overview.getAttribute('aria-pressed'),'true');
   const wr=await world.boundingBox(),vr=await page.locator('.expedition-viewport').boundingBox();
   assert.ok(wr.x>=vr.x-.1&&wr.y>=vr.y-.1&&wr.x+wr.width<=vr.x+vr.width+.1&&wr.y+wr.height<=vr.y+vr.height+.1,'whole map fits');
   assert.equal(await page.locator('[data-place]').count(),6);
   await overview.click();await settle();assert.equal(await transform(),touchView,'overview restores panned camera');assert.equal(await pan.getAttribute('aria-pressed'),'true');
   await overview.click();await pan.click();await settle();assert.equal(await transform(),touchView,'hand exits overview without camera jump');
   await pan.click();assert.equal(await pan.getAttribute('aria-pressed'),'false');
   await overview.click();await page.locator('[data-place="0"]').click();await settle();
   assert.notEqual(await player.getAttribute('style'),position,'overview stage selection still walks');
   await page.evaluate(()=>window.__mapTest.city.pause(true));
   const paused=await transform();await pan.click();await overview.click();await settle();assert.equal(await transform(),paused,'paused map ignores controls');
   assert.deepEqual(errors,[]);
   console.log(`PASS ${viewport.width}x${viewport.height}: icon buttons, keyboard, mouse/touch pan, cancellation, fit/restore, stage selection, pause`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
