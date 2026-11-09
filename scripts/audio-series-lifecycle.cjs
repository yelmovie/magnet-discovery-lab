// Audio-module integration smoke for projects 5–8. Uses real Chromium media playback.
const verificationDir=require('node:path').resolve(__dirname,'../.tmp/audio-verification');
require('node:fs').mkdirSync(verificationDir,{recursive:true});
process.env.TMPDIR=verificationDir;process.env.XDG_CACHE_HOME=require('node:path').join(verificationDir,'cache');
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'../..');
const projects=['5magnet','6 waterchange','7 earthchange','8 creatures'];
(async()=>{
 const servers=[];let browser;
 try{
  for(let i=0;i<4;i++){
   const args=i===0||i===3?['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(5485+i),'--strictPort']:['scripts/serve.mjs'];
   servers.push(spawn(process.execPath,args,{cwd:root+'/'+projects[i],env:{...process.env,PORT:String(5485+i)},stdio:'inherit'}));
  }
  for(let i=0;i<4;i++){
   const url='http://127.0.0.1:'+(5485+i)+'/src/'+['game-audio.ts','sound.js','sound.js','audio.ts'][i];
   let ready=false;
   for(let attempt=0;attempt<120;attempt++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
   assert.ok(ready,'server did not become ready: '+projects[i]);
  }
  browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  for(let i=0;i<4;i++){
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:'<!doctype html><body><button id="play">Listen</button><dialog id="dialog"></dialog></body>'}):route.continue());
   await page.addInitScript(()=>{window.clips=[];const OriginalAudio=window.Audio;window.Audio=class extends OriginalAudio{constructor(...args){super(...args);window.clips.push(this);}};});
   await page.goto('http://127.0.0.1:'+(5485+i)+'/');
   await page.evaluate(async i=>{
    const module=['game-audio.ts','sound.js','sound.js','audio.ts'][i];window.audio=await import('/src/'+module);const a=window.audio;
    if(i===0){a.ensureAudio({music:false,effects:true});document.querySelector('#play').onclick=()=>{a.playEffect('snap');a.playNarration('/audio/voices/resident-1-hello.mp3');};}
    if(i===1){window.state=(await import('/src/state.js')).state;Object.assign(window.state.settings,{sound:true,sfx:true,bgm:false});a.setSoundSettings(window.state.settings);const npc=await import('/src/npc-voice.js');const recordings=(await import('/src/npc-audio.js')).npcAudio;document.querySelector('#play').onclick=()=>{document.querySelector('dialog').showModal();npc.attachNpcVoice(document.querySelector('dialog'),Object.keys(recordings)[0]);};}
    if(i===2){a.setSoundEnabled(true);a.setEffectsVolume(100);a.setVoiceVolume(100);document.querySelector('#play').onclick=()=>{a.playSound('water',{force:true});a.playVoice('river-hello.m4a');};}
    if(i===3){a.syncAudio({sound:true,bgm:false});document.querySelector('#play').onclick=()=>{a.playEffect('pipette-drop');a.playNarration('M1');};}
   },i);
   await page.click('#play');await page.waitForFunction(i=>{const clip=i===0?document.querySelector('[data-resident-voice]'):i===1?document.querySelector('audio'):window.clips.find(c=>c.src.includes(i===2?'/voices/':'/npc/'));return clip&&!clip.paused&&clip.currentTime>0;},i,{timeout:10000});
   const result=await page.evaluate(async i=>{
    const a=window.audio;const clip=i===0?document.querySelector('[data-resident-voice]'):i===1?document.querySelector('audio'):window.clips.find(c=>c.src.includes(i===2?'/voices/':'/npc/'));
    const started=!!clip&&!clip.paused&&clip.currentTime>0;const source=clip?.src;const mediaError=clip?.error?.message||null;
    if(i===0)a.syncAudioSettings({music:false,effects:false});if(i===1){window.state.settings.sound=false;a.setSoundSettings(window.state.settings);}if(i===2)a.setSoundEnabled(false);if(i===3)a.syncAudio({sound:false,bgm:false});
    const stopped=clip?.paused;await new Promise(r=>setTimeout(r,100));
    return {started,stopped,source,mediaError};
   },i);
   console.log(projects[i],JSON.stringify({...result,errors}));assert.equal(result.started,true);assert.equal(result.stopped,true);assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser?.close();servers.forEach(s=>s.kill());}
})().catch(e=>{console.error(e);process.exitCode=1;});
