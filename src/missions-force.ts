import { type Point } from './domain';
import { materialBins, materialClassified, sortedMaterialPosition, sortingSpecimens } from './material-sorting';
import { distance, cellLabel, clearanceCells, nearRulerMark, distanceRuler, magneticReach, paperGapMiddle } from './mission-model';
import { playEffect } from './game-audio';
import { reachHints, sortHints } from './mission-content';
import { pullEase } from './clip-comparison';
import { handRelease, afterHandRelease } from './experiment-hand';

import { Surface, W, H, pt, paperStart, clamp } from './mission-surface';

export function salvage(v: Surface){
  let held=-1, heldSide=1;
  const magnet=v.p('sweep-magnet',pt(20,39)),bins=materialBins;
  const atPole=(p:Point)=>pt(p.x+heldSide*5,p.y+3.3);
  const sorted=()=>sortingSpecimens.filter(m=>materialClassified(v.a,m.id)).length;
  for(const m of sortingSpecimens)if(v.has(`sorted-${m.id}`))v.set(`material-${m.index}`,sortedMaterialPosition(m));
  const sort=(m:typeof sortingSpecimens[number],p:Point,byMagnet=false)=>{
    const i=m.index,bin=bins.findIndex(q=>distance(p,q)<10);
    if(bin<0)return false;
    if(!v.has(`tested-${m.id}`)){v.set(`material-${i}`,pt(m.x,m.y));v.tell(`${m.name}: 먼저 자석을 가까이 대고 반응을 확인해 줘.`);return false;}
    if((bin===0)!==m.magnetic){v.set(`material-${i}`,pt(m.x,m.y));held=-1;const wrong=m.id==='aluminum'?'알루미늄도 금속이지만 이번 자석에는 붙지 않았어. 관찰한 반응에 맞게 옮겨 줘.':'자석을 따라왔는지 떠올리고 알맞은 분류함에 옮겨 줘.';if(v.a.values.puzzleVersion===1)v.miss(wrong,sortHints);else{v.tell(wrong);playEffect('bump',v.s.settings);}return false;}
    v.mark(`sorted-${m.id}`,`${m.name} 분류`,bin===0?'붙는 재료로 분류했어.':'붙지 않는 재료로 분류했어.');
    if(m.magnetic&&byMagnet)v.mark(`delivered-${m.id}`,`${m.name} 운반`,'자석에 붙은 철 부품을 수리함으로 옮겼어.');
    v.set(`material-${i}`,sortedMaterialPosition(m));held=-1;
    const el=v.c.root.querySelector<HTMLButtonElement>(`[data-drag="material-${i}"]`);if(el){el.disabled=true;el.style.pointerEvents='none';}
    v.proof(`sort-${m.id}`,`${m.name} 관찰 후 분류`,'success',{material:m.id,magnetic:m.magnetic,byMagnet});
    const done=sorted(),total=sortingSpecimens.length;
    v.tell(done===total?'여섯 물건을 모두 분류했어! 금속이라고 모두 자석에 붙지는 않아.':`${m.name} 분류 완료! ${done}/${total}개를 분류했어.`,true);
    if(done===total)v.proof('materials','자석에 붙는 재료와 붙지 않는 재료를 관찰하고 분류');
    return true;
  };
  const scan=(p:Point)=>{
    if(held>=0){
      const m=sortingSpecimens.find(item=>item.index===held)!;
      const end=atPole(p);v.set(`material-${held}`,end);sort(m,end,true);return;
    }
    let nearest:typeof sortingSpecimens[number]|undefined,range=10;
    for(const m of sortingSpecimens){
      if(v.has(`sorted-${m.id}`))continue;
      const gap=distance(p,v.p(`material-${m.index}`,pt(m.x,m.y)));
      if(gap<range){nearest=m;range=gap;}
    }
    if(!nearest)return;
    const m=nearest,i=m.index,q=v.p(`material-${i}`,pt(m.x,m.y));
    if(!v.has(`tested-${m.id}`)){
      v.mark(`tested-${m.id}`,m.name,m.magnetic?'자석 가까이에서 붙었어.':'가까이 대도 따라오지 않았어.');
      v.tell(m.magnetic?'자석에 붙었어! 자석으로 오른쪽 위 수리함까지 옮겨 줘.':`${m.name}: 자석을 따라오지 않았어. 물건을 손으로 잡아 오른쪽 아래 분류함에 넣어 줘.`);
    }
    if(m.magnetic){held=i;heldSide=q.x>=p.x?1:-1;v.set(`material-${i}`,atPole(p));}
  };
  v.draw=()=>{
    v.base();v.target(bins[0],'붙는 재료 · 수리함',190,125);v.target(bins[1],'붙지 않는 재료 · 손으로',190,120);
    sortingSpecimens.forEach(m=>{
      const p=v.p(`material-${m.index}`,pt(m.x,m.y));
      if(v.has(`sorted-${m.id}`)){v.material(m.index,p,54,false);return;}
      v.material(m.index,p);
      if(v.has(`tested-${m.id}`))v.label(m.magnetic?'자석에 착!':'손으로 옮기기',pt(p.x,p.y-9),true);
    });
    v.magnet(v.p('sweep-magnet',magnet),'N',.9);
    v.label(`자석으로 조사하고 분류하기  ${sorted()}/${sortingSpecimens.length}`,pt(50,29),true);
  };
  v.drag('sweep-magnet',magnet,p=>{
    scan(p);
    if(held<0){
      const beside=sortingSpecimens.filter(m=>!m.magnetic&&!v.has(`sorted-${m.id}`)&&v.has(`tested-${m.id}`))
        .map(m=>v.p(`material-${m.index}`,pt(m.x,m.y))).sort((a,b)=>distance(p,a)-distance(p,b))[0];
      if(beside&&distance(p,beside)<10)v.set('sweep-magnet',pt(Math.max(4,beside.x-12),beside.y));
    }
    v.draw();
  },scan);
  sortingSpecimens.forEach(m=>{
    const i=m.index;if(v.has(`sorted-${m.id}`))return;
    v.drag(`material-${i}`,pt(m.x,m.y),p=>{if(held===i)held=-1;sort(m,p);v.draw();});
  });
}
export function distanceLab(v: Surface){
  const r=Number(v.a.values.round||0),target=r===3?pt(69,42):pt(61,55);
  const key=['far','near','paper','rescue'][r];
  const nearTrial=v.a.trials?.find(t=>t.key==='near'&&t.outcome==='success');
  const previous=nearTrial?.initialObjects.find(o=>o.id==='magnet');
  const comparisonPoint=previous?pt(previous.x,previous.y):pt(49,55);
  const {cell,contact,clipTip}=distanceRuler;
  const paperSlot=paperGapMiddle(comparisonPoint,target);
  const paperIn=()=>distance(v.p('paper',paperStart),paperSlot)<5;
  const rail=(p:Point)=>r===2?{...comparisonPoint}:pt(clamp(p.x,target.x-contact-6*cell,target.x-contact-cell/2),target.y);
  const magnet=v.c.root.querySelector<HTMLButtonElement>('[data-drag="distance-magnet"]')!;
  const paper=v.c.root.querySelector<HTMLButtonElement>('[data-drag="paper"]');
  const sensor=v.c.root.querySelector<HTMLElement>('.force-sensor span');
  let result=v.has(`done${r}`), released=result?1:0;
  let observed=v.a.values.distanceObserved===true&&r===1&&!result;
  if(observed)released=1;
  const q=()=>v.a.points['distance-magnet'];
  const start=v.p('distance-magnet',pt(25,target.y));
  // Completed historical trials retain their original coordinates, including off-axis placements.
  const heldAgain=()=>{observed=false;released=0;delete v.a.values.distanceObserved;};
  v.drag('distance-magnet',start,()=>{if(!result)heldAgain();v.draw();},()=>{if(!result)heldAgain();},result?p=>p:rail);
  for(const mark of [4,3,2,1])v.button(`gap-${mark}`,()=>{
    if(v.animating||result)return;
    heldAgain();v.set('distance-magnet',pt(target.x-contact-mark*cell,target.y));
    v.tell(`${mark}칸을 골랐어. 손을 놓으면 클립이 움직일까?`);v.draw();v.c.touch();v.c.meta();
  });
  if(paper)v.drag('paper',paperStart,p=>{
    if(distance(p,paperSlot)<5)v.set('paper',paperSlot);
    v.draw();
  });
  function drawSheet(){
    const p=v.p('paper',paperStart),g=v.ctx;
    const gapWidth=clearanceCells(comparisonPoint,target)*cell*W/100;
    const seatedWidth=clamp(gapWidth*.78,32,66);
    const turn=1-clamp((distance(p,paperSlot)-5)/12,0,1);
    const width=88+(seatedWidth-88)*turn,height=132;
    if(paper)paper.style.width=`${(width+12)/W*100}%`;
    if(!paperIn())v.target(paperSlot,'',seatedWidth+8,height);
    g.save();g.translate(p.x*W/100,p.y*H/100);
    // The sheet turns into the gap; its long edge stays upright and its face remains visible.
    g.transform(1,-.07-.16*turn,-.055*(1-turn),1,0,0);
    g.shadowColor='#4b382d50';g.shadowBlur=3;g.shadowOffsetX=1.2;g.shadowOffsetY=2;
    if(!v.sprite('paper-sheet',-width/2,-height/2,width,height)){
      g.fillStyle='#fffdf5';g.beginPath();g.moveTo(-width/2,-height/2);
      g.lineTo(width/2-10,-height/2);g.lineTo(width/2,-height/2+12);
      g.lineTo(width/2,height/2);g.lineTo(-width/2,height/2);g.closePath();g.fill();
    }
    g.restore();
    if(!result)v.label('종이 한 장',pt(p.x,p.y-12),true);
  }
  function drawRuler(startGap:number){
    const g=v.ctx,zero=(target.x-clipTip)*W/100,unit=cell*W/100,y=(target.y+17)*H/100;
    const mark=zero-Math.min(6,startGap)*unit;
    g.save();g.fillStyle='#fff4cc';g.strokeStyle='#896d38';g.lineWidth=2;
    g.beginPath();g.roundRect(zero-6*unit-14,y-4,6*unit+28,42,7);g.fill();g.stroke();
    g.fillStyle='#afd7cc';g.fillRect(mark,y,zero-mark,8);
    for(let tick=0;tick<=12;tick++){
      const x=zero-tick/2*unit;
      g.beginPath();g.moveTo(x,y);g.lineTo(x,y+(tick%2?7:14));g.stroke();
      if(tick%2===0)v.label(String(tick/2),pt(x/W*100,(y+26)/H*100),true);
    }
    if(r!==1){
      const goal=r===0?5:r===2?clearanceCells(comparisonPoint,target):1;
      const goalX=zero-unit*goal;
      g.fillStyle='#926128';g.fillRect(goalX-3,y+36,6,7);
      v.label(r===2?'같은 자리':'처음 자리',pt(goalX/W*100,(y+56)/H*100),true,'#755023');
    }
    g.setLineDash([4,5]);g.strokeStyle='#386961';
    for(const x of [zero,mark]){g.beginPath();g.moveTo(x,(target.y+4)*H/100);g.lineTo(x,y);g.stroke();}
    g.setLineDash([]);g.fillStyle='#2c726b';g.beginPath();g.moveTo(mark,y);g.lineTo(mark-7,y-9);g.lineTo(mark+7,y-9);g.fill();g.restore();
  }
  function landingPoint(m:Point){
    const d=distance(m,target);
    // Paper can transmit the attraction but is a physical barrier to the clip.
    const travel=r===2?Math.max(0,(d-contact)/2-.3):Math.max(0,d-contact);
    const t=d?travel/d:0;
    return pt(target.x+(m.x-target.x)*t,target.y+(m.y-target.y)*t);
  }
  v.draw=()=>{
    v.base();
    const m=q(),gap=clearanceCells(m,target),object=result&&r>0?(v.animating?v.a.points['moving-clip']:landingPoint(m)):target;
    magnet.disabled=result||r===2;if(paper)paper.disabled=result;
    drawRuler(gap);
    if(r===2)drawSheet();
    if(result&&(r===1||r===2)){
      v.ctx.save();v.ctx.globalAlpha=.26;v.material(0,target,74,false);v.ctx.restore();
      if(target.x-object.x>.6)v.arrow(pt(target.x,target.y+3),pt(object.x,target.y+3));
      v.label('클립 출발',pt(target.x+3,target.y-10),true);
    }
    if(r===3){
      if(v.equipment('key',object,74,74))v.label('철 열쇠',pt(object.x,object.y+8),true);
      else v.iron(object,'철 열쇠',50);
    }else v.material(0,object,74);
    v.magnet(m,'N',.7);
    v.hand(pt(target.x+2,target.y-3),released,r===3?'열쇠':'클립');
    for(const mark of [4,3,2,1])v.c.root.querySelector(`[data-mission="gap-${mark}"]`)?.setAttribute('aria-pressed',String(Math.abs(gap-mark)<.1));
    if(sensor){
      const text=`${result||observed?'놓기 전':'현재'} 간격 ${cellLabel(gap)} · ${result?(r===0?'움직이지 않았어':v.animating?(r===3?'철 열쇠가 움직이는 중':'클립이 움직이는 중'):r===2?'종이 너머로 끌려옴':'끌려옴'):observed?'움직이지 않았어 · 다른 자리도 골라 봐':r===2?'종이만 넣기':r===0?'5칸에서 관찰':'붙을 것 같은 곳을 골라 봐'}`;
      if(sensor.textContent!==text)sensor.textContent=text;
    }
  };
  v.button('release',()=>{
    if(result||v.animating)return;
    const m=q(),d=distance(m,target),gap=clearanceCells(m,target),measure=cellLabel(gap);
    if(r===0&&!nearRulerMark(m,target,5))return v.tell('자석 끝을 왼쪽 눈금 5까지 옮겨서 다시 관찰해 봐.');
    if(r===1&&gap>1.05){
      observed=true;v.a.values.distanceObserved=true;
      const trial=v.proof(`distance-choice-${Number(gap.toFixed(1))}`,`${measure}에서 관찰`,'none',{paper:false,clearanceCells:Number(gap.toFixed(1)),material:'iron'});
      trial.initialObjects=[{id:'magnet',...m},{id:'clip',...target}];trial.objects=structuredClone(trial.initialObjects);
      v.settle({},()=>{released=1;const still=`${measure}에서는 클립이 움직이지 않았어. 더 가까운 곳 중 붙을 것 같은 자리를 골라 봐.`;if(v.a.values.puzzleVersion===1)v.miss(still,reachHints);else v.tell(still);v.draw();v.c.touch();},t=>{released=handRelease(t);return t;},700);
      return;
    }
    if(r>1&&!magneticReach(m,target))return v.tell(`자석을 조금 더 가까이 옮기고 ${r===3?'열쇠':'클립'}를 살펴봐.`);
    if(r===2&&!paperIn())return v.tell('앞 실험의 간격은 그대로야. 얇은 종이만 점선 안에 넣어 봐.');
    if(r===2)v.set('paper',paperSlot);
    const end=r===0?target:landingPoint(m);
    const outcome=r===0?'움직이지 않았어.':r===2?'자석에 끌려와 종이 앞에서 멈췄어.':'자석에 끌려왔어.';
    v.mark(`done${r}`,'한 가지 조건 비교',`출발 간격 ${measure}${r===2?'에 종이 한 장을 넣으니':'에서'} ${r===3?'열쇠가':'클립이'} ${outcome}`);
    const trial=v.proof(key,`${measure} · ${r===2?'종이 한 장':'종이 없음'}`,'success',{paper:r===2,gap:d,clearanceCells:Number(gap.toFixed(1)),material:'iron'});
    const id=r===3?'key':'clip';
    trial.initialObjects=r===2&&nearTrial?structuredClone(nearTrial.initialObjects):[{id:'magnet',...m},{id,...target}];
    trial.objects=[{id:'magnet',...m},{id,...end}];
    result=true;
    v.set('moving-clip',target);
    v.settle({'moving-clip':end},()=>{released=1;delete v.a.points['moving-clip'];if(r>0)playEffect(r===2?'drop':'snap',v.s.settings);v.refresh();},t=>{released=handRelease(t);return pullEase(afterHandRelease(t));},r===0?700:1080);
  });
  const replay=v.c.root.querySelector<HTMLButtonElement>('[data-mission="replay-pull"]');
  if(replay){
    const clips=[...v.c.root.querySelectorAll<SVGGElement>('.clip-comparison [data-travel]')];
    let raf=0;
    v.cleanups.push(()=>cancelAnimationFrame(raf));
    v.button('replay-pull',()=>{
      cancelAnimationFrame(raf);
      const reduced=!v.s.settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
      const draw=(f:number)=>clips.forEach(el=>el.setAttribute('transform',`translate(${252-Math.min(Number(el.dataset.travel),132*f)} 57)`));
      if(reduced){draw(1);v.tell('두 클립 모두 자석 쪽으로 움직였어. 종이를 넣은 클립은 종이 앞에서 멈췄어.');return;}
      let elapsed=0,prev=performance.now();draw(0);
      const step=(now:number)=>{
        if(!document.hidden&&v.c.root.dataset.demoPaused===undefined&&!document.querySelector('dialog[open],.modal-backdrop'))elapsed+=Math.min(60,now-prev);
        prev=now;const f=Math.min(1,elapsed/1600);draw(pullEase(f));
        if(f<1)raf=requestAnimationFrame(step);
      };raf=requestAnimationFrame(step);
    });
  }
  v.button('next',()=>{
    v.a.values.round=r+1;v.a.points={};delete v.a.values.distanceObserved;
    if(r===1)v.a.points['distance-magnet']={...comparisonPoint};
    v.refresh();
  });
}
// Source rectangles exclude transparent margins so the visible faces share the drop coordinates.
