// Runs against a production URL through the normal UI, without source hooks or existing learner data.
// TEST_URL, TEST_OUT and CHROME_PATH select the target, external output and browser executable.
const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert/strict');
const base=process.env.TEST_URL||'http://127.0.0.1:4198/';
const out=process.env.TEST_OUT||'test-results/production-settings';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});
 const results=[],errors=[];
 try{
 for(const viewport of [{width:1280,height:800},{width:1024,height:768},{width:915,height:412}]){
  const context=await browser.newContext({viewport,hasTouch:true});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const toggle=async()=>{
   await page.locator('[data-action="settings"]').click();
   for(const label of ['교사용 가이드','교사용 도구']){
    const summary=page.locator('summary').filter({hasText:label});
    if(!await summary.evaluate(e=>e.parentElement.open))await summary.click();
   }
   await page.locator('[data-settings-action="autoplay"]').click();
   await page.screenshot({path:`${out}/teacher-${viewport.width}.png`});
   await page.locator('.settings-close-icon').click();
  };
  await page.goto(base);await page.locator('[data-action="start"]').waitFor();
  await toggle();await page.waitForTimeout(500);await page.reload();
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-story="skip"]').click();await page.locator('[data-story="finish"]').press('Enter');
  await page.locator('[data-action="walk-next"]').click();await page.locator('[data-action="enter"]').click();
  assert.equal(await page.locator('.experiment-autoplay').count(),0);
  await toggle();await page.locator('[data-autoplay-speed]').selectOption('2');
  await page.waitForTimeout(500);await page.reload();await page.locator('[data-action="start"]').click();
  assert.equal(await page.locator('[data-autoplay-speed]').inputValue(),'2');
  assert.equal(await page.locator('[data-action="sound"]').count(),0);
  await page.screenshot({path:`${out}/playback-${viewport.width}.png`});
  results.push({viewport,status:'pass',teacherOffReload:true,speed2Reload:true});
  console.log('PASS production settings '+viewport.width);await context.close();
 }
 assert.deepEqual(errors,[]);
 }catch(error){console.error(error);process.exitCode=1;results.push({status:'fail',message:error.stack});}
 finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,results,errors},null,2));await browser.close();}
})();
