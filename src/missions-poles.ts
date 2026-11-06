import { opposite, type Point, type Pole } from './domain';
import { type TrialObject } from './trial-records';
import { distance, ringFloating } from './mission-model';
import { playEffect } from './game-audio';
import { handRelease, afterHandRelease } from './experiment-hand';

import { Surface, W, H, pt } from './mission-surface';

const polarityParts = {
  covered:[2,2,316,108],
  north:[2,114,316,108],
  south:[2,226,316,108],
  stand:[2,338,316,108],
} as const;
function polarityPart(v:Surface,part:keyof typeof polarityParts,center:Point,width:number,height:number){
  const img=v.asset('polarity-parts','/assets/quest/polarity-parts.webp');
  if(!img.complete||!img.naturalWidth)return false;
  const [sx,sy,sw,sh]=polarityParts[part];
  v.ctx.drawImage(img,sx,sy,sw,sh,center.x*W/100-width/2,center.y*H/100-height/2,width,height);
  return true;
}

export function poles(v: Surface){
  const r=Number(v.a.values.round||0),hidden:Pole=r===0?'S':'N';
  const dock=pt(48,53),rest=pt(68,53),probeHome=pt(29,54);
  const probeWidth=192,coveredWidth=211;
  // On attraction the right pole of the reference touches the left end of the covered bar.
  const contact=pt(dock.x+100*(probeWidth+coveredWidth-2)/(2*W),dock.y);
  const repelled=pt(77,dock.y);
  if(v.a.values.poleLayout!==1){
    const saved=v.a.points['unknown-magnet'];
    if(saved?.y===53){
      if(saved.x===59)v.set('unknown-magnet',contact);
      else if(saved.x===72)v.set('unknown-magnet',repelled);
      else if(saved.x===64)v.set('unknown-magnet',rest);
    }
    v.a.values.poleLayout=1;
  }
  const stickerHome=(side:Pole)=>pt(side==='N'?33:47,78);
  let probe=(v.a.values.probePole||'N') as Pole,probeStart={...v.p('probe',probeHome)};
  let reaction=String(v.a.values.reaction||'');
  const covered=()=>v.p('unknown-magnet',rest);
  const tested=(face:Pole)=>v.has(`test${r}${face}`);
  const resetTrial=()=>{
    reaction='';delete v.a.values.reaction;delete v.a.points['initial:unknown-magnet'];
    probeStart={...probeHome};v.path=[];
  };
  // Finish an interrupted return, including old saves made after flipping only the reference bar.
  if(v.has('poleReturning')||(reaction&&!tested(opposite(probe))&&tested(probe))){
    resetTrial();v.set('probe',probeHome);v.set('unknown-magnet',rest);delete v.a.values.poleReturning;v.c.touch();
  }
  const end=(left:boolean)=>pt(covered().x+(left?-1:1)*5.5,covered().y);
  const atDock=(p:Point)=>Math.abs(p.x-dock.x)<=5&&Math.abs(p.y-dock.y)<=6;
  const stickerButtons=(['N','S'] as Pole[]).map(pole=>({pole,button:v.c.root.querySelector<HTMLButtonElement>(`[data-drag="sticker${pole}"]`)!}));
  const test=(p:Point)=>{
    if(v.animating||!atDock(p))return;
    const facing=opposite(probe),repel=facing===hidden;
    if(reaction&&tested(facing)){v.set('probe',dock);v.draw();return;}
    const initial={...covered()},result=repel?repelled:contact;
    v.a.points['initial:unknown-magnet']={...initial};
    v.set('probe',dock);
    reaction='';v.tell(`기준 자석의 ${facing}극을 가까이 댔어. 가려진 자석을 봐.`);
    v.settle({'unknown-magnet':result},()=>{
      reaction=repel?'밀려났어':'당겨졌어';v.a.values.reaction=reaction;
      v.mark(`test${r}${facing}`,`기준 ${facing}극 접근`,`표시 없는 자석이 ${reaction}.`);
      const trial=v.proof(`pole${r}${facing}`,`${facing}극을 가까이 댄 반응`,repel?'repel':'attract',{facing,hidden});
      trial.initialObjects=[{id:'probe',...probeStart,pole:probe},{id:'unknown-magnet',...initial,pole:hidden}];
      trial.objects=[{id:'probe',...dock,pole:probe},{id:'unknown-magnet',...result,pole:hidden}];
      probeStart={...dock};
      playEffect(repel?'compare':'snap',v.s.settings);
      const labelled=v.has(`label${r}N`)&&v.has(`label${r}S`);
      v.tell(`${facing}극을 가까이 대니 ${reaction}. ${labelled?'붙인 스티커와 움직임이 맞는지 확인해 봐.':v.has(`test${r}N`)&&v.has(`test${r}S`)?'두 반응을 비교했어! 이제 종이 위 양끝에 스티커를 붙여 줘.':'지금 본 반응으로 스티커를 붙여 봐. 반대 극으로도 확인할 거야.'}`);v.draw();
    });
  };
  v.draw=()=>{
    v.base();
    const g=v.ctx,q=covered(),ref=v.p('probe',probeHome);
    const showEnds=v.has(`test${r}N`)||v.has(`test${r}S`);
    const facing=opposite(probe);
    if(!atDock(ref)&&!v.has('poleReturning')){
      v.target(dock,`${facing}극 대는 자리`,probeWidth+8,68);
      if(!reaction&&ref.x<=probeHome.x+1)v.arrow(pt(38,53),pt(46,53));
    }
    if(!reaction&&tested(probe)){
      const last=v.a.trials?.find(t=>t.key===`pole${r}${probe}`);
      if(last)v.label(`앞 실험 · ${probe}극을 대니 ${last.outcome==='repel'?'밀려났어':'당겨졌어'}`,pt(36,38),true,'#47665d');
    }
    if(!polarityPart(v,'covered',q,coveredWidth,48)){
      g.fillStyle='#cda873';g.strokeStyle='#85663d';g.lineWidth=3;g.beginPath();g.roundRect(q.x*W/100-coveredWidth/2,q.y*H/100-25,coveredWidth,50,6);g.fill();g.stroke();
    }
    v.label('종이로 가린 자석',pt(q.x,q.y-10),true);
    v.magnet(ref,probe,probeWidth/150);
    v.label('기준 자석',pt(ref.x,ref.y+10),true);
    for(const {pole,button} of stickerButtons){
      const placed=v.has(`label${r}${pole}`),spot=end(pole===hidden);
      button.disabled=v.animating;
      if(placed){v.set(`sticker${pole}`,spot);continue;}
      g.save();g.beginPath();g.arc(spot.x*W/100,spot.y*H/100,22,0,2*Math.PI);
      g.fillStyle='#fff8e7';g.fill();
      if(showEnds){g.strokeStyle='#377669';g.lineWidth=3;g.setLineDash([5,4]);g.stroke();}
      g.restore();v.label('?',spot,true);
    }
    if(reaction){
      const before=v.a.points['initial:unknown-magnet']||rest;
      if(Math.abs(before.x-q.x)>1)v.arrow(pt(before.x,66),pt(q.x,66));
      if(v.has('lens'))v.target(pt(before.x,39),'처음 위치',60,23);
      v.label(reaction,pt(q.x,73),true);
    }
  };
  v.drag('probe',probeHome,test);
  for(const {pole} of stickerButtons)v.drag(`sticker${pole}`,stickerHome(pole),p=>{
    const left=Math.abs(p.x-end(true).x)<=4.8,right=Math.abs(p.x-end(false).x)<=4.8;
    const attached=(left||right)&&Math.abs(p.y-covered().y)<=6;
    const observed=v.has(`test${r}N`)||v.has(`test${r}S`);
    if(!observed||!attached||pole!==(left?hidden:opposite(hidden))){
      delete v.a.values[`label${r}${pole}`];delete v.a.values[`solved${r}`];
      v.set(`sticker${pole}`,stickerHome(pole));
      const trial=v.a.trials?.filter(t=>t.key===`pole${r}N`||t.key===`pole${r}S`).at(-1);
      const clue=trial?`${trial.conditions.facing}극을 대니 ${trial.outcome==='repel'?'밀려났어. 같은 극끼리 밀어내':'당겨졌어. 다른 극끼리 당겨'}. `:'';
      v.tell(!observed?'기준 자석을 한 번 가까이 대고 움직임을 먼저 봐.':!attached?'종이로 가린 자석의 물음표 위에 놓아 봐.':`${clue}어느 끝인지 살펴보고 다시 붙여 봐.`);
      v.draw();return;
    }
    v.set(`sticker${pole}`,end(left));v.mark(`label${r}${pole}`,'자석 끝의 극 복원',`${left?'왼쪽':'오른쪽'} 끝을 ${pole}극으로 표시했어.`);
    if(v.has(`label${r}N`)&&v.has(`label${r}S`)){v.mark(`solved${r}`,'양쪽 극 표시 복원',`왼쪽은 ${hidden}극, 오른쪽은 ${opposite(hidden)}극으로 복원했어.`);v.proof(`gate${r}`,'관찰한 반응으로 양쪽 극 표시 복원');v.tell(v.has(`test${r}N`)&&v.has(`test${r}S`)?'두 반응과 스티커가 맞아! 양쪽 극을 찾았어.':'스티커를 잘 붙였어! 이제 기준 자석을 뒤집어 반대 극으로도 확인해 봐.',true);v.refresh();}
    else{v.tell('한쪽 극을 찾았어! 다른 쪽에도 표시를 붙여 줘.',true);v.draw();}
  },()=>{delete v.a.values[`label${r}${pole}`];delete v.a.values[`solved${r}`];v.c.meta();});
  v.button('flip',()=>{
    if(v.animating)return;
    probe=opposite(probe);v.a.values.probePole=probe;resetTrial();v.a.values.poleReturning=true;
    v.tell('다시 비교하려고 두 자석을 처음 자리에 놓을게.');v.draw();v.c.touch();v.c.meta();
    v.settle({probe:probeHome,'unknown-magnet':rest},()=>{
      delete v.a.values.poleReturning;
      v.tell(`처음 자리야. 기준 자석의 ${opposite(probe)}극을 오른쪽 점선에 대 봐.`);
      v.draw();v.c.touch();v.c.meta();
    },undefined,520);
  });
  v.button('next',()=>{v.a.values.round=1;delete v.a.values.reaction;v.a.points={};v.refresh();});
}
export function rings(v: Surface){
  const r=Number(v.a.values.round||0),count=v.compact||r===0?2:3;
  let release=v.has('ringReleased')?1:0;
  const pole=(i:number)=>(v.a.values[`ringPole${i}`]||'N') as Pole;
  const slot=(i:number)=>pt(68,71-i*15),tray=(i:number)=>pt(23+i*16,73);
  const ringWidth=166,ringHeight=75;
  // Stacked rings share the same projected top ellipse. Only the side wall separates their centres.
  const wall=17,contactSpacing=wall/H*100,floatSpacing=18;
  const standHeight=count===2?330:398;
  const stand=pt(68,slot(0).y-(standHeight*.27-wall/2)/H*100);
  const drawStand=()=>{
    if(polarityPart(v,'stand',stand,standHeight*.67,standHeight))return;
    const g=v.ctx,x=stand.x*W/100,y=stand.y*H/100;
    g.fillStyle='#92693f';g.beginPath();g.ellipse(x,y+standHeight*.27,82,19,0,0,Math.PI*2);g.fill();
    g.fillStyle='#b99b50';g.fillRect(x-5,y-standHeight/2,10,standHeight*.77);
  };
  const positions=()=>{
    let y=slot(0).y;
    return Object.fromEntries(Array.from({length:count},(_,i)=>{
      if(i)y-=ringFloating(pole(i-1),pole(i))?floatSpacing:contactSpacing;
      return [`ring${i}`,pt(68,y)];
    }));
  };
  const snapshot=():TrialObject[]=>Array.from({length:count},(_,i)=>({id:`ring${i}`,...v.p(`ring${i}`,tray(i)),topPole:pole(i),bottomPole:opposite(pole(i))}));
  const flipRing=(i:number)=>{
    if(v.animating)return;
    v.a.values[`ringPole${i}`]=opposite(pole(i));
    release=0;
    if(v.has('ringReleased')){
      for(let j=0;j<count;j++)v.set(`ring${j}`,slot(j));
      v.a.values.ringReleased=false;
      v.tell('고리를 뒤집었어. 손을 떼고 마주 보는 두 면을 관찰해 봐.');
    }
    playEffect('compare',v.s.settings);v.draw();v.c.touch();
  };
  const drawRing=(i:number)=>{
    const q=v.p(`ring${i}`,tray(i)),top=pole(i),bottom=opposite(top);
    const g=v.ctx,x=q.x*W/100,y=q.y*H/100;
    if(!polarityPart(v,top==='N'?'north':'south',q,ringWidth,ringHeight)){
      const topColor=top==='N'?'#c7483b':'#316e9c',bottomColor=top==='N'?'#316e9c':'#c7483b';
      const radius=(ringHeight-wall)/2;
      g.fillStyle=bottomColor;g.beginPath();g.ellipse(x,y+wall/2,ringWidth/2,radius,0,0,Math.PI*2);g.fill();g.fillRect(x-ringWidth/2,y-wall/2,ringWidth,wall);
      g.fillStyle=topColor;g.beginPath();g.ellipse(x,y-wall/2,ringWidth/2,radius,0,0,Math.PI*2);g.fill();
      g.fillStyle='#544634';g.beginPath();g.ellipse(x,y-wall/2,19,7,0,0,Math.PI*2);g.fill();
    }
    // The peg crosses in front of the back rim and disappears behind the front of the hole.
    if(Math.abs(q.x-stand.x)<1){
      g.save();g.beginPath();g.rect(x-12,y-ringHeight/2,24,ringHeight*.44);g.clip();drawStand();g.restore();
    }
    g.save();g.font='bold 21px "Magnet Quest Sans",sans-serif';g.textBaseline='middle';g.textAlign='center';g.fillStyle='#fff';g.strokeStyle='#233b46';g.lineWidth=3;
    for(const [label,dx,dy] of [[top,-49,-16],[bottom,21,28]] as const){g.strokeText(label,x+dx,y+dy);g.fillText(label,x+dx,y+dy);}
    g.restore();
    if(Math.abs(q.x-68)>6)v.label(`${i+1}번 고리`,pt(q.x,q.y-9),true);
  };
  // Recalculate released geometry for activities saved with the previous artwork.
  if(v.has('ringReleased'))for(const [id,p] of Object.entries(positions()))v.set(id,p);
  v.draw=()=>{
    v.base();
    drawStand();
    if(!v.has('ringReleased')&&!v.animating){
      for(let i=0;i<count;i++)if(distance(v.p(`ring${i}`,tray(i)),slot(i))>2)v.target(slot(i),'',ringWidth+8,62);
    }
    for(let i=0;i<count;i++)drawRing(i);
    const upper=v.p(`ring${count-1}`,tray(count-1));
    if(Math.abs(upper.x-68)<7||v.animating||v.has('ringReleased'))v.hand(pt(slot(count-1).x+6,slot(count-1).y-1),release,'고리');
    if(v.has('ringReleased')){
      const floating=Array.from({length:count-1},(_,i)=>ringFloating(pole(i),pole(i+1)));
      const message=floating.every(Boolean)?'같은 극끼리 밀어내서 떠 있어':floating.some(Boolean)?'마주 보는 극에 따라 간격이 달라':'다른 극끼리 끌어당겨 붙었어';
      v.label(message,pt(36,52),true);
    }
    v.label(r<2?`${count}개 고리를 서로 떨어져 있게!`:`${count}개 고리를 서로 붙게!`,pt(50,29),true);
  };
  for(let i=0;i<count;i++){
    v.drag(`ring${i}`,tray(i),p=>{v.a.values.ringReleased=false;release=0;if(distance(p,slot(i))<11)v.set(`ring${i}`,slot(i));v.draw();},()=>{v.a.values.ringReleased=false;release=0;});
    const b=v.c.root.querySelector<HTMLElement>(`[data-drag="ring${i}"]`);b?.addEventListener('dblclick',()=>flipRing(i));
    const flip=document.createElement('button');flip.className='ring-flip';flip.textContent=`${i+1}번 뒤집기`;flip.setAttribute('aria-label',`${i+1}번 고리 뒤집기`);flip.style.left=`${tray(i).x}%`;flip.style.top='84%';flip.addEventListener('click',()=>flipRing(i));v.c.root.querySelector('.mission-board')!.append(flip);
  }
  v.button('check',()=>{
    if(v.animating)return;
    if(v.has('ringReleased'))return v.tell('고리를 뒤집어 마주 보는 극을 바꿔 봐.');
    if(!Array.from({length:count},(_,i)=>{const q=v.p(`ring${i}`,tray(i));return Math.abs(q.x-68)<7&&Math.abs(q.y-slot(i).y)<7;}).every(Boolean))return v.tell(`고리를 아래부터 ${count===2?'1, 2':'1, 2, 3'}번 순서로 점선에 놓아 줘.`);
    const initial=snapshot(),targets=positions();
    const pairs=Array.from({length:count-1},(_,i)=>ringFloating(pole(i),pole(i+1)));
    const correct=pairs.every(floats=>floats===(r<2)),allFloat=pairs.every(Boolean);
    v.settle(targets,()=>{
      v.a.values.ringReleased=true;release=1;
      const trial=v.proof(correct?(v.compact&&r===2?'join2':['float2','float3','join3'][r]):`rings-failed${r}`,r<2?`${count}개 고리 띄우기`:`${count}개 고리 붙이기`,correct?'success':'failure');
      trial.initialObjects=initial;trial.objects=snapshot();
      playEffect(allFloat?'compare':'snap',v.s.settings);
      if(!correct){
        v.tell(r<2?'다른 극이 마주 본 곳은 붙었어. 고리를 뒤집어 봐.':'같은 극이 마주 본 곳은 떠 있어. 고리를 뒤집어 봐.');v.draw();return;
      }
      v.mark(`done${r}`,'고리 배치 문제 해결',r<2?'같은 극이 마주 보자 고리가 밀려 떠올랐어.':'다른 극이 마주 보자 두 면이 맞닿았어.');v.refresh();
    },t=>{release=handRelease(t);const motion=afterHandRelease(t);return allFloat?1-Math.exp(-5*motion)*Math.cos(6*motion)*(1-motion):Math.min(1,(motion/.78)**2);},900);
  });
  v.button('next',()=>{v.a.values.round=v.compact?2:r+1;v.a.values.ringReleased=false;if(v.compact){for(let i=0;i<count;i++)v.set(`ring${i}`,slot(i));}else v.a.points={};v.refresh();});
  v.button('view3d',()=>v.c.root.dispatchEvent(new CustomEvent('open-3d',{bubbles:true,detail:{kind:'rings',released:v.has('ringReleased'),rings:Array.from({length:count},(_,i)=>{const q=v.p(`ring${i}`,tray(i));return {top:pole(i),onPole:v.has('ringReleased')||Math.abs(q.x-68)<7&&Math.abs(q.y-slot(i).y)<7};})}})));
}
