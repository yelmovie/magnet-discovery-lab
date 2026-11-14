import {villainPatrol} from './map-villain-patrol.js';
import {dockMapAttack} from './map-attack-control.js';
import {openMapFinale} from './map-finale.js';
const HITS=3;
// Place speech in map space without covering interactive signs, icons or other speech.
function layoutSpeech(host, entries){
 const visible=entries.filter(({el})=>!el.hidden&&el.closest('[hidden]')===null);
 if(!visible.length)return;
 const bounds=host.getBoundingClientRect(),w=host.clientWidth,h=host.clientHeight;
 if(w<80||h<100||!bounds.width||!bounds.height)return;
 const sx=bounds.width/w,sy=bounds.height/h;
 const rect=r=>({l:(r.left-bounds.left)/sx,t:(r.top-bounds.top)/sy,r:(r.right-bounds.left)/sx,b:(r.bottom-bounds.top)/sy});
 const occupied=[];
 const selectors='button,a[href],.map-encounter-body,.map-encounter-prop,.map-encounter-meter,.villain-line,.village-sprite,.map-walker,.expedition-player,.expedition-npc,.expedition-courier,.resident-bubble,[data-map-resident],[data-hub-resident],.npc-bubble,.companion-bubble,[role="status"],.map-resident,.world-pin,.map-label,.map-node,.building-label,.map-encounter-reaction';
 for(const part of host.ownerDocument.querySelectorAll(selectors)){
  if(visible.some(({el})=>el===part||part.contains(el))||part.closest('[hidden],[aria-hidden="true"][inert]'))continue;
  const box=part.getBoundingClientRect();
  if(!box.width||!box.height||part.classList.contains('sr-only')||getComputedStyle(part).visibility==='hidden')continue;
  const b=rect(box);
  if(b.r<0||b.b<0||b.l>w||b.t>h||b.r-b.l>w*.98&&b.b-b.t>h*.75)continue;
  occupied.push({l:b.l-7,r:b.r+7,t:b.t-7,b:b.b+7});
 }
 const clamp=(x,min,max)=>Math.max(min,Math.min(x,max));
 for(const {el,anchor} of visible){
  const ew=el.offsetWidth,eh=el.offsetHeight;if(!ew||!eh)continue;
  const a=anchor?rect(anchor.getBoundingClientRect()):null,ea=rect(el.offsetParent?.getBoundingClientRect()??bounds);
  const x=a?(a.l+a.r)/2:w/2,top=a?a.t-18:12,bottom=a?a.b+18:20,gap=14;
  const preferred=a?[[x-ew/2,top-eh],[a.r+gap,top-eh/3],[a.l-gap-ew,top-eh/3],[x-ew/2,bottom]]:[[x-ew/2,12],[x-ew/2,h-95-eh],[12,85],[w-ew-12,85]];
  const pts=preferred.slice();
  for(let y=12;y<h-eh-6;y+=22)for(let i=0;i<=8;i++)pts.push([12+(w-ew-24)*i/8,y]);
  const fit=pts.map(([l,t])=>({l:clamp(l,8,w-ew-8),t:clamp(t,8,h-eh-8)})).map(p=>({...p,r:p.l+ew,b:p.t+eh}));
  const overlap=p=>occupied.reduce((area,c)=>area+Math.max(0,Math.min(p.r,c.r)-Math.max(p.l,c.l))*Math.max(0,Math.min(p.b,c.b)-Math.max(p.t,c.t)),0);
  let best=fit[0],score=Infinity;
  for(const p of fit){const s=overlap(p)*1000+Math.hypot(p.l-preferred[0][0],p.t-preferred[0][1]);if(s<score){best=p;score=s;}if(s===0)break;}
  occupied.push(best);
  const left=`${Math.round((best.l-ea.l)*10)/10}px`,y=`${Math.round((best.t-ea.t)*10)/10}px`;
  if(el.style.left!==left)el.style.left=left;if(el.style.top!==y)el.style.top=y;
  if(el.style.bottom!=='auto')el.style.bottom='auto';if(el.style.transform!=='none')el.style.transform='none';
 }
}

const REPEAT=380;
const CUES={
  cap:'M9 10h14v12H9zm3-4h8v4h-8z', pane:'M6 7h20v18H6zm4 4v10h12V11z',
  file:'M7 5h12l6 6v16H7zm12 2v6h5M11 17h10m-10 4h8', label:'M5 10h15l7 6-7 6H5zm5 4h5m-5 4h7',
  lens:'M16 5a11 11 0 1 0 0 22 11 11 0 0 0 0-22zm0 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  plate:'M4 9h24v14H4zm4 4v6h16v-6z', drop:'M16 4c0 0-8 10-8 16a8 8 0 0 0 16 0c0-6-8-16-8-16z',
  flip:'M5 8h22v16H5zm4 8h14m-5-5 5 5-5 5', vent:'M5 7h22v18H5zm4 5h14m-14 4h14m-14 4h14',
  gear:'M12 5h8v4h4v4h4v7h-4v4h-4v4h-8v-4H8v-4H4v-7h4V9h4zm4 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  flag:'M8 28V5m0 2h17l-5 5 5 5H8', arrow:'M5 16h21m-8-8 8 8-8 8', ruler:'M10 4h12v24H10zm0 5h7m-7 5h5m-5 5h7m-7 5h5',
  wave:'M3 16c4 0 4-5 8-5s4 5 8 5 4-5 9-5M3 22c4 0 4-5 8-5s4 5 8 5 4-5 9-5',
  dial:'M16 6a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 10 4-5',
  plug:'M11 5v7m10-7v7M8 12h16v4a8 8 0 0 1-8 8v4',
  light:'M16 3v3m-10 3 3 3m17-3-3 3M16 10a7 7 0 0 0-4 13l1 4h6l1-4a7 7 0 0 0-4-13z',
};

export function normalizeMapHits(value,ids) {
  return Object.fromEntries(ids.flatMap(id=>{
    const hits=Object.hasOwn(value??{},id)?value[id]:0;
    return Number.isInteger(hits)&&hits>0?[[id,Math.min(hits,HITS)]]:[];
  }));
}

/**
 * Map-only encounters. World coordinates decide reach/contact; projected coordinates
 * only position the drawing and its accessible control. The caller owns save/reset.
 */
export function mountMapEncounters({
  host,controls=host,stages,progress={},onSave=()=>{},blocked=()=>false,reduced=()=>false,
  activeId,requiredFoes=0,art,tone=()=>{},palette='#a855f7',reach=90,contact=22,
}) {
  const handles=new AbortController(),{signal}=handles;
  const doc=host.ownerDocument,view=doc.defaultView;
  const record=normalizeMapHits(progress,stages.map(stage=>stage.id));
  let finaleAt=0;
  const layer=doc.createElement('div');
  layer.className='map-encounter-layer';
  layer.style.setProperty('--encounter-color',palette);
  host.append(layer);
  const style=doc.createElement('style');
  style.textContent=STYLES;
  layer.append(style);
  const live=doc.createElement('span');
  live.className='map-encounter-sr';live.role='status';live.setAttribute('aria-live','polite');layer.append(live);
  let lastSpeechLayout=-Infinity;
  const attack=doc.createElement('button');
  attack.type='button';attack.className='map-encounter-attack';attack.hidden=true;
  attack.setAttribute('aria-keyshortcuts','J Space');
  layer.append(attack);
  const syncDock=dockMapAttack(attack,()=>doc.querySelector('[data-map-pan]'));

  const foes=stages.filter(s=>(record[s.id]||0)<HITS).map((s,i)=>{
    const el=doc.createElement('span');
    el.className='map-encounter-foe';el.dataset.encounter=s.id;el.setAttribute('aria-hidden','true');
    const actor=doc.createElement('span');actor.className='map-encounter-body';
    const fx=doc.createElement('span');fx.className='map-encounter-fx';
    const meter=doc.createElement('b');meter.className='map-encounter-meter';
    const bubble=doc.createElement('span');bubble.className='map-encounter-say';bubble.hidden=true;
    const prop=doc.createElementNS('http://www.w3.org/2000/svg','svg');
    prop.setAttribute('viewBox','0 0 32 32');prop.classList.add('map-encounter-prop');
    const path=doc.createElementNS(prop.namespaceURI,'path');
    path.setAttribute('d',CUES[s.prop]??CUES.gear);prop.append(path);
    el.append(actor,prop,fx,meter,bubble);layer.append(el);
    const say=s.lines?.filter(Boolean)??[];
    return {s,i,point:s,lastPatrolAt:null,el,actor,fx,meter,bubble,say,hits:record[s.id]||0,facing:-1,poseUntil:0,saidUntil:0,sayIndex:0};
  });
  const motion=view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const still=()=>reduced()||Boolean(motion?.matches);
  const distance=(p,q)=>p?Math.hypot(p.x-q.x,p.y-q.y):Infinity;
  const paused=()=>doc.hidden||blocked()||Boolean(host.closest('[inert]'))||Boolean(doc.querySelector('dialog[open]'));
  const pose={hero:null,ally:null};
  let current=null,lastNear=null,lastHit=-Infinity,lastTone=-Infinity,saved={},last=null,closed=false;

  function speak(foe,text,time){
    for(const other of foes)if(other!==foe){other.saidUntil=0;other.bubble.hidden=true;}
    foe.bubble.textContent=text;
    foe.bubble.hidden=false;
    lastSpeechLayout=-Infinity;
    foe.saidUntil=time;
    live.textContent=text;
  }
  function hit(){
    if(closed||!current||!last||paused())return;
    const time=view?.performance.now()??performance.now();
    if(time-lastHit<REPEAT||current.hits>=HITS||distance(last.hero,current.point)>reach)return;
    const foe=current,n=++foe.hits;lastHit=time;
    if(Math.abs(foe.point.x-last.hero.x)>3)foe.facing=last.hero.x<foe.point.x?-1:1;
    const calm=still(),duration=calm?170:n===HITS?660:360;
    foe.poseUntil=time+duration;foe.hitAt=time;foe.hurtAt=undefined;
    pose.hero={kind:'attack',direction:-foe.facing,start:time,end:time+(calm?140:320)};
    saved={...saved,[foe.s.id]:n};onSave({...saved});tone(n===HITS?'finish':'hit',n);
    speak(foe, n===HITS?foe.s.finish??'앗, 물러날게!':foe.s.hit?.[n-1]??(n===1?'앗, 들켰네!':'이번 건 제법인데!'),time+(n===HITS?2750:1800));
    live.textContent+=n===HITS?' 세 번 명중! 악당이 물러나요.':` ${n}번 명중. ${HITS-n}번 남았어요.`;
    if(n===HITS&&requiredFoes>0&&stages.length===requiredFoes&&stages.every(s=>(saved[s.id]??record[s.id])===HITS))finaleAt=time+2920;
    update({...last,now:time});
  }
  attack.addEventListener('click',hit,{signal});
  let tap=null;
  attack.addEventListener('pointerdown',event=>{
    event.stopPropagation();
    if(!event.isPrimary||event.pointerType==='mouse'||event.button!==0)return;
    tap={id:event.pointerId,x:event.clientX,y:event.clientY};
    attack.setPointerCapture?.(event.pointerId);
  },{signal});
  attack.addEventListener('pointercancel',()=>{tap=null;},{signal});
  attack.addEventListener('pointerup',event=>{
    if(tap?.id!==event.pointerId)return;
    const start=tap;tap=null;
    // The camera can settle between touchstart and the synthesized click.
    // Count a short release on the captured button; the hit cooldown deduplicates click.
    if(Math.hypot(event.clientX-start.x,event.clientY-start.y)<18)hit();
  },{signal});
  view?.addEventListener('keydown',event=>{
    if(!current||attack.hidden||event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||paused()||
      !(event.code==='KeyJ'||event.code==='Space'))return;
    const el=event.target;
    if(el instanceof view.HTMLElement&&(el.closest('input,textarea,select,[contenteditable]')||event.code==='Space'&&el!==attack&&el.closest('button,a,summary,[role=button]')))return;
    event.preventDefault();if(!event.repeat)hit();
  },{signal,capture:true});

  function output(actor,time){
    const p=pose[actor];
    if(!p||time>=p.end)return null;
    const fraction=Math.max(0,Math.min(1,(time-p.start)/(p.end-p.start)));
    return {
      kind:p.kind,direction:p.direction,
      dx:still()?0:(p.kind==='attack'?1:-1)*p.direction*Math.sin(fraction*Math.PI)*(actor==='hero'?8:5),
      frame:Math.min(3,Math.floor(fraction*4)),
    };
  }
  function update(input){
    last=input;
    const {hero,ally,project,scale=1,now=view?.performance.now()??performance.now()}=input;
    const calm=still(),stop=paused(),size=Math.max(29,Math.min(90,57*scale));
    let nearest=null,best=Infinity;
    const width=host.clientWidth,height=host.clientHeight,active=activeId?.();
    for(const foe of foes){
      if(foe.hits<HITS&&activeId&&foe.s.id!==active){foe.el.hidden=true;foe.bubble.hidden=true;continue;}
      if(foe.hits>=HITS&&now>=Math.max(foe.poseUntil,foe.saidUntil)){foe.el.hidden=true;continue;}
      const dHome=distance(hero,foe.s),patrol=villainPatrol(now,foe.i);
      const animate=!stop&&!calm&&foe.hits<HITS&&now>=foe.poseUntil;
      const radius=8;
      // Slow the movement near the learner, then hold the actual position on a hit.
      const span=dHome<=reach*.75?radius*.32:radius;
      if(calm)foe.point=foe.s;
      else if(animate){
        const alpha=foe.lastPatrolAt==null?.06:Math.min(.22,Math.max(.015,(now-foe.lastPatrolAt)/160));
        const target={x:foe.s.x+patrol.x*span,y:foe.s.y+patrol.y*span*.28};
        foe.point={x:foe.point.x+(target.x-foe.point.x)*alpha,y:foe.point.y+(target.y-foe.point.y)*alpha};
      }
      foe.lastPatrolAt=now;
      const point=project(foe.point);
      if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)){foe.el.hidden=true;continue;}
      const off=point.x<-size||point.x>width+size||point.y<-size||point.y>height+size;
      foe.el.hidden=off;
      if(off)continue;
      const {el,actor}=foe;
      el.style.transform=`translate(${point.x.toFixed(1)}px,${point.y.toFixed(1)}px)`;
      el.style.setProperty('--encounter-size',size.toFixed(1)+'px');
      const d=distance(hero,foe.point);
      if(!stop&&foe.hits<HITS&&point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height&&d<=reach&&d<best){nearest=foe;best=d;}
      if(now>=foe.poseUntil){
        if(animate&&d>reach)foe.facing=patrol.direction;
        else if(hero&&Math.abs(hero.x-foe.point.x)>4)foe.facing=hero.x<foe.point.x?-1:1;
        foe.hitAt=undefined;foe.hurtAt=undefined;
      }
      if(!stop&&foe.hits<HITS&&now>=foe.poseUntil){
        const touched=[['hero',hero],['ally',ally]].filter(([key,p])=>p&&distance(p,foe.point)<=contact&&(!pose[key]||now>=pose[key].end)&&now>=(foe[key+'Contact']??0));
        if(touched.length){
          if(Math.abs(touched[0][1].x-foe.point.x)>3)foe.facing=touched[0][1].x<foe.point.x?-1:1;
          foe.hurtAt=now;foe.poseUntil=now+(calm?180:350);
          for(const [key,p] of touched){
            foe[key+'Contact']=now+1050;
            pose[key]={kind:'hurt',direction:foe.point.x<p.x?-1:1,start:now,end:now+(calm?170:320)};
          }
          if(now-lastTone>300){lastTone=now;tone('contact',0);}
        }
      }
      const frame=foe.hits===HITS?5:foe.hitAt!=null?foe.hits+2:foe.hurtAt!=null?2:
        calm?0:patrol.step==='showoff'?1:Math.floor(now/200)%2;
      const source=foe.facing>0&&art.right?art.right:art.left;
      const bg=`url("${source}")`;
      if(actor.style.backgroundImage!==bg)actor.style.backgroundImage=bg;
      actor.style.setProperty('--encounter-face',foe.facing>0&&!art.right?'-1':'1');
      const frames=art.frames??1;
      actor.style.backgroundSize=`${frames*100}% 100%`;
      actor.style.backgroundPositionX=frames>1?`${Math.min(frame,frames-1)/(frames-1)*100}%`:'50%';
      el.dataset.calm=String(calm);
      el.dataset.patrol=animate?patrol.step:'still';
      const bounce=animate?Math.abs(Math.sin(now/(patrol.step==='showoff'?76:113)))*(patrol.step==='showoff'?6:3):0;
      const tilt=animate?Math.sin(now/108)*(patrol.step==='showoff'?6:2):0;
      actor.style.translate=`0 ${(-bounce).toFixed(1)}px`;
      actor.style.rotate=`${tilt.toFixed(1)}deg`;
      el.dataset.pose=frame===5?'exit':frame>=3?'hit':frame===2?'contact':frame===1?'mischief':'idle';
      el.dataset.hit=String(foe.hits);
      if(foe.hits===HITS)el.dataset.exited=String(now>=foe.poseUntil);
      const marks='●'.repeat(HITS-foe.hits)+'○'.repeat(foe.hits);
      if(foe.meter.textContent!==marks)foe.meter.textContent=marks;
      foe.bubble.hidden=now>=foe.saidUntil||stop;
    }
    if(finaleAt&&now>=finaleAt&&!stop){finaleAt=0;openMapFinale(host,"/video/story/final.mp4");}
    current=nearest;
    if(current&&current!==lastNear&&current.saidUntil<=now&&now-lastHit>REPEAT){
      const message=current.say[current.sayIndex++%current.say.length]??'다가왔구나!';
      speak(current,message,now+2200);
    }
    lastNear=current;
    const hasFocus=doc.activeElement===attack;
    attack.hidden=!(syncDock()&&current);
    if(current){
      const remaining=HITS-current.hits;
      const description=`${current.s.name}의 악당 공격, ${remaining}번 남음`;
      if(attack.getAttribute('aria-label')!==description)attack.setAttribute('aria-label',description);
    }
    if(attack.hidden&&hasFocus){host.closest('.quest-city')?.querySelector('[data-action="walk-next"]')?.focus({preventScroll:true});}
    if(now-lastSpeechLayout>=110){
      lastSpeechLayout=now;
      layoutSpeech(host,foes.map(foe=>({el:foe.bubble,anchor:foe.actor})));
    }
    return {hero:output('hero',now),ally:output('ally',now)};
  }
  return {update,destroy(){closed=true;handles.abort();attack.remove();layer.remove();}};
}

const STYLES=`
.map-encounter-layer{position:absolute;inset:0;z-index:5;overflow:hidden;pointer-events:none}
.map-encounter-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.map-encounter-layer [hidden],.map-encounter-attack[hidden]{display:none!important}
.map-encounter-foe{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}
.map-encounter-body{position:absolute;bottom:0;width:var(--encounter-size);height:var(--encounter-size);left:calc(-.5 * var(--encounter-size));background-repeat:no-repeat;background-position:center;background-size:contain;transform:scaleX(var(--encounter-face,1));transform-origin:50% 90%;filter:drop-shadow(0 2px 2px #17132985)}
.map-encounter-meter{position:absolute;left:0;bottom:calc(var(--encounter-size) - 1px);transform:translateX(-50%);color:#fff;background:#251833ec;border:1px solid #ffffffa8;border-radius:9px;padding:1px 4px;font:700 10px/1.4 NanumSquareNeo,system-ui;letter-spacing:2px;white-space:nowrap}
.map-encounter-foe[data-pose="exit"][data-exited="true"] > :not(.map-encounter-say){visibility:hidden}
.map-encounter-say{position:absolute;left:0;bottom:calc(var(--encounter-size) + 18px);transform:translateX(-50%);width:max-content;max-width:184px;word-break:keep-all;background:#fff;color:#292137;border:1px solid #514364;border-radius:9px;padding:5px 8px;text-align:center;font:700 13px/1.3 NanumSquareNeo,system-ui;box-shadow:0 2px 5px #15111950}
.map-encounter-prop{position:absolute;width:calc(.36 * var(--encounter-size));height:calc(.36 * var(--encounter-size));bottom:4px;left:calc(.28 * var(--encounter-size));color:var(--encounter-color);fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 1px #161024) drop-shadow(0 0 2px #161024)}
.map-encounter-fx{position:absolute;bottom:6px;left:calc(-.35 * var(--encounter-size));width:calc(.7 * var(--encounter-size));height:calc(.58 * var(--encounter-size));border:3px solid var(--encounter-color);border-radius:45% 58% 52% 43%;opacity:0}
.map-encounter-foe[data-pose="mischief"] .map-encounter-prop{animation:map-encounter-prop .6s ease-out}
.map-encounter-foe[data-pose="hit"] .map-encounter-body,.map-encounter-foe[data-pose="contact"] .map-encounter-body{animation:map-encounter-flinch .32s ease-out}
.map-encounter-foe[data-pose="hit"] .map-encounter-fx,.map-encounter-foe[data-pose="contact"] .map-encounter-fx,.map-encounter-foe[data-pose="exit"] .map-encounter-fx{animation:map-encounter-ring .38s ease-out both}
.map-encounter-foe[data-hit="2"] .map-encounter-fx{box-shadow:0 0 0 5px color-mix(in srgb,var(--encounter-color),transparent 50%)}
.map-encounter-foe[data-pose="exit"] .map-encounter-body,.map-encounter-foe[data-pose="exit"] .map-encounter-prop{animation:map-encounter-exit .6s ease-in both}
.map-encounter-foe[data-pose="exit"] .map-encounter-meter{display:none}
.map-encounter-layer .map-encounter-attack{pointer-events:auto;min-width:122px;min-height:46px;padding:7px 14px;border:2px solid #fff;border-radius:14px;background:#352347;color:white;box-shadow:0 3px 0 #241a30;font:800 16px/1.2 NanumSquareNeo,system-ui;cursor:pointer;touch-action:manipulation;white-space:nowrap}
.map-encounter-layer .map-encounter-attack{position:absolute;z-index:2;transform:translate(-50%,-50%)}
.map-encounter-attack:focus-visible{outline:3px solid #fbe271;outline-offset:3px}
.map-encounter-layer .map-encounter-attack:is(:hover,:active){background:#5a3873;transform:translate(-50%,-50%)}
@keyframes map-encounter-prop{35%{transform:translateY(-7px) rotate(17deg)}75%{transform:rotate(-12deg)}}
@keyframes map-encounter-flinch{28%{transform:scaleX(var(--encounter-face,1)) scale(.84,1.1)}56%{transform:scaleX(var(--encounter-face,1)) scale(1.06,.93)}}
@keyframes map-encounter-ring{0%{opacity:.95;transform:scale(.55)}100%{opacity:0;transform:scale(1.75)}}
@keyframes map-encounter-exit{0%{transform:scaleX(var(--encounter-face,1));opacity:1}34%{transform:translateY(-8px) scaleX(var(--encounter-face,1)) scale(1.1,.78);opacity:.9}100%{transform:translateY(-13px) scale(.18,.12);opacity:0}}
.map-encounter-foe[data-calm="true"] *{animation:none!important}
@media(prefers-reduced-motion:reduce){.map-encounter-foe *{animation:none!important}}
`;
