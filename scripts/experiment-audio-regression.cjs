// Run against the local Vite dev server using TEST_URL and, optionally, CHROME_PATH.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { assembleMailbox } = require('./browser-mailbox.cjs');
const url = process.env.TEST_URL || 'http://127.0.0.1:5173/';
const expected = ['snap', 'lid', 'pad', 'crate'];

async function run() {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),
  });
  try {
    const page = await browser.newPage({viewport:{width:1057,height:871}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.routeWebSocket('**', socket => socket.close());
    // Identify the actual MP3 that reaches a Web Audio source node, including cache hits.
    await page.addInitScript(() => {
      const raw = new WeakMap(), decoded = new WeakMap();
      const watch = window.__sounds = {decoded:[], played:[], oscillatorStarts:0};
      const arrayBuffer = Response.prototype.arrayBuffer;
      Response.prototype.arrayBuffer = async function () {
        const bytes = await arrayBuffer.call(this);
        const match = this.url.match(/\/audio\/([^/]+)\.mp3$/);
        if(match)raw.set(bytes,match[1]);
        return bytes;
      };
      const decode = AudioContext.prototype.decodeAudioData;
      AudioContext.prototype.decodeAudioData = async function (data) {
        const buffer = await decode.call(this,data), name = raw.get(data);
        if(name){decoded.set(buffer,name);watch.decoded.push(name);}
        return buffer;
      };
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        watch.played.push(decoded.get(this.buffer));return start.apply(this,args);
      };
      const oscillate = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...args) {
        watch.oscillatorStarts++;return oscillate.apply(this,args);
      };
    });
    // This test uses an isolated context and only adds navigation. All actions run on the real bench.
    await page.route('**/src/main.ts*', async route => {
      const headers={...route.request().headers()};delete headers['if-none-match'];delete headers['if-modified-since'];
      const response = await route.fetch({headers});assert.equal(response.status(),200);
      const hook = '\nwindow.__soundLab={open(n){screen=n;s.activities[n]=emptyActivity();go("activity",false)},get save(){return s}};';
      await route.fulfill({response, body:(await response.text())+hook});
    });
    await page.goto(url);
    await page.waitForFunction(() => window.__soundLab && document.querySelector('[data-action="start"]'),null,{timeout:15000})
      .catch(error=>{throw new Error([error.message,...errors].join('\n'));});
    const open = n => page.evaluate(n => window.__soundLab.open(n),n);
    const lid = page.locator('[data-drag="lid"]');
    const moveLid = y => lid.evaluate((el,y) =>
      el.dispatchEvent(new CustomEvent('piece-place',{detail:{x:44,y}})),y);
    async function useLid() {
      await assembleMailbox(page);
      await page.locator('[data-prompt-choice="stick"]').click();
      await lid.click();await moveLid(38);await moveLid(60);
      await page.waitForFunction(() => window.__soundLab.save.activities[1].values.latch0);
    }
    await open(1);await useLid();
    await page.waitForFunction(names => names.every(n => window.__sounds.decoded.includes(n)),expected);
    for(const [stage,name] of [[7,'pad'],[8,'crate']]){
      await open(stage);
      await page.locator('[data-demo="toggle"]').click();
      await page.waitForFunction(name => window.__sounds.played.includes(name),name,{timeout:60000});
      await page.locator('[data-demo="stop"]').click();
    }
    const played = await page.evaluate(() => window.__sounds.played);
    for(const name of expected)assert.ok(played.includes(name),'played '+name);
    await page.locator('[data-action="settings"]').click();
    await page.locator('[data-sound="effects"]').click();
    assert.equal(await page.locator('[data-sound="effects"]').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('[data-sound="music"]').getAttribute('aria-pressed'),'true');
    await page.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).first().click();
    const counters = () => page.evaluate(() => [window.__sounds.played.length, window.__sounds.oscillatorStarts]);
    const muted = await counters();
    await open(1);await useLid();
    assert.deepEqual(await counters(),muted,'muted physical interactions start no samples or fallback tones');
    assert.deepEqual(errors,[]);
    console.log('PASS four physical samples decoded and played; effects muted independently of music.');
  } finally { await browser.close(); }
}
run().catch(error => {console.error(error);process.exitCode=1;});
