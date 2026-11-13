const HITS=3;
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
  art,tone=()=>{},palette='#a855f7',reach=90,contact=22,
}) {
  const handles=new AbortController(),{signal}=handles;
  const doc=host.ownerDocument,view=doc.defaultView;
  const record=normalizeMapHits(progress,stages.map(stage=>stage.id));
  const layer=doc.createElement('div');
  layer.className='map-encounter-layer';
  layer.style.setProperty('--encounter-color',palette);
  host.append(layer);
  const style=doc.createElement('style');
  style.textContent=STYLES;
  layer.append(style);
  const live=doc.createElement('span');
  live.className='map-encounter-sr';live.role='status';live.setAttribute('aria-live','polite');layer.append(live);
  const attack=doc.createElement('button');
  attack.type='button';attack.className='map-encounter-attack';attack.hidden=true;
  attack.setAttribute('aria-keyshortcuts','J Space');
  (controls===host?layer:controls).append(attack);

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
    return {s,i,el,actor,fx,meter,bubble,say,hits:record[s.id]||0,facing:-1,poseUntil:0,saidUntil:0,sayIndex:0};
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
    foe.saidUntil=time;
    live.textContent=text;
  }
  function hit(){
    if(closed||!current||!last||paused())return;
    const time=view?.performance.now()??performance.now();
    if(time-lastHit<REPEAT||current.hits>=HITS||distance(last.hero,current.s)>reach)return;
    const foe=current,n=++foe.hits;lastHit=time;
    if(Math.abs(foe.s.x-last.hero.x)>3)foe.facing=last.hero.x<foe.s.x?-1:1;
    const calm=still(),duration=calm?170:n===HITS?660:360;
    foe.poseUntil=time+duration;foe.hitAt=time;foe.hurtAt=undefined;
    pose.hero={kind:'attack',direction:-foe.facing,start:time,end:time+(calm?140:320)};
    saved={...saved,[foe.s.id]:n};onSave({...saved});tone(n===HITS?'finish':'hit',n);
    speak(foe, n===HITS?foe.s.finish??'앗, 물러날게!':foe.s.hit?.[n-1]??(n===1?'앗, 들켰네!':'이번 건 제법인데!'),time+duration);
    live.textContent=n===HITS?`${foe.s.name} · 세 번 명중! 악당이 물러나요.`:`${foe.s.name} · ${n}번 명중. ${HITS-n}번 남았어요.`;
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
    if(!current||event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||paused()||
      !(event.code==='KeyJ'||event.code==='Space'))return;
    const el=event.target;
    if(el instanceof view.HTMLElement&&(el.closest('input,textarea,select,[contenteditable]')||event.code==='Space'&&el.closest('button,a,summary')))return;
    event.preventDefault();hit();
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
    const width=host.clientWidth,height=host.clientHeight;
    for(const foe of foes){
      if(foe.hits>=HITS&&now>=foe.poseUntil){foe.el.hidden=true;continue;}
      const point=project(foe.s);
      if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)){foe.el.hidden=true;continue;}
      const off=point.x<-size||point.x>width+size||point.y<-size||point.y>height+size;
      foe.el.hidden=off;
      if(off)continue;
      const {el,actor}=foe;
      el.style.transform=`translate(${point.x.toFixed(1)}px,${point.y.toFixed(1)}px)`;
      el.style.setProperty('--encounter-size',size.toFixed(1)+'px');
      const d=distance(hero,foe.s);
      if(!stop&&foe.hits<HITS&&point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height&&d<=reach&&d<best){nearest=foe;best=d;}
      if(now>=foe.poseUntil){
        if(hero&&Math.abs(hero.x-foe.s.x)>4)foe.facing=hero.x<foe.s.x?-1:1;
        foe.hitAt=undefined;foe.hurtAt=undefined;
      }
      if(!stop&&foe.hits<HITS&&now>=foe.poseUntil){
        const touched=[['hero',hero],['ally',ally]].filter(([key,p])=>p&&distance(p,foe.s)<=contact&&(!pose[key]||now>=pose[key].end)&&now>=(foe[key+'Contact']??0));
        if(touched.length){
          if(Math.abs(touched[0][1].x-foe.s.x)>3)foe.facing=touched[0][1].x<foe.s.x?-1:1;
          foe.hurtAt=now;foe.poseUntil=now+(calm?180:350);
          for(const [key,p] of touched){
            foe[key+'Contact']=now+1050;
            pose[key]={kind:'hurt',direction:foe.s.x<p.x?-1:1,start:now,end:now+(calm?170:320)};
          }
          if(now-lastTone>300){lastTone=now;tone('contact',0);}
        }
      }
      const frame=foe.hits===HITS?5:foe.hitAt!=null?foe.hits+2:foe.hurtAt!=null?2:
        calm?0:Math.floor((now+foe.i*350)/650)%4===3?1:0;
      const source=foe.facing>0&&art.right?art.right:art.left;
      const bg=`url("${source}")`;
      if(actor.style.backgroundImage!==bg)actor.style.backgroundImage=bg;
      actor.style.setProperty('--encounter-face',foe.facing>0&&!art.right?'-1':'1');
      const frames=art.frames??1;
      actor.style.backgroundSize=`${frames*100}% 100%`;
      actor.style.backgroundPositionX=frames>1?`${Math.min(frame,frames-1)/(frames-1)*100}%`:'50%';
      el.dataset.calm=String(calm);
      el.dataset.pose=frame===5?'exit':frame>=3?'hit':frame===2?'contact':frame===1?'mischief':'idle';
      el.dataset.hit=String(foe.hits);
      const marks='●'.repeat(HITS-foe.hits)+'○'.repeat(foe.hits);
      if(foe.meter.textContent!==marks)foe.meter.textContent=marks;
      foe.bubble.hidden=now>=foe.saidUntil||stop;
    }
    current=nearest;
    if(current&&current!==lastNear&&current.saidUntil<=now&&now-lastHit>REPEAT){
      const message=current.say[current.sayIndex++%current.say.length]??'다가왔구나!';
      speak(current,message,now+2200);
    }
    lastNear=current;
    const hasFocus=doc.activeElement===attack;
    attack.hidden=!current;
    if(current){
      const remaining=HITS-current.hits;
      const label=`공격 · ${remaining}번 남음`;
      if(attack.textContent!==label)attack.textContent=label;
      const description=`${current.s.name}의 악당 공격, ${remaining}번 남음`;
      if(attack.getAttribute('aria-label')!==description)attack.setAttribute('aria-label',description);
      if(controls===host){
        const p=project(current.s);
        attack.style.left=`${Math.max(76,Math.min(width-76,p.x))}px`;
        attack.style.top=`${Math.max(30,Math.min(height-30,p.y+42))}px`;
      }
    }else if(hasFocus){host.querySelector('canvas,[tabindex="0"]')?.focus({preventScroll:true});}
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
.map-encounter-meter{position:absolute;left:0;bottom:calc(var(--encounter-size) - 1px);transform:translateX(-50%);color:#fff;background:#251833ec;border:1px solid #ffffffa8;border-radius:9px;padding:1px 4px;font:700 10px/1.4 system-ui;letter-spacing:2px;white-space:nowrap}
.map-encounter-say{position:absolute;left:0;bottom:calc(var(--encounter-size) + 18px);transform:translateX(-50%);width:max-content;max-width:152px;background:#fff;color:#292137;border:1px solid #514364;border-radius:9px;padding:5px 8px;text-align:center;font:700 13px/1.3 system-ui;box-shadow:0 2px 5px #15111950}
.map-encounter-prop{position:absolute;width:calc(.36 * var(--encounter-size));height:calc(.36 * var(--encounter-size));bottom:4px;left:calc(.28 * var(--encounter-size));color:var(--encounter-color);fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 1px #161024) drop-shadow(0 0 2px #161024)}
.map-encounter-fx{position:absolute;bottom:6px;left:calc(-.35 * var(--encounter-size));width:calc(.7 * var(--encounter-size));height:calc(.58 * var(--encounter-size));border:3px solid var(--encounter-color);border-radius:45% 58% 52% 43%;opacity:0}
.map-encounter-foe[data-pose="mischief"] .map-encounter-prop{animation:map-encounter-prop .6s ease-out}
.map-encounter-foe[data-pose="hit"] .map-encounter-body,.map-encounter-foe[data-pose="contact"] .map-encounter-body{animation:map-encounter-flinch .32s ease-out}
.map-encounter-foe[data-pose="hit"] .map-encounter-fx,.map-encounter-foe[data-pose="contact"] .map-encounter-fx,.map-encounter-foe[data-pose="exit"] .map-encounter-fx{animation:map-encounter-ring .38s ease-out both}
.map-encounter-foe[data-hit="2"] .map-encounter-fx{box-shadow:0 0 0 5px color-mix(in srgb,var(--encounter-color),transparent 50%)}
.map-encounter-foe[data-pose="exit"] .map-encounter-body,.map-encounter-foe[data-pose="exit"] .map-encounter-prop{animation:map-encounter-exit .6s ease-in both}
.map-encounter-foe[data-pose="exit"] .map-encounter-meter{display:none}
.map-encounter-layer .map-encounter-attack{pointer-events:auto;min-width:122px;min-height:46px;padding:7px 14px;border:2px solid #fff;border-radius:14px;background:#352347;color:white;box-shadow:0 3px 0 #241a30;font:800 16px/1.2 system-ui;cursor:pointer;touch-action:manipulation;white-space:nowrap}
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
