// Responsive layout audit (read-only). Puts every page/state on screen at 12 viewports and measures:
// page overflow (scrollable or cut), interactive elements off-screen/clipped/covered, overlapping controls,
// clipped/off-screen text, tap targets < 44px and console errors. Writes results.json, summary.md, shots/.
// States are built by a hook appended to src/main.ts (window.__lab) in a fresh browser context; no real
// learner data is read or written. Needs a running dev server (vite) and Chrome (story films are H.264).
// Usage: node scripts/layout-audit.cjs [baseUrl=http://127.0.0.1:4197] [--out dir] [--only page|state-prefix] [--sizes 1280x800,1100x800 (any WxH list instead of the default 12)]
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const {assembleMailbox}=require('./browser-mailbox.cjs');
const argv=process.argv.slice(2),opt=k=>{const i=argv.indexOf(k);return i<0?undefined:argv.splice(i,2)[1];};
const out=opt('--out')||'test-results/layout-audit',only=opt('--only'),sizesArg=opt('--sizes');
const base=(argv[0]||'http://127.0.0.1:4197').replace(/\/?$/,'/');
const SIZES=[[1920,1080],[1440,900],[1366,768],[1280,800],[1024,768],[906,755],[873,580],[812,375],[375,812],[1024,640,'125%'],[853,533,'150%'],[640,400,'200%']]
 .map(([w,h,z])=>({w,h,id:`${w}x${h}`+(z?`@${z}`:'')})).filter(()=>!sizesArg).concat((sizesArg||"").split(",").filter(Boolean).map(x=>{const [w,h]=x.split("x").map(Number);return {w,h,id:x};}));
const SHOT=['1280x800','1024x768','853x533@150%'];
const CTA='.quest-cta, .mission-cta, .primary, [data-story=finish], .expedition-next, [data-act=next], [data-review-next], [data-restoration=finish]';
const REQUIRED=`${CTA}, [data-drag], [data-mission], [data-inquiry], [data-inquiry-group], [data-story], .modal-close, [data-settings-action=close], [role=tab], [data-place], .quest-hud button`;

// ---- page hook: expose module-scope state and functions of main.ts ----
const FNS=['showPlace','showReward','notebook','openConcept','openRecords','openSettings','openFilm'];
const HOOK=`\nwindow.__lab={get save(){return s},set save(v){s=v},get screen(){return screen},startActivity,go,flush,
fn:{${FNS.map(n=>`${n}:typeof ${n}==='function'?${n}:null`).join(',')}},
show(p,n){if(n)screen=n;page=p;currentRoute={page,screen};render();},
reset(){for(const f of [()=>modalCleanup&&modalCleanup(),()=>cleanPage(),()=>{practiceBackup=null;adminBackup=null;backStack.length=0;}])try{f();}catch{}
 document.querySelectorAll('.story-layer,.modal-backdrop,.toast,.quest-save-warning,dialog').forEach(e=>{try{e.close&&e.close();}catch{}e.remove();});app.inert=false;},
quiet(){try{clearTimeout(saveTimer);saveTimer=0;saveMessage='';saveView();}catch{}}};`;

// ---- states ----
const trial=(n,key,objects)=>({id:`${n}:${key}`,key,activity:n,modelVersion:1,conditions:{gap:key==='far'?36:12,paper:key==='paper'},
 initialObjects:objects?[{id:objects[0],x:25,y:55},{id:objects[1],x:61,y:55}]:[],objects:objects?[{id:objects[0],x:49,y:55},{id:objects[1],x:55,y:55}]:[],
 input:objects?[{x:25,y:55},{x:49,y:55}]:[],outcome:'success',template:'box',designRevision:0});
const reflection=n=>({values:{inquiryPhase:'explain',with0:true,without0:true,segment0:true,segment1:true},
 trials:{2:['repair0'],4:['far','near','paper'],6:['float2','join2'],8:['stop0','stop1','delivery0','delivery1'],10:['use0']}[n].map(k=>trial(n,k))});
const click=sel=>async p=>{await p.locator(sel).first().evaluate(e=>e.click(),null,{timeout:4000});};
const call=(fn,...args)=>async p=>{await p.evaluate(([fn,args])=>window.__lab.fn[fn](...args),[fn,args]);};
const film=t=>async p=>{
 // Let autoplay actually start first: pausing a pending play() rejects it and the film shows its play button.
 await p.waitForFunction(()=>{const v=document.querySelector('.story-layer video');return v&&(v.currentTime>0.1&&!v.paused||v.error);},null,{timeout:8000}).catch(()=>{});
 await p.evaluate(async t=>{const v=document.querySelector('.story-layer video');if(!v||v.readyState<1)return;v.pause();v.currentTime=t;
  await new Promise(r=>{v.addEventListener('seeked',r,{once:true});setTimeout(r,2500);});v.pause();v.dispatchEvent(new Event('timeupdate'));},t);
 await p.waitForTimeout(700);
};
const intro=async p=>{await p.evaluate(()=>window.__lab.fn.openFilm('intro',()=>{}));};
const notebook=async p=>{const b=p.locator('[data-action=notebook]');if(await b.count())await b.first().evaluate(e=>e.click());else await call('notebook')(p);};
const invention={problem:'pins',properties:['iron'],name:'철 압정 구조대',pitch:'막대 끝의 자석이 책장 아래 떨어진 철 압정을 끌어당겨.',
 stickers:[{uid:0,id:'magnet',pole:'N',x:55,y:45},{uid:1,id:'iron',x:90,y:45}],shown:true};
const done5={evidence:5,completed:10};
const core={name:'core',page:'core',...done5,idea:invention,final:{report:true}};
const act=(n,extra={})=>({page:'activity',n,completed:10,...extra});
const STATES=[
 {name:'title',page:'title',started:false},
 {name:'title-continue',page:'title'},
 {name:'film-intro-mid',page:'title',after:[intro,film(6)]},
 {name:'film-intro-card',page:'title',after:[intro,film(6),click('[data-story=skip]')]},
 {name:'city',page:'city',evidence:2},
 {name:'city-overview',page:'city',evidence:2,map:true,after:[click('[data-map-overview]')]},
 {name:'city-entrance',page:'city',evidence:2,after:[call('showPlace',2)]},
 {name:'city-reward',page:'city',...done5,after:[call('showReward',4,true)]},
 {name:'city-notebook',page:'city',...done5,after:[notebook]},
 {name:'city-concept',page:'city',evidence:2,after:[call('openConcept',1)]},
 {name:'city-settings',page:'city',evidence:2,after:[click('[data-action=settings]'),click('.settings-fold > summary')]},
 ...Array.from({length:10},(_,i)=>({name:`act${i+1}`,...act(i+1)})),
 {name:'act1-open',...act(1),after:[assembleMailbox]},
 {name:'act2-reflection',...act(2,reflection(2))},
 {name:'act4-paper',...act(4,{values:{round:2},points:{'distance-magnet':{x:49,y:55}}})},
 {name:'act5-stickers',...act(5,{values:{test0N:true,test0S:true},points:{probe:{x:48,y:53}}})},
 {name:'act5-hint',...act(5),after:[click('.coach-toggle')]},
 {name:'act5-question',...act(5),after:[click('.play-question summary')]},
 {name:'act5-visual-guide',...act(5),after:[click('[data-action=visual-guide]')]},
 {name:'act5-records',...act(5,{values:{test0N:true},trials:[trial(5,'test0N',['probe','unknown-magnet']),trial(5,'test0S',['probe','unknown-magnet'])]}),after:[call('openRecords')]},
 {name:'act6-placed',...act(6,{points:{ring0:{x:68,y:71},ring1:{x:68,y:56}}})},
 {name:'act6-reflection',...act(6,reflection(6))},
 {name:'act8-end',...act(8,{values:{car:73,controlled0:46},points:{controller:{x:82,y:59}}})},
 {name:'act9-example',...act(9,{idea:{problem:'pins'}}),after:[click('[data-resident-example]')]},
 {name:'act9-properties',...act(9,{idea:{problem:'pins',step9:1}})},
 {name:'act9-sketch',...act(9,{idea:{...invention,step9:2}})},
 {name:'act10-showcase',...act(10,{idea:{...invention,step10:1}})},
 {name:'act10-present',...act(10,{idea:{...invention,step10:1}}),after:[click('[data-act=present]')]},
 {name:'act10-feedback',...act(10,{idea:{...invention,step10:2}})},
 {name:'report',page:'report',...done5},
 core,
 { ...core,name:'core-invention',final:{report:true,review:{version:1,page:4,answers:[1,0,2,0,-1]}}},
 { ...core,name:'core-summary',final:{report:true,review:{version:1,page:5,answers:[1,0,2,0,1]}}},
 {name:'ending-film-mid',page:'ending',...done5,final:{report:true,complete:true,date:'2026-11-01T00:00:00.000Z'},after:[film(8.7)]},
 {name:'ending-card',page:'ending',...done5,final:{report:true,complete:true,date:'2026-11-01T00:00:00.000Z'},after:[film(8.7),click('[data-story=skip]')]},
 {name:'certificate',page:'certificate',...done5,final:{report:true,complete:true,date:'2026-11-01T00:00:00.000Z'},settings:{nickname:'김하늘 탐험가',ability:0}},
].filter(s=>!only||s.page===only||s.name.startsWith(only));

async function setState(p,st){
 await p.evaluate(async st=>{
  const L=window.__lab,d=await import('/src/domain.ts');L.reset();
  const s=d.freshSave();s.started=st.started??true;Object.assign(s.settings,{sound:false,music:false,effects:false},st.settings||{});
  const trial=n=>({id:`${n}:demo`,key:'demo',activity:n,modelVersion:1,conditions:{gap:12,paper:false},initialObjects:[{id:'distance-magnet',x:25,y:55},{id:'clip',x:61,y:55}],objects:[{id:'distance-magnet',x:49,y:55},{id:'clip',x:55,y:55}],input:[{x:25,y:55},{x:49,y:55}],outcome:'success',template:'box',designRevision:0});
  const act=n=>({...d.emptyActivity(),records:[{key:'r1',label:'관찰한 물체',result:'철 클립이 자석 쪽으로 끌려왔어'},{key:'r2',label:'비교한 조건',result:'거리를 가깝게 했을 때만 움직였어'}],trials:[trial(n)]});
  for(let i=0;i<(st.evidence||0);i++){const A=act(i*2+1),B=act(i*2+2);s.evidence.push({stage:i,date:new Date().toISOString(),activities:[A,B],summary:[...A.records,...B.records].map(r=>`${r.label}: ${r.result}`)});}
  s.completed=Array.from({length:st.completed??(st.evidence||0)*2},(_,i)=>i+1);
  s.design={template:st.template||'box',pair:'iron',pole:'N',gap:28,aligned:true,revision:0};
  s.activities[9]={...d.emptyActivity(),points:{'design-magnet':{x:43,y:55},'design-target':{x:57,y:55}}};
  if(st.idea){const {emptyIdea}=await import('/src/idea-model.ts');s.idea={...emptyIdea(),...st.idea};}
  if(st.idea&&st.page==='core')s.activities[10]={...d.emptyActivity(),values:{ideaVersion:1}};
  Object.assign(s.final,st.final||{});
  if(st.n){const a=s.activities[st.n]=d.emptyActivity();a.values={playVersion:4,mechanicsVersion:1,paceVersion:1,inquiryVersion:2,inquiryActivity:st.n,inquiryPhase:'experiment',...st.values};a.points=st.points||{};a.trials=st.trials||[];}
  L.save=s;L.show(st.page,st.n);L.quiet();scrollTo(0,0);
 },{...st,after:undefined});
 for(const step of st.after||[])await step(p);
 await p.evaluate(async()=>{
  await document.fonts.ready;const wait=(ps,ms)=>Promise.race([Promise.all(ps),new Promise(r=>setTimeout(r,ms))]);
  await wait([...document.images].filter(i=>!i.complete&&i.loading!=='lazy').map(i=>new Promise(r=>{i.onload=i.onerror=r;})),1500);
  await wait(document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})),1500);
  window.__lab.quiet();
 });
 await p.waitForTimeout(120);
}

// ---- in-page measurement ----
function measure({map,CTA,REQUIRED}){
 const W=innerWidth,H=innerHeight,de=document.documentElement,body=document.body,cs=e=>getComputedStyle(e);
 const HID=v=>v==='hidden'||v==='clip',SCR=v=>v==='auto'||v==='scroll';
 const sel=e=>{let s=e.tagName.toLowerCase()+(e.id?'#'+e.id:'');const c=[...e.classList].slice(0,3);if(c.length)s+='.'+c.join('.');
  for(const a of ['data-action','data-mission','data-drag','data-story','data-inquiry','data-inquiry-group','data-settings-action','data-place','data-concept','role'])if(e.hasAttribute(a)){s+=`[${a}=${e.getAttribute(a)}]`;break;}return s;};
 const label=e=>(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,28);
 const box=r=>[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];
 // Page level: viewport scroll (body overflow propagates when html is visible) and any big inner scroller.
 const hs=cs(de),bs=cs(body),vx=hs.overflowX==='visible'?bs.overflowX:hs.overflowX,vy=hs.overflowY==='visible'?bs.overflowY:hs.overflowY;
 const pageInfo={sw:de.scrollWidth,sh:de.scrollHeight,overX:de.scrollWidth-W,overY:de.scrollHeight-H};
 pageInfo.canX=pageInfo.overX>1&&!HID(vx);pageInfo.canY=pageInfo.overY>1&&!HID(vy);
 pageInfo.inner=[...document.querySelectorAll('#app *')].filter(e=>{const st=cs(e),r=e.getBoundingClientRect();return (SCR(st.overflowY)&&e.scrollHeight>e.clientHeight+1||SCR(st.overflowX)&&e.scrollWidth>e.clientWidth+1)&&r.width*r.height>=.6*W*H&&e.checkVisibility();})
  .map(e=>({sel:sel(e),over:e.scrollHeight-e.clientHeight,overX:e.scrollWidth-e.clientWidth}));
 // Active layer: top-most open dialog / film / modal backdrop, else the page.
 const top=[...document.querySelectorAll('dialog[open], .story-layer, .modal-backdrop')].filter(e=>e.checkVisibility()).at(-1),scope=top||body;
 const skip=e=>e.closest('[inert]')||(!map&&e.closest('.expedition-world'))||e.closest('.sr-only, .canvas-hit:disabled');
 const visible=e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
 // Reachability: walk the containing chain; overflow hidden/clip clips, auto/scroll lets it scroll into view,
 // absolute/fixed boxes escape non-positioned / all ancestors. Then compare with the viewport.
 function reach(node,r,isText){
  let x0=r.left,x1=r.right,y0=r.top,y1=r.bottom,esc=null,fixed=false,a=node;
  if(!isText){const p=cs(node).position;if(p==='absolute')esc='abs';if(p==='fixed'){esc='fixed';fixed=true;}a=node.parentElement;}
  for(;a&&a!==de;a=a.parentElement){
   const st=cs(a),positioned=st.position!=='static'||st.transform!=='none';
   if((esc===null||esc==='abs'&&positioned||esc==='fixed'&&st.transform!=='none')&&!(a===body&&hs.overflowX==='visible')){
    const ar=a.getBoundingClientRect();
    if(HID(st.overflowX)&&(x0<ar.left-2||x1>ar.right+2))return {s:'clipped',by:sel(a),cut:Math.round(Math.max(ar.left-x0,x1-ar.right))};
    if(HID(st.overflowY)&&(y0<ar.top-2||y1>ar.bottom+2))return {s:'clipped',by:sel(a),cut:Math.round(Math.max(ar.top-y0,y1-ar.bottom))};
    if(SCR(st.overflowX)&&a.scrollWidth>a.clientWidth+1&&(x0<ar.left||x1>ar.right)){const w=Math.min(x1-x0,ar.width);x0=ar.left;x1=ar.left+w;}
    if(SCR(st.overflowY)&&a.scrollHeight>a.clientHeight+1&&(y0<ar.top||y1>ar.bottom)){const h=Math.min(y1-y0,ar.height);y0=ar.top;y1=ar.top+h;}
    if(esc&&(esc==='abs'?positioned:st.transform!=='none'))esc=null;
   }
   if(st.position==='absolute'&&esc===null)esc='abs';
   if(st.position==='fixed'){esc='fixed';fixed=true;}
  }
  const offX=x0<-1||x1>W+1,offY=y0<-1||y1>H+1;
  if(!offX&&!offY)return {s:'ok'};
  if(!fixed&&x0>=-1&&y0>=-1&&(!offX||pageInfo.canX)&&(!offY||pageInfo.canY))return {s:'scroll'};
  return {s:'offscreen',cut:Math.round(Math.max(-x0,x1-W,-y0,y1-H))};
 }
 const els=[...scope.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary, [data-drag], [role=tab]')]
  .filter(e=>!skip(e)&&visible(e)&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
 const res={doc:pageInfo,unreach:[],scrollNeeded:[],overlaps:[],covered:[],textClip:[],textOff:[],small:[],modal:null,controls:els.length};
 // Visible part of a box after scroll/clip ancestors; content passing under a sticky bar while scrolling is not a defect.
 const vis=e=>{const r=e.getBoundingClientRect();let [l,t,rr,b]=[r.left,r.top,r.right,r.bottom];for(let a=e.parentElement;a&&a!==body;a=a.parentElement){const st=cs(a);if(st.position==='fixed')break;if(st.overflowX!=='visible'||st.overflowY!=='visible'){const q=a.getBoundingClientRect();l=Math.max(l,q.left);t=Math.max(t,q.top);rr=Math.min(rr,q.right);b=Math.min(b,q.bottom);}}return {left:l,top:t,right:rr,bottom:b,width:rr-l,height:b-t};};
 const sticky=e=>{for(let a=e;a&&a!==body;a=a.parentElement)if(cs(a).position==='sticky')return true;return false;};
 for(const e of els){
  const r=e.getBoundingClientRect(),q=reach(e,r,false),info={sel:sel(e),label:label(e),cta:e.matches(CTA),req:e.matches(REQUIRED),disabled:!!e.disabled,box:box(r)};
  if(q.s==='clipped'||q.s==='offscreen')res.unreach.push({...info,how:q.s,by:q.by,cut:q.cut});
  else if(q.s==='scroll')res.scrollNeeded.push(info);
  if(!e.disabled&&(r.width<44||r.height<44))res.small.push({sel:info.sel,label:info.label,w:Math.round(r.width),h:Math.round(r.height)});
  const v=vis(e);
  if(q.s==='ok'&&v.width>4&&v.height>4){let blocked=0,by='';for(const [fx,fy] of [[.5,.5],[.2,.5],[.8,.5],[.5,.2],[.5,.8]]){const t=document.elementFromPoint(v.left+v.width*fx,v.top+v.height*fy);if(t&&t!==e&&!e.contains(t)&&!t.contains(e)&&!(t.tagName==='CANVAS'&&e.matches('.canvas-hit'))&&sticky(t)===sticky(e)){blocked++;by=sel(t.closest('button,summary,[data-drag]')||t);}}
   if(blocked>=3)res.covered.push({...info,by});}
 }
 for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
  const a=els[i],b=els[j];if(a.contains(b)||b.contains(a)||sticky(a)!==sticky(b))continue;
  const p=vis(a),q=vis(b),ox=Math.min(p.right,q.right)-Math.max(p.left,q.left),oy=Math.min(p.bottom,q.bottom)-Math.max(p.top,q.top);
  if(ox>4&&oy>4)res.overlaps.push({a:sel(a),b:sel(b),al:label(a),bl:label(b),ox:Math.round(ox),oy:Math.round(oy),cta:a.matches(CTA)||b.matches(CTA),pieces:a.matches('[data-drag]')&&b.matches('[data-drag]')});
 }
 const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent.trim()&&n.parentElement&&!skip(n.parentElement)?1:2});
 for(let n;(n=walker.nextNode());){
  const pe=n.parentElement;if(!visible(pe)||cs(pe).clipPath==='inset(50%)')continue;const rg=document.createRange();rg.selectNodeContents(n);const r=rg.getBoundingClientRect();if(!r.width||!r.height)continue;
  const q=reach(pe,r,true),t=n.textContent.trim().replace(/\s+/g,' ').slice(0,24);
  if(q.s==='clipped'&&q.cut>2)res.textClip.push({sel:sel(pe),by:q.by,cut:q.cut,text:t});
  if(q.s==='offscreen')res.textOff.push({sel:sel(pe),cut:q.cut,text:t});
 }
 if(top){const m=top.matches('.modal-backdrop')?top.querySelector('.modal')||top:top,r=m.getBoundingClientRect();
  const scroller=[m,...m.querySelectorAll('*')].find(x=>SCR(cs(x).overflowY)&&x.scrollHeight>x.clientHeight+1);
  const backdropScroll=top!==m&&SCR(cs(top).overflowY)&&top.scrollHeight>top.clientHeight+1;
  res.modal={sel:sel(m),box:box(r),outside:Math.round(Math.max(r.bottom-H,-r.top,r.right-W,-r.left)),scroller:scroller?sel(scroller):backdropScroll?sel(top):null};}
 const v=document.querySelector('.story-layer video');if(v)res.film={t:+v.currentTime.toFixed(1),ready:v.readyState,error:!!v.error,card:!document.querySelector('.story-card')?.hidden,playButton:!document.querySelector('[data-story=play]')?.hidden};
 res.dragMin=els.filter(e=>e.matches('[data-drag]:not(:disabled)')).reduce((min,e)=>{
  const r=e.getBoundingClientRect();return Math.min(min,r.width,r.height);
 },Infinity);
 const reading='h1, .quiz-question h2, .play-discovery .inquiry-option, .inquiry-feedback, .final-answer, .final-answer-feedback, .town-news p, .idea-buddy p, .idea-choice strong, .idea-resident-bubble p';
 res.reading=[...scope.querySelectorAll(reading)].filter(e=>!skip(e)&&visible(e)).map(e=>({sel:sel(e),px:Number.parseFloat(cs(e).fontSize)}));
 res.small.sort((a,b)=>Math.min(a.w,a.h)-Math.min(b.w,b.h));res.smallCount=res.small.length;res.small=res.small.slice(0,5);
 return res;
}

// ---- classification ----
function classify(m,vp,errors){
 const big=vp.w>=1024&&vp.h>=640,issues=[],add=(p,code,detail)=>issues.push({p,code,detail});
 for(const u of m.unreach)add(u.cta||u.req?0:1,(u.cta?'CTA-':'')+(u.how==='clipped'?'CLIPPED':'OFFSCREEN'),`${u.sel} "${u.label}" ${u.how}${u.by?' by '+u.by:''} ${u.cut}px box=${u.box}`);
 if(m.modal&&m.modal.outside>1&&!m.modal.scroller)add(0,'MODAL-TALL',`${m.modal.sel} exceeds viewport by ${m.modal.outside}px, no scroll box=${m.modal.box}`);
 if(m.modal&&m.modal.scroller&&big)add(2,'MODAL-SCROLL',`${m.modal.sel} needs inner scroll (${m.modal.scroller})`);
 if(m.doc.canX)add(1,'H-SCROLL',`page scrollWidth ${m.doc.sw} > ${vp.w}`);
 if(m.doc.canY)add(big?1:2,'V-SCROLL',`page scrollHeight ${m.doc.sh} > ${vp.h}`);
 if(m.doc.overY>1&&!m.doc.canY)add(2,'PAGE-CUT-Y',`document ${m.doc.sh} > ${vp.h} but not scrollable`);
 if(m.doc.overX>1&&!m.doc.canX)add(2,'PAGE-CUT-X',`document ${m.doc.sw} > ${vp.w} but not scrollable`);
 if(!m.modal)for(const s of m.doc.inner)add(big?1:2,'INNER-SCROLL',`${s.sel} scrolls ${s.over}px${s.overX>1?` / x ${s.overX}px`:''}`);
 for(const o of m.overlaps)add(o.pieces?2:1,o.pieces?'PIECE-OVERLAP':'OVERLAP',`${o.a} "${o.al}" x ${o.b} "${o.bl}" ${o.ox}x${o.oy}px`); // pieces may rest on each other by design
 for(const c of m.covered)add(c.cta||c.req?0:1,(c.cta?'CTA-':'')+'COVERED',`${c.sel} "${c.label}" under ${c.by}`);
 for(const t of m.textClip)add(t.cut>8?1:2,'TEXT-CLIP',`${t.sel} "${t.text}" cut ${t.cut}px by ${t.by}`);
 for(const t of m.textOff)add(1,'TEXT-OFF',`${t.sel} "${t.text}" ${t.cut}px outside viewport`);
 if(m.smallCount)add(2,'SMALL-TAP',`${m.smallCount} targets < 44px: ${m.small.map(s=>`${s.sel} ${s.w}x${s.h}`).join(', ')}`);
 for(const e of errors)add(1,'CONSOLE',e.slice(0,200));
 return issues.sort((a,b)=>a.p-b.p);
}

(async()=>{
 fs.mkdirSync(path.join(out,'shots'),{recursive:true});
 const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(chrome)?chrome:undefined,args:['--autoplay-policy=no-user-gesture-required','--mute-audio']});
 const rows=[],queue=[...SIZES];
 try{
  // Viewports run in parallel (one context each); states run in order inside a viewport.
  await Promise.all(Array.from({length:Number(process.env.AUDIT_JOBS||4)},async()=>{for(let vp;(vp=queue.shift());){
   const context=await browser.newContext({viewport:{width:vp.w,height:vp.h},hasTouch:true});
   const p=await context.newPage();let errors=[];
   await p.routeWebSocket('**',socket=>socket.close());
   p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('pageerror',e=>errors.push('pageerror: '+e.message));p.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
   await p.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+HOOK});});
   await p.goto(base);await p.waitForFunction(()=>window.__lab&&document.querySelector('[data-action="start"]'),null,{timeout:30000});
   for(const st of STATES){
    errors=[];const row={state:st.name,page:st.page,vp:vp.id};
    try{await setState(p,st);Object.assign(row,await p.evaluate(measure,{map:!!st.map,CTA,REQUIRED}));}
    catch(e){errors.push('audit: '+e.message.split('\n')[0]);}
    row.issues=classify(row.unreach?row:{doc:{inner:[]},unreach:[],overlaps:[],covered:[],textClip:[],textOff:[],small:[]},vp,errors);row.errors=errors;
    if(SHOT.includes(vp.id)||row.issues.some(i=>i.p<2)){row.shot=`shots/${vp.id.replace('%','')}-${st.name}.png`;await p.screenshot({path:path.join(out,row.shot)}).catch(()=>{delete row.shot;});}
    rows.push(row);
    console.log(`${vp.id.padEnd(14)} ${st.name.padEnd(18)} ${row.issues.length?row.issues.map(i=>`P${i.p}:${i.code}`).filter((x,i,a)=>a.indexOf(x)===i).join(' '):'OK'}`);
   }
   await context.close();
  }}));
 }finally{
  await browser.close();
  rows.sort((a,b)=>SIZES.findIndex(s=>s.id===a.vp)-SIZES.findIndex(s=>s.id===b.vp)||STATES.findIndex(s=>s.name===a.state)-STATES.findIndex(s=>s.name===b.state));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({base,date:new Date().toISOString(),sizes:SIZES.map(s=>s.id),rows},null,1));
  fs.writeFileSync(path.join(out,'summary.md'),summary(rows));
  console.log(`\nwrote ${path.join(out,'results.json')} and summary.md (${rows.length} measurements)`);
 }
})();

function summary(rows){
 const states=[...new Set(rows.map(r=>r.state))],sizes=[...new Set(rows.map(r=>r.vp))];
 const cell=r=>{if(!r)return '';const c=[...new Set(r.issues.filter(i=>i.p<2||i.code!=='SMALL-TAP').map(i=>`${i.code}${i.p<2?'':'·'}`))];return c.length?c.join(' '):'OK';};
 let md=`# Layout audit\n\n${new Date().toISOString()} · ${rows.length} measurements · codes without · are P0/P1, with · are P2 (SMALL-TAP omitted here)\n\n| state | ${sizes.join(' | ')} |\n|---|${sizes.map(()=>'---').join('|')}|\n`;
 for(const s of states)md+=`| ${s} | ${sizes.map(v=>cell(rows.find(r=>r.state===s&&r.vp===v))).join(' | ')} |\n`;
 const groups=new Map();
 for(const r of rows)for(const i of r.issues){const key=`P${i.p} ${i.code} ${r.state} ${i.detail.split(' ')[0]}`;const g=groups.get(key)||{p:i.p,code:i.code,state:r.state,detail:i.detail,vps:[]};g.vps.push(r.vp);groups.set(key,g);}
 md+='\n## Findings (grouped by state + element)\n\n';
 for(const g of [...groups.values()].sort((a,b)=>a.p-b.p||b.vps.length-a.vps.length))md+=`- **P${g.p} ${g.code}** · ${g.state} · ${g.vps.join(', ')}\n  - ${g.detail}\n`;
 return md;
}
