// Runs against a production URL through the normal UI, without source hooks or existing learner data.
// TEST_URL, TEST_OUT and CHROME_PATH select the target, external output and browser executable.
// Since 2026-11-13 (d69e19f) the settings dialog has no experiment-autoplay switch and the activities have no
// autoplay panel; since 2026-11-19 the dialog has one Close button (bottom right). This checks the built site
// keeps both, that the dialog closes by button and by Esc, and that the first bench opens with its pictures.
const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert/strict');
const base=process.env.TEST_URL||'http://127.0.0.1:4198/';
const out=process.env.TEST_OUT||'test-results/production-settings';
fs.mkdirSync(out,{recursive:true});
const AUTOPLAY='.experiment-autoplay, [data-demo], [data-autoplay-speed], [data-figure-action="autoplay"], [data-action="visual-guide"]';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});
 const results=[],errors=[];
 try{
 for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:915,height:412}]){
  const context=await browser.newContext({viewport,hasTouch:true});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const settings=async()=>{
   await page.locator('[data-action="settings"]').click();
   const dialog=page.locator('dialog.game-settings[open]');await dialog.waitFor();
   assert.equal(await dialog.locator('[data-settings-action="autoplay"], [data-autoplay-speed]').count(),0,'no autoplay switch');
   const close=dialog.locator('[data-settings-action="close"]');
   assert.equal(await close.count(),1,'one close button');
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset.settingsAction),'close','close takes the first focus');
   return close;
  };
  await page.goto(base);await page.locator('[data-action="start"]').waitFor();
  await page.screenshot({path:`${out}/settings-${viewport.width}.png`});
  await (await settings()).click();assert.equal(await page.locator('dialog.game-settings[open]').count(),0);
  await settings();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog.game-settings[open]').count(),0);
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-story="skip"]').click();await page.locator('[data-story="finish"]').press('Enter');
  await page.locator('[data-action="walk-next"]').click();
  await page.locator('#experiment-root').waitFor();
  assert.equal(await page.locator(AUTOPLAY).count(),0,'first bench has no autoplay control');
  assert.equal(await page.locator('[data-action="sound"]').count(),0);
  await page.waitForFunction(()=>[...document.images]
    .filter(image=>image.getClientRects().length>0)
    .every(image=>image.complete&&image.naturalWidth>0));
  await page.screenshot({path:`${out}/bench-${viewport.width}.png`});
  results.push({viewport,status:'pass',noAutoplay:true,singleClose:true});
  console.log('PASS production settings '+viewport.width);await context.close();
 }
 assert.deepEqual(errors,[]);
 }catch(error){console.error(error);process.exitCode=1;results.push({status:'fail',message:error.stack});}
 finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,results,errors},null,2));await browser.close();}
})();
