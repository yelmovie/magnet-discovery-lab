import { type Activity, type Point } from './domain';
import { distance } from './mission-model';
import { latchHints, shakePrompt } from './mission-content';
import { playEffect } from './game-audio';
import { mailbox, lidPosition, inSocket, magnetInstalled, mountedMagnet } from './mailbox';
import { drawMailbox, drawMagnetTray } from './mailbox-art';
import { mailboxParts, partKey, partInstalled, nextMailboxPart, mailboxAssembled, assemblyNear, type MailboxPart } from './mailbox-assembly';

import { promptPending } from './inquiry-prompts';
import { Surface, W, H, pt, clamp } from './mission-surface';

export function inspectionNote(a:Activity) {
  if(a.values.assemblyVersion===1){
    const count=mailboxParts.filter(part=>partInstalled(a,part)).length, done=a.values.latch0===true;
    return `<div class="inspection-note" data-inspection-step="${done?2:count===6?1:0}" role="status" aria-live="polite"><span class="inspection-symbol" aria-hidden="true">${done?'✓':count}</span><strong>${done?'조립·확인 완료':count===6?'이제 닫아 보자':'내 손으로 조립'} <small>${done?7:count}/7</small></strong><p>${done?'자석이 철판을 붙잡았어':nextMailboxPart(a)?.name||'손잡이를 아래로 내려 봐'}</p></div>`;
  }
  const round=Number(a.values.round||0);
  const found=a.values[`found${round}`]===true, done=a.values[`latch${round}`]===true;
  const step=done?2:found?1:0;
  return `<div class="inspection-note" data-inspection-step="${step}" role="status" aria-live="polite">
    <span class="inspection-symbol" aria-hidden="true">${done?'✓':found?'1':'?'}</span>
    <strong>${done?'조사 완료':found?'부품 발견':'조사 전'} <small>${step}/2</small></strong>
    <ol><li data-done="${found}"><span aria-hidden="true">${found?'✓':'1'}</span>열어 부품 찾기</li><li data-done="${done}"><span aria-hidden="true">${done?'✓':'2'}</span>닫아 붙는지 확인</li></ol>
  </div>`;
}
export function inspect(v: Surface){
  if(!mailboxAssembled(v.a)){assembleMailbox(v);return;}
  const round=Number(v.a.values.round||0);
  const found=()=>v.has(`found${round}`);
  const latched=()=>v.has(`latch${round}`);
  const lid=v.c.root.querySelector<HTMLButtonElement>('[data-drag="lid"]')!;
  const {handleOpen,handleClosed,plate}=mailbox;
  // The magnet belongs to the lid. Only the handle is an input.
  const opening=(handle:Point)=>(handleClosed.y-handle.y)/(handleClosed.y-handleOpen.y);
  const mount=(fraction:number)=>mountedMagnet(lidPosition(pt(0,handleClosed.y-(handleClosed.y-handleOpen.y)*fraction)));

  function showCutaway(fraction:number){
    const g=v.ctx, centre=pt(80,55),cx=centre.x*W/100,cy=centre.y*H/100;
    g.save();g.fillStyle='#fffaf0';g.strokeStyle='#91754d';g.lineWidth=3;
    g.beginPath();g.roundRect(cx-102,cy-74,204,148,18);g.fill();g.stroke();g.restore();
    v.label('닫힐 때 안쪽',pt(centre.x,centre.y-7.1),true);
    const bar=pt(centre.x,centre.y+4), top=pt(bar.x,bar.y-19/(H/100)-4.1*fraction);
    v.hardware('plate',bar);
    v.hardware('magnet',top);
    v.label(latched()?'두 부품이 붙었어':'닫으면 두 부품이 만나',pt(centre.x,centre.y+14),true);
  }
  v.draw=()=>{
    const handle=v.p('lid',handleClosed), fraction=opening(handle);
    const waiting=promptPending(1,v.a,v.s)&&!latched();
    lid.disabled=v.animating||latched()||waiting;
    const close=v.c.root.querySelector<HTMLButtonElement>('[data-mission="close-lid"]');
    if(close){close.disabled=v.animating||waiting;close.hidden=latched();}
    const note=v.c.root.querySelector<HTMLElement>('.mailbox-inspection');
    const step=latched()?2:found()?1:0;
    if(note&&note.dataset.step!==String(step)){
      note.innerHTML=inspectionNote(v.a);note.dataset.step=String(step);
    }
    const item=round?'책 보관함':'우편함';
    const assembled=v.a.values.assemblyVersion===1;
    v.base();v.mailboxBody(round,handle,true,assembled?'내가 조립한 우편함':latched()?'✓ 조사 완료':found()?'안쪽 부품 발견':`조사할 ${item}`,assembled&&latched(),!assembled);
    if(fraction>.58)v.hardware('magnet',mount(fraction));
    if(fraction>.65){const spot=mount(fraction);v.label('덮개에 고정된 자석',pt(spot.x,spot.y+4.3),true);}
    if(found()||fraction>.65){
      if(fraction>.65)v.label('몸체 안쪽 철판',pt(plate.x,plate.y-4.5),true);
      showCutaway(fraction);
    }
    if(!latched()){
      const x=handle.x-8,delta=found()?8:-8;
      v.arrow(pt(x,handle.y),pt(x,handle.y+delta));
    }
  };
  function observe(){
    if(found())return;
    v.set('fixed-magnet',mount(1));v.set('fixed-plate',plate);
    v.mark(`open${round}`,'덮개 열기','손잡이를 올려 덮개 안쪽을 열었어.');
    v.mark(`found${round}`,'고정된 부품 관찰','자석은 덮개에, 철판은 몸체에 붙어 있었어.');
    v.proof(`inspect${round}`,'열린 덮개의 자석과 몸체의 철판 관찰');
    v.tell('덮개에는 자석, 몸체에는 철판이 있어. 이제 손잡이를 내려 봐.');
  }
  function closeLatch(){
    v.set('initial:fixed-magnet',mount(1));v.set('initial:fixed-plate',plate);
    v.settle({lid:handleClosed},()=>{
      v.set('fixed-magnet',mount(0));
      v.mark(`latch${round}`,'덮개가 붙잡힌 까닭','덮개를 내리니 자석이 몸체의 철판에 붙었어.');
      v.proof(`latch${round}`,'덮개를 닫아 자석과 철판이 붙는 모습 관찰');
      v.tell('착! 덮개의 자석과 몸체의 철판이 붙어서 닫혔어.',true,'snap');
      v.draw();if(!v.compact&&round===0)v.refresh();
    });
  }
  function dropHandle(p:Point){
    if(latched())return;
    if(promptPending(1,v.a,v.s)){v.set('lid',handleOpen);v.draw();return;}
    if(opening(p)>.8){v.set('lid',handleOpen);observe();}
    else if(found()&&p.y>=handleClosed.y-4){closeLatch();}
    else v.tell(found()?'손잡이를 아래로 더 내려 철판 가까이 가져가 봐.':'나무 손잡이를 위로 끝까지 올려 봐.');
    if(!v.stopped)v.draw();
  }
  v.drag('lid',handleClosed,dropHandle,undefined,lidPosition);

  v.button('close-lid',()=>{if(found()&&!latched()&&!v.animating&&!promptPending(1,v.a,v.s))closeLatch();});
  v.button('next',()=>{v.a.values.round=1;v.a.points={};v.refresh();});
}
function assembleMailbox(v:Surface){
  const narrowTray=typeof matchMedia==='function'?matchMedia('(max-width: 520px) and (orientation: portrait)'):undefined;
  const wood=v.asset('mailbox-wood','/assets/quest/mailbox-wood.webp');
  const anchor={body:pt(49,63),cover:pt(50.5,46)};
  function drawPart(part:MailboxPart){
    const id=partKey(part),seated=partInstalled(v.a,part),p=v.p(id,part.start),g=v.ctx;
    if(part.id==='body'||part.id==='cover'){
      const origin=anchor[part.id];
      g.save();g.translate((p.x-origin.x)*W/100,(p.y-origin.y)*H/100);
      drawMailbox(g,wood,mailbox.handleOpen,undefined,undefined,part.id==='body'?'body':'lid');g.restore();
    }else v.hardware(part.id==='grip'?'handle':part.id,p);
    if(!seated)v.label(part.name,pt(p.x,p.y+(part.id==='body'?15:part.id==='cover'?9:5.3)),true);
  }
  v.draw=()=>{
    v.base();
    const next=nextMailboxPart(v.a),g=v.ctx;
    // One work area and a tidy parts tray. Nothing is pre-attached to the box.
    g.save();g.fillStyle='#f0e3c9';g.strokeStyle='#cbb990';g.lineWidth=1.5;
    g.beginPath();g.roundRect(937,249,200,342,20);g.fill();g.stroke();g.restore();
    for(const part of mailboxParts){
      const el=v.c.root.querySelector<HTMLButtonElement>(`[data-drag="${partKey(part)}"]`)!;
      el.disabled=v.animating||partInstalled(v.a,part)||(narrowTray?.matches===true&&part!==next);
    }
    for(const part of mailboxParts.filter(part=>partInstalled(v.a,part)))drawPart(part);
    if(next){
      const wide=next.id==='body'?420:next.id==='cover'?340:120;
      v.target(next.target,'',wide,next.id==='body'?130:next.id==='cover'?70:45);
      const label=next.id==='body'?'몸체 놓는 자리':next.id==='cover'?'뚜껑 연결 자리':next.id==='plate'?'몸체 안쪽':'뚜껑 가운데';
      // A short callout lives beside the box, away from small hardware.
      v.label(next.id==='body'?'몸체 자리':`${mailboxParts.indexOf(next)+1}/6 · ${label}`,next.id==='body'?pt(64,62):pt(49,80),true);
    }
    for(const part of mailboxParts.filter(part=>!partInstalled(v.a,part)))drawPart(part);
  };
  function fit(part:MailboxPart,p:Point){
    const next=nextMailboxPart(v.a),id=partKey(part);
    if(v.animating||partInstalled(v.a,part))return;
    if(part!==next||!assemblyNear(p,part)){
      v.set(id,part.start);v.tell(part!==next?`먼저 ${next?.name}부터 놓아 줘.`:'초록 점선 가까이에 놓으면 딱 맞게 끼워져.');v.draw();return;
    }
    v.settle({[id]:part.target},()=>{
      v.a.values[id]=true;v.c.touch();v.c.meta();
      playEffect('snap',v.s.settings);
      if(mailboxAssembled(v.a)){
        v.set('lid',mailbox.handleOpen);v.a.values.fixedMailbox=true;
        v.mark('found0','우편함 부품 조립','뚜껑에 자석을, 몸체 안쪽에 철판을 직접 끼웠어.');
        if(v.n===2){
          v.set('repair-magnet',mailbox.socket);v.set('repair-plate',mailbox.plate);
          v.set('initial:repair-magnet',mailbox.looseMagnet);v.set('initial:lid',mailbox.handleOpen);
          v.a.values.repairClosed=false;
        }else{
          v.set('fixed-magnet',mailbox.socket);v.set('fixed-plate',mailbox.plate);
          v.set('initial:fixed-magnet',mailbox.socket);v.set('initial:fixed-plate',mailbox.plate);
          v.proof('inspect0','분리된 부품으로 우편함을 조립하고 자석과 철판의 자리 확인','success',{assembled:true});
        }
      }
      v.refresh();
    },undefined,350);
  }
  for(const part of mailboxParts)v.drag(partKey(part),partInstalled(v.a,part)?part.target:part.start,p=>fit(part,p));
  v.button('fit-part',()=>{const next=nextMailboxPart(v.a);if(next)fit(next,next.target);});
}
export function repair(v: Surface){
  if(v.has('mailboxQuickRepair')&&!mailboxAssembled(v.a)){assembleMailbox(v);return;}
  const i=Number(v.a.values.round||0);let closed=typeof v.a.values.repairClosed==='boolean'?v.has('repairClosed'):(v.a.points.lid?.y||38)>55;
  const setClosed=(value:boolean)=>{closed=value;v.a.values.repairClosed=value;v.set('lid',value?mailbox.handleClosed:mailbox.handleOpen);};
  setClosed(closed);
  let rattle=0;
  const installed=()=>magnetInstalled(v.p('repair-magnet',mailbox.looseMagnet));
  // Puzzle course: the strike plate is out of alignment, so a magnet alone does not hold the lid.
  const quick=v.has('mailboxQuickRepair'),puzzle=!quick&&v.a.values.puzzleVersion===1&&i===0,loosePlate=i===2||puzzle;
  const plateAligned=()=>!loosePlate||distance(v.p('repair-plate',pt(75,47)),mailbox.plate)<7;
  v.draw=()=>{
    const handle=v.p('lid',mailbox.handleOpen),magnet=v.c.root.querySelector<HTMLButtonElement>('[data-drag="repair-magnet"]')!;
    const mounted=installed(),insideVisible=(mailbox.handleClosed.y-handle.y)/(mailbox.handleClosed.y-mailbox.handleOpen.y)>.58;
    magnet.dataset.seated=String(mounted);
    // Keep the lid grip above and the seated magnet below their adjacent visual centres.
    magnet.style.transform=mounted?'translate(-50%, -8%)':'';
    if(mounted){const spot=mountedMagnet(handle);magnet.style.left=spot.x+'%';magnet.style.top=spot.y+'%';}
    magnet.disabled=closed&&mounted;
    v.base();drawMagnetTray(v.ctx,mailbox.looseMagnet);
    v.label('부품 받침',pt(mailbox.looseMagnet.x,mailbox.looseMagnet.y+8.4),true);
    v.ctx.save();v.ctx.translate(rattle,Math.abs(rattle)*-.22);
    v.mailboxBody(i===1?1:0,handle,plateAligned(),i===1?'수리할 책 보관함':'수리할 우편함',mounted&&closed&&plateAligned()&&v.has(`with${i}`)&&(quick||i===2||v.has(`without${i}`)));
    if(mounted&&insideVisible)v.hardware('magnet',mountedMagnet(handle));
    if(insideVisible&&!mounted){const spot=mountedMagnet(handle);v.label('자석 끼우는 홈',pt(spot.x,spot.y+4.3),true);}
    if(loosePlate){
      const loose=v.p('repair-plate',pt(75,47));
      if(!plateAligned()&&!puzzle)v.target(mailbox.plate,'철판 자리',94,45);
      if(!plateAligned())v.hardware('plate',loose);
      if(!plateAligned()&&puzzle){
        // The caption plate sits under the strike, so the puzzle names the loose part and points to its seat.
        v.label('철판',pt(loose.x,loose.y+4.2),true);
        if(v.has('faultObserved0')){v.target(mailbox.plate,'',94,45);if(distance(loose,mailbox.plate)>14)v.arrow(pt(loose.x-5.5,loose.y+1),pt(mailbox.plate.x+6.5,mailbox.plate.y-1),'#30766c');}
      }
    }
    v.ctx.restore();
    if(!mounted){
      const loose=v.a.points['repair-magnet'];
      if(insideVisible && !v.animating && (quick||v.has(`without${i}`)) && distance(loose,mailbox.looseMagnet)<1){
        v.arrow(pt(mailbox.looseMagnet.x+6.7,mailbox.looseMagnet.y-3),pt(mailbox.socket.x-6,mailbox.socket.y+.6),'#30766c');
      }
      v.ctx.save();v.ctx.shadowColor='#3b2b2370';v.ctx.shadowBlur=3;v.ctx.shadowOffsetY=2;
      v.hardware('magnet',loose);v.ctx.restore();
    }
    v.label(quick?(v.has('with0')?'✓ 흔들어도 닫혀 있어!':mounted?'덮개를 닫고 흔들어 봐!':'빨강·파랑 자석을 홈에 끼워 봐!'):i===2?'새 우편함 · 철판 자리도 맞춰 줘!':`${v.has(`without${i}`)?'✓':'○'} 자석 없이   ${v.has(`with${i}`)?'✓':'○'} 자석 넣고`,pt(50,29),true);
  };
  v.drag('repair-magnet',mailbox.looseMagnet,p=>{
    if(puzzle&&!v.has('without0')&&inSocket(p)){v.set('repair-magnet',mailbox.looseMagnet);v.tell('먼저 지금 그대로 덮개를 닫고 흔들어 보자.');v.draw();return;}
    if(closed&&inSocket(p)){v.set('repair-magnet',mailbox.looseMagnet);v.tell('먼저 손잡이를 올려야 안쪽 홈에 끼울 수 있어.');v.draw();return;}
    if(inSocket(p)){v.set('repair-magnet',mailbox.socket);playEffect('snap',v.s.settings);v.tell('홈에 자석을 끼웠어. 손잡이를 내려 덮어 봐.');}
    else v.set('repair-magnet',mailbox.looseMagnet);
    v.draw();
  });
  v.drag('lid',mailbox.handleOpen,p=>{setClosed(p.y>50);v.tell(closed?(quick?'우편함을 흔들어 덮개가 열리는지 확인해 봐.':shakePrompt(v.has(`${installed()?'without':'with'}${i}`))):'손잡이를 아래로 내려 닫아 봐.');v.draw();},undefined,lidPosition);
  if(puzzle)v.drag('repair-plate',pt(75,47),()=>{
    if(!v.has('without0')){v.set('repair-plate',pt(75,47));v.tell('먼저 지금 그대로 덮개를 닫고 흔들어 보자.');}
    else if(plateAligned()){v.set('repair-plate',mailbox.plate);playEffect('snap',v.s.settings);v.tell('철판을 자석 맞은편에 맞췄어. 덮개를 닫고 흔들어 봐.');}
    v.draw();
  });
  if(i===2)v.drag('repair-plate',pt(75,47),()=>{setClosed(false);if(!v.has('diagnosis2')){v.set('repair-plate',pt(75,47));v.tell('먼저 자석을 넣고 덮개가 열리는지 확인해 보자.');}else if(plateAligned())v.set('repair-plate',mailbox.plate);v.draw();});
  v.button('fault-distance',()=>{if(!v.has('faultObserved2'))return v.tell('자석을 넣고 덮개를 닫아 봐. 상자를 살짝 흔들면 덮개가 열릴까?');v.mark('diagnosis2','고장 원인 진단','자석이 있어도 철판이 멀면 붙잡지 못한다는 증거로 위치를 고치기로 했어.');v.tell('맞아. 자석과 철판이 너무 멀리 있어. 철판을 점선에 옮겨 고쳐 줘.',true);v.refresh();});
  v.button('fault-color',()=>v.tell('색을 바꾸어도 철판과의 거리는 같아. 자석과 철판이 놓인 곳을 살펴봐.'));
  v.button('shake',()=>{
    if(v.animating)return;
    if(!closed)return v.tell('먼저 덮개 손잡이를 아래로 내려 닫아 줘.');
    if(quick&&!installed())return v.tell('손잡이를 올리고, 덮개 안쪽 홈에 자석을 끼워 줘.');
    const locked=installed()&&plateAligned();
    playEffect('lid',v.s.settings);
    v.settle({lid:locked?mailbox.handleClosed:mailbox.handleOpen},()=>{
      rattle=0;setClosed(locked);
      if(locked){
        v.mark(`with${i}`,quick?'자석을 끼운 우편함 흔들기':'자석을 넣고 같은 흔들림','자석이 철판을 당겨 덮개가 닫혀 있었어.');
        v.tell('흔들어도 닫혀 있어! 네가 끼운 자석이 철판을 붙잡았어.',true,'snap');
      }else if(puzzle&&installed()){
        v.mark('faultObserved0','자석을 넣고 같은 흔들림','자석을 넣어도 멀리 있는 철판을 붙잡지 못해 덮개가 열렸어.');
        v.miss('자석을 넣었는데도 덮개가 열렸어! 철판이 자석과 멀리 떨어져 있어.',latchHints);
      }else{
        v.mark(`without${i}`,i===2?'새 우편함의 배치 검사':'자석 없이 같은 흔들림','덮개가 다시 열렸어.');
        if(i===2&&installed())v.mark('faultObserved2','고장 증거','자석을 넣어도 멀리 있는 철판을 붙잡지 못했어.');
        v.tell(i===2&&installed()?'자석은 있는데 덮개가 열렸어. 아래에서 고칠 곳을 골라 봐.':'덮개가 열렸어. 이번엔 홈에 자석을 끼워 봐.');
      }
      if(quick?locked:i===2?v.has('with2'):v.has(`with${i}`)&&v.has(`without${i}`)){
        v.proof(`repair${i}`,quick?'흔들어도 열리지 않는 우편함':i===2?'새 장치의 철판 자리까지 고치기':puzzle?'우편함의 자석과 철판 자리 수리':'같은 장치의 자석 유무 비교','success',quick?{quick:true,assembled:mailboxAssembled(v.a)}:puzzle?{course:'loose-plate'}:{});
        if(puzzle)playEffect('reward',v.s.settings);
        v.refresh();
      }else v.draw();
    },t=>{
      rattle=8*Math.sin(8*Math.PI*t)*Math.sin(Math.PI*t);
      const rise=clamp((t-.28)/.72,0,1);
      return rise*rise*(3-2*rise);
    });
  });
  v.button('next',()=>{v.a.values.round=i+1;v.a.values.repairClosed=false;v.a.points={};v.refresh();});
}
