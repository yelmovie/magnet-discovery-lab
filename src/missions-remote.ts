import { autoplaySpeed } from './autoplay-controls';
import { opposite, type Point, type Pole } from './domain';
import { deliveryCourse, deliveryRoute, distance, puzzleHint } from './mission-model';
import { deliveryHints, padHints } from './mission-content';
import { playEffect } from './game-audio';
import { clearedGlass, drawGlassStain, glassStains, wipeGlass } from './aquarium-glass';

import { Surface, W, H, pt, clamp } from './mission-surface';

export function aquarium(v: Surface){
  let previous=performance.now(), raf=0, lastSave=0;
  let pad=v.p('inner-pad',pt(29,48));
  const handleStart=pt(27,47), mask=new Set(v.a.mask);
  let connected=!v.has('padDetached')&&distance(v.p('cleaner',handleStart),pad)<18;
  const counts=glassStains.map((_,i)=>Number(v.a.values[`scrubDistance${i}`]||0));
  const turns=glassStains.map((_,i)=>Number(v.a.values[`scrubTurns${i}`]||0));
  const directions=[0,0,0],legs=[0,0,0];
  const section=v.c.root.querySelector<HTMLElement>('.force-sensor');
  if(section){
    section.className='aquarium-section';section.setAttribute('aria-label','유리벽을 옆에서 본 모습');
    section.innerHTML='<strong>유리벽 옆모습</strong><div class="aquarium-slice"><div><span>유리 밖</span><i class="aqua-grip"></i><b>손잡이</b></div><i class="aqua-glass" aria-hidden="true"></i><div><span>물속</span><i class="aqua-pad"></i><b>청소 패드</b></div></div><span class="aqua-coupling" data-coupling></span><span class="aqua-count" data-stain-count></span>';
  }
  const coupling=section?.querySelector<HTMLElement>('[data-coupling]'), count=section?.querySelector<HTMLElement>('[data-stain-count]');
  function updateSection(){
    if(section)section.dataset.attached=String(connected);
    if(coupling)coupling.textContent=connected?'자석이 붙었어':'자석이 떨어졌어';
    if(count)count.textContent=`깨끗한 곳 ${glassStains.filter((_,i)=>v.has(`clean${i}`)).length} / 3`;
  }
  updateSection();
  const padInfo=document.createElement('span');padInfo.className='sr-only';padInfo.dataset.object='inner-pad';padInfo.style.left=`${pad.x}%`;padInfo.style.top=`${pad.y}%`;padInfo.textContent='유리 안쪽에서 바깥 손잡이를 따라 움직이는 청소 패드';v.c.root.querySelector('.mission-board')!.append(padInfo);
  const tank=v.asset('aquarium-window','/assets/quest/aquarium-window.webp');
  const parts=v.asset('aquarium-cleaner-parts','/assets/quest/aquarium-cleaner-parts.webp');
  v.draw=()=>{
    const g=v.ctx,handle=v.p('cleaner',handleStart);
    const shownPad=v.animating?v.p('inner-pad',pad):pad;
    v.base();
    if(tank.complete&&tank.naturalWidth)g.drawImage(tank,280,207,850,371);
    else v.sprite('aquarium',246,169,880,454);
    glassStains.forEach((_,i)=>{if(!v.has(`clean${i}`))drawGlassStain(g,parts,mask,i);});
    if(parts.complete&&parts.naturalWidth){
      const h=parts.naturalHeight/4;
      // The wider pad is visible through the front pane, behind the smaller hand grip.
      g.drawImage(parts,0,h,parts.naturalWidth,h,shownPad.x*12.8-39,shownPad.y*7.2-43,78,86);
      g.drawImage(parts,0,0,parts.naturalWidth,h,handle.x*12.8-35,handle.y*7.2-30,70,60);
    }else{
      if(!v.equipment('pad',shownPad,110,62))v.iron(shownPad,'',56);
      v.magnet(handle,'N',.55);
    }
  };
  function wipe(before:Point){
    const travel=distance(before,pad),dx=pad.x-before.x;
    if(travel<=.015)return;
    glassStains.forEach((p,i)=>{
      if(v.has(`clean${i}`)||distance(p,pad)>=7)return;
      const size=mask.size;
      wipeGlass(mask,i,before,pad);
      if(mask.size!==size)v.a.mask=Array.from(mask);
      counts[i]+=distance(p,before)>=7?Math.min(travel,7-distance(p,pad)):travel;
      if(Math.abs(dx)>.012){
        const dir=Math.sign(dx);
        if(directions[i]&&dir!==directions[i]&&legs[i]>=2.5)turns[i]++;
        if(dir!==directions[i])legs[i]=0;
        directions[i]=dir;legs[i]+=Math.abs(dx);
      }
      v.a.values[`scrubDistance${i}`]=counts[i];v.a.values[`scrubTurns${i}`]=turns[i];
      if((v.compact?counts[i]>=8:counts[i]>=18&&turns[i]>=2)&&clearedGlass(mask,i)>=.7){
        v.mark(`clean${i}`,'유리 너머 청소',`${i+1}번째 얼룩 위로 안쪽 패드를 움직여 닦았어.`);
        v.tell('얼룩을 닦으니 물고기가 잘 보여!',true,'pad');updateSection();
      }
    });
    if(!v.has('clean-proof')&&glassStains.every((_,i)=>v.has(`clean${i}`))){
      v.proof('clean','유리 밖 자석으로 세 구역 청소','success',{scrubDistance:Math.round(counts.reduce((sum,x)=>sum+x,0)),reversals:turns.reduce((sum,x)=>sum+x,0)});
      v.a.values['clean-proof']=true;v.tell('세 곳 모두 깨끗해! 손잡이를 옆으로 두고 물고기를 살펴보자.',true);
      // Park the connected pair by the plants so the last revealed fish stays visible.
      const parked=pt(28,39);
      v.settle({cleaner:parked,'inner-pad':parked},()=>{
        pad={...parked};connected=true;v.a.values.padDetached=false;
        updateSection();v.draw();v.c.touch();
      },undefined,800);
    }
  }
  function follow(now:number){
    raf=0;
    const dt=Math.max(0,Math.min((now-previous)/1000,.045))*(v.c.root.dataset.demoRun!==undefined?autoplaySpeed(v.s.settings):1);previous=now;
    if(v.c.root.dataset.demoPaused===undefined&&!document.hidden&&!v.c.root.inert&&!document.querySelector('dialog[open],.modal-backdrop')){
      const handle=v.p('cleaner',handleStart),gap=distance(handle,pad);
      const next=gap<(connected?18:8);
      if(connected!==next){
        connected=next;v.a.values.padDetached=!connected;
        if(!connected&&v.a.values.puzzleVersion===1)v.miss('손잡이가 너무 멀어져서 패드가 떨어졌어. 물속 패드 앞으로 돌아와 붙여 줘.',padHints);
        else v.tell(connected?'안쪽 패드와 다시 연결됐어. 얼룩 위를 쓸어 봐.':'손잡이가 너무 멀어졌어. 물속 패드 앞으로 돌아와 붙여 줘.');
        updateSection();v.c.touch();v.c.meta();
      }
      if(!connected)return;
      const k=gap<.04?1:1-Math.exp(-dt*4), before=pad;
      pad=pt(before.x+(handle.x-before.x)*k,before.y+(handle.y-before.y)*k);
      v.set('inner-pad',pad);wipe(before);v.draw();
      if(k===1){v.c.touch();return;}
      if(now-lastSave>1000){v.c.touch();lastSave=now;}
    }
    raf=requestAnimationFrame(follow);
  }
  const moveHandle=()=>{if(!raf){previous=performance.now();raf=requestAnimationFrame(follow);}};
  v.drag('cleaner',handleStart,moveHandle,moveHandle,p=>pt(clamp(p.x,26,77),clamp(p.y,35,74)));
  v.cleanups.push(()=>cancelAnimationFrame(raf));
}
/** Solving re-renders the bench; only that next render plays the goblin's exit. */
let justSolved:object|null=null;
export function delivery(v: Surface){
  const r=Number(v.a.values.round||0),{wall:puzzle,start,goal}=deliveryRoute(v.a);const solvedAt=justSolved===v.a?performance.now():-1e9;justSolved=null;let car=Number(v.a.values.car??start),pole=(v.a.values.controllerPole||'N') as Pole,raf=0,prev=performance.now(),moved=false,lastSave=0,controlled=Number(v.a.values[`controlled${r}`]||0);
  const carPoint=()=>pt(car,59);
  const forceOn=()=>{const q=v.p('controller',pt(20,40));return distance(q,carPoint())<18&&Math.abs(q.y-59)<12;};
  let speed=Number(v.a.values.cartSpeed||0);
  moved=speed!==0;
  const setSpeed=(value:number)=>{speed=value;v.a.values.cartSpeed=value;};
  let driveMethod=String(v.a.values[`cartMethod${r}`]||'');
  const stopProof=(key:string,label:string)=>{
    const trial=v.proof(key,label,'success',{car,goal,pole,method:driveMethod,controllerY:v.p('controller',pt(20,40)).y,controlledDistance:Math.round(controlled),...(puzzle?{course:'glass-room'}:{})});
    const startPole=v.a.values.startControllerPole;
    trial.initialObjects.forEach(o=>{if(o.id==='cart-magnet')o.pole='N';if(o.id==='controller'&&(startPole==='N'||startPole==='S'))o.pole=startPole;});
    trial.objects.forEach(o=>{if(o.id==='cart-magnet')o.pole='N';if(o.id==='controller')o.pole=pole;});
    const {releaseCar,releaseX,releaseY,releasePole}=v.a.values;
    if(typeof releaseCar==='number'&&typeof releaseX==='number'&&typeof releaseY==='number'&&(releasePole==='N'||releasePole==='S')){
      trial.conditions.rollingDistance=Math.abs(car-releaseCar);
      if(key.startsWith('stop'))trial.initialObjects=[{id:'cart-magnet',x:releaseCar,y:59,pole:'N'},{id:'controller',x:releaseX,y:releaseY,pole:releasePole}];
    }
    if(v.a.values.driveFacing==='N'||v.a.values.driveFacing==='S'){
      trial.conditions.facing=v.a.values.driveFacing;
      trial.conditions.cartFacing=v.a.values.driveCartFacing;
    }
  };
  const finishStopped=()=>{
    if(v.has(`segment${r}`)||Math.abs(car-goal)>=3||forceOn()||speed!==0||controlled<=.01)return false;
    v.mark(`segment${r}`,'택배 배달',driveMethod==='pull'?'자석으로 당겨 목적지에 멈췄어.':driveMethod==='push'?'자석으로 밀어 목적지에 멈췄어.':'자석으로 밀고 당겨 목적지에 멈췄어.');
    const path=v.path;
    stopProof(`stop${r}`,'배달 장소에서 카트가 멈춘 뒤 확인');v.path=path;
    stopProof(`delivery${r}`,'극의 힘으로 운반하고 정차');
    if(puzzle||v.a.values.puzzleRevision===2&&r===2){justSolved=v.a;playEffect('reward',v.s.settings);}
    v.tell(puzzle?'배달 완료! 유리벽 너머 깃발에 딱 멈췄어. 도깨비가 달아난다!':'배달 완료! 카트가 배달 장소에 멈췄어.',true,'crate');v.refresh();return true;
  };
  // Puzzle course: a miss is a visible result plus the next clue, never a penalty screen.
  let blocked=0,bumpAt=-1e9;
  const miss=(kind:'wall'|'over',text:string)=>v.miss(text,deliveryHints[kind]);
  const goblin=puzzle?v.asset('villain-goblin','/assets/quest/villain-scrap-goblin.png'):null;
  const state=document.createElement('p');state.className='delivery-state';state.setAttribute('role','status');v.c.root.querySelector('.mission-board')!.append(state);
  const safePosition=(p:Point):Point=>{
    const bounds=board.getBoundingClientRect(),piece=controller.getBoundingClientRect();
    let top=bounds.height*.28,bottom=bounds.height*.79;
    for(const el of [state,v.c.root.querySelector<HTMLElement>('.mission-actions')]){
      if(!el)continue;
      const rect=el.getBoundingClientRect();if(!rect.height)continue;
      if(el===state)top=Math.max(top,Math.min(bounds.height*.36,rect.top+rect.height-bounds.top));
      else bottom=Math.min(bottom,rect.top-bounds.top);
    }
    const halfX=Math.max(piece.width/2,54*bounds.width/W)+6,halfY=Math.max(piece.height/2,42*bounds.height/H)+5;
    const right=100-halfX/bounds.width*100;
    if(puzzle&&p.x>deliveryCourse.reach+2&&performance.now()-bumpAt>600){bumpAt=performance.now();if(moved)v.tell('조종 자석은 유리벽을 넘어갈 수 없어.');}
    return pt(clamp(p.x,halfX/bounds.width*100,puzzle?Math.min(right,deliveryCourse.reach):right),clamp(p.y,(top+halfY)/bounds.height*100,(bottom-halfY)/bounds.height*100));
  };
  const board=v.c.root.querySelector<HTMLElement>('.mission-board')!;
  const controller=v.c.root.querySelector<HTMLElement>('[data-drag="controller"]')!;
  const carInfo=document.createElement('span');carInfo.className='sr-only';carInfo.dataset.object='cart-magnet';
  carInfo.textContent='왼쪽 N극, 오른쪽 S극을 가진 택배 카트';board.append(carInfo);
  if(!v.a.points['initial:controller']&&!v.a.points.controller){
    v.a.points['initial:controller']=pt(20,40);v.a.values.startControllerPole=pole;
  }
  v.a.points['initial:cart-magnet']||=pt(start,59);v.set('cart-magnet',carPoint());
  const facing=(q:Point)=>{
    const side=q.x>=car?1:-1;
    const cartPole=side===1?'S':'N',controlPole=side===1?pole:opposite(pole);
    return {side,attract:cartPole!==controlPole,cartPole,controlPole};
  };
  let shownFeedback='',feedbackUntil=0,cartMoving=false;
  v.draw=()=>{
    v.base();
    const g=v.ctx,q=v.p('controller',pt(20,40)),{side,attract}=facing(q);
    const connected=forceOn(),done=v.has(`segment${r}`),atGoal=Math.abs(car-goal)<3;
    const direction=side*(attract?1:-1);
    if(v.feedback!==shownFeedback){shownFeedback=v.feedback;feedbackUntil=performance.now()+2200;}
    let status=puzzle?'손은 유리벽을 넘지 못해. 자석의 힘으로 카트를 깃발까지 보내 줘.':'밀어도 당겨도 좋아. 자석으로 카트를 깃발까지 보내 줘.';
    if(moved&&!connected)status='카트가 멈췄어. 자석을 가까이 대서 다시 움직여 봐.';
    if(connected&&moved)status=cartMoving
      ? `${attract?'다른 극이 당겨':'같은 극이 밀어'} 카트가 ${direction>0?'오른쪽':'왼쪽'}으로 움직여.`
      : '카트가 멈췄어. 조종 자석을 조금씩 움직여 봐.';
    if(shownFeedback&&performance.now()<feedbackUntil)status=shownFeedback;
    if(moved&&!connected&&speed!==0)status='조금 더 굴러가네. 마찰 때문에 점점 느려져.';
    if(puzzle&&blocked>.4&&!done)status='당기는 자석이 유리벽에 막혔어. 다른 방법을 찾아봐.';
    if(puzzle&&!done&&!cartMoving&&!connected&&moved&&speed===0&&car>deliveryCourse.wall&&car<goal-deliveryCourse.tolerance)status='조금 모자라. 깃발까지 한 번 더 보내 봐.';
    if(atGoal&&connected&&!done)status='배달 장소야. 자석을 떼고 카트가 멈추는지 봐.';
    if(done)status='배달 완료 · 카트가 목적지에 멈췄어.';
    if(state.textContent!==status)state.textContent=status;

    // Wheels sit on the rails. The dashed bay marks the same three-unit stopping tolerance as the model.
    if(!v.sprite('rail',140,462,1000,82)){
      g.fillStyle='#84725d';g.fillRect(140,478,1000,8);g.fillRect(140,516,1000,8);
    }
    const gx=goal*W/100,cx=car*W/100,cy=59*H/100;
    if(puzzle){
      // The glass partition stops the hand-held magnet; the cart rolls through the door at rail height.
      const wx=deliveryCourse.wall*W/100,hit=performance.now()-bumpAt<380;
      g.save();g.fillStyle=done?'#ffe9a870':'#a9dcea5c';g.beginPath();g.roundRect(wx,236,1140-wx,226,[0,18,0,0]);g.fill();
      g.fillStyle=hit?'#c9f1fbd9':'#dff4f8b3';g.strokeStyle=hit?'#1d7fa0':'#5f9fb2';g.lineWidth=hit?7:4;
      g.beginPath();g.roundRect(wx-8,236,16,226,7);g.fill();g.stroke();
      g.strokeStyle='#ffffffcc';g.lineWidth=3;g.beginPath();g.moveTo(wx-2,252);g.lineTo(wx-2,330);g.stroke();
      g.fillStyle='#5f9fb2';g.fillRect(wx-12,456,24,10);g.restore();
      v.label('유리벽',pt(deliveryCourse.wall-6,35),true);
      if(goblin?.complete&&goblin.naturalWidth){
        // The goblin guards the storeroom until the parcel arrives, then runs off.
        const t=done?Math.min(1,(performance.now()-solvedAt)/900):0;
        if(t<1){g.save();g.globalAlpha=1-t;g.drawImage(goblin,1010+t*150,300-Math.sin(t*Math.PI)*70,128,128);g.restore();}
      }
    }
    g.save();g.fillStyle=(atGoal||done)?'#89bd8480':'#ffe19788';g.strokeStyle=done?'#20765e':'#956515';
    g.lineWidth=4;g.setLineDash([9,7]);g.beginPath();g.roundRect(gx-3*W/100,416,6*W/100,102,10);g.fill();g.stroke();
    g.setLineDash([]);g.fillStyle='#86552d';g.fillRect(gx-3,285,6,122);
    g.fillStyle=done?'#25795f':'#c46e22';g.beginPath();g.moveTo(gx,279);g.lineTo(gx+57,279);g.lineTo(gx+46,296);g.lineTo(gx+57,313);g.lineTo(gx,313);g.fill();g.restore();
    v.label('배달 장소',pt(goal,35),true);
    if(!v.sprite('cart',cx-139,cy-113,278,216)){g.fillStyle='#b78240';g.fillRect(cx-81,cy-37,162,66);}
    // The parcel rests inside the bed; after stopping it is unloaded beside the station flag.
    if(done)v.sprite('parcel',gx+26,cy-65,102,89);
    else v.sprite('parcel',cx-53,cy-92,102,89);
    v.magnet(carPoint(),'N',.51);
    if(!done){
      const guide=pt(car+Math.sign(goal-car)*(pole==='N'?12:-12),59);
      if((!connected||!moved)&&(!puzzle||guide.x<=deliveryCourse.reach&&(pole==='S'?puzzleHint(Number(v.a.values.puzzleMisses||0))>=2:car<deliveryCourse.reach-8)))v.target(guide,'',128,64);
      if(connected&&cartMoving)v.arrow(pt(car-direction*3,42),pt(car+direction*5,42),attract?'#167d76':'#ac642c');
    }
    // A handle above the bar keeps the movable magnet distinguishable from the cart-mounted one.
    const x=q.x*W/100,y=q.y*H/100;
    g.save();g.fillStyle='#e5bb73';g.strokeStyle='#614725';g.lineWidth=4;g.beginPath();g.roundRect(x-23,y-42,46,36,9);g.fill();g.stroke();g.restore();
    v.magnet(q,pole,.72);
  };
  v.drag('controller',pt(20,40),()=>{finishStopped();},()=>{moved=true;},safePosition);v.button('flip',()=>{pole=opposite(pole);v.a.values.controllerPole=pole;v.c.touch();v.draw();});
  v.button('detach',()=>{const q=v.p('controller',pt(20,40));v.set('controller',safePosition(pt(puzzle?20:q.x,38)));v.c.touch();if(finishStopped())return;v.tell(speed!==0?'자석을 멀리했어. 카트가 조금 더 굴러 멈추는지 봐.':'조종 자석을 멀리했어.');v.draw();});
  v.button('delivery-next',()=>{
    if(v.a.values.puzzleRevision!==2||!v.has(`segment${r}`)||r>=2)return;
    v.a.values.round=r+1;v.a.values.car=goal;v.a.values.cartSpeed=0;v.a.values.controllerPole='N';
    delete v.a.values.driveFacing;delete v.a.values.driveCartFacing;v.a.points={};v.refresh();
  });
  const frame=(now:number)=>{if(v.stopped)return;const dt=Math.max(0,Math.min(.045,(now-prev)/1000))*(v.c.root.dataset.demoRun!==undefined?autoplaySpeed(v.s.settings):1);prev=now;
    if(document.hidden||v.c.root.inert||v.c.root.dataset.demoPaused!==undefined||document.querySelector('dialog[open],.modal-backdrop')){raf=requestAnimationFrame(frame);return;}
    cartMoving=false;
    if(moved&&!v.has(`segment${r}`)){
      const q=v.p('controller',pt(20,40)),d=distance(q,carPoint());if(forceOn()){
        const {side,attract,cartPole,controlPole}=facing(q);
        const dir=side*(attract?1:-1),before=car;
        let next=car+dir*(18-d)/18*dt*12;
        // An attracted cart meets the controller instead of passing through it and reversing.
        if(attract)next=side>0?Math.max(car,Math.min(next,q.x-6)):Math.min(car,Math.max(next,q.x+6));
        car=clamp(next,24,79);cartMoving=Math.abs(car-before)>.0001;v.a.values.car=car;v.set('cart-magnet',carPoint());
        if(dt>0)setSpeed((car-before)/dt);
        Object.assign(v.a.values,{releaseCar:car,releaseX:q.x,releaseY:q.y,releasePole:pole});
        if(Math.sign(car-before)===Math.sign(goal-start)){
          controlled+=Math.abs(car-before);v.a.values[`controlled${r}`]=controlled;v.a.values.driveFacing=controlPole;v.a.values.driveCartFacing=cartPole;
          const method=attract?'pull':'push';driveMethod=!driveMethod||driveMethod===method?method:'mixed';v.a.values[`cartMethod${r}`]=driveMethod;
        }
        if(Math.abs(car-goal)<3)v.tell('목적지야! 자석을 떼고 카트가 멈추는지 봐.');
      }else if(speed!==0){
        // Rolling friction on this track slows a released cart over a short, visible distance.
        const deceleration=18,rollTime=Math.min(dt,Math.abs(speed)/deceleration);
        const nextSpeed=rollTime>=Math.abs(speed)/deceleration?0:speed-Math.sign(speed)*deceleration*rollTime;
        const next=car+(speed+nextSpeed)*rollTime/2;
        car=clamp(next,24,79);setSpeed(car===next?nextSpeed:0);
        v.a.values.car=car;v.set('cart-magnet',carPoint());
      }
      if(puzzle){
        const q=v.p('controller',pt(20,40)),pulling=forceOn()&&q.x>=car&&facing(q).attract;
        blocked=pulling&&!cartMoving&&q.x>=deliveryCourse.reach-.6&&car<deliveryCourse.wall?blocked+dt:0;
        if(blocked>1.2&&!v.has('puzzleWallHit')){v.a.values.puzzleWallHit=true;miss('wall','당기는 자석이 유리벽에 막혀서 카트가 멈췄어.');}
        const past=car>goal+deliveryCourse.tolerance;
        if(past&&Math.abs(speed)<.25&&!v.has('puzzleOver')){v.a.values.puzzleOver=true;miss('over','깃발을 지나쳤어! 다른 극이 마주 보게 해서 당겨 오자.');}
        if(!past&&v.has('puzzleOver'))v.a.values.puzzleOver=false;
      }
      if(now-lastSave>1000){v.c.touch();lastSave=now;}
    }if(finishStopped())return;v.draw();raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);v.cleanups.push(()=>cancelAnimationFrame(raf));
  const fitController=()=>v.set('controller',safePosition(v.p('controller',pt(20,40))));
  window.addEventListener('resize',fitController);v.cleanups.push(()=>window.removeEventListener('resize',fitController));
  v.button('bench-view',fitController);
}
