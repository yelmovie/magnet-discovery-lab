import { opposite, type Point } from './domain';
import { assemblyAligned, assemblyIssue, distance } from './mission-model';
import { playEffect } from './game-audio';
import { mailbox, lidPosition, mountedMagnet } from './mailbox';
import { drawMailbox, drawAssemblyCase } from './mailbox-art';

import { Surface, pt, clamp } from './mission-surface';

function workshopTank(v:Surface,x:number,y:number,width:number,height:number){
  const tank=v.asset('aquarium-window','/assets/quest/aquarium-window.webp');
  if(tank.complete&&tank.naturalWidth)v.ctx.drawImage(tank,x,y,width,height);
  else if(!v.sprite('aquarium',x,y,width,height)){
    const g=v.ctx;g.save();g.fillStyle='#bee4e6';g.strokeStyle='#40858a';g.lineWidth=4;
    g.fillRect(x,y,width,height);g.strokeRect(x,y,width,height);g.restore();
  }
}
function workshopGrip(v:Surface,p:Point,outside:boolean){
  const atlas=v.asset('aquarium-cleaner-parts','/assets/quest/aquarium-cleaner-parts.webp');
  const w=outside?100:76,h=outside?86:84;
  if(atlas.complete&&atlas.naturalWidth){
    const rowHeight=atlas.naturalHeight/4;
    v.ctx.drawImage(atlas,0,outside?0:rowHeight,atlas.naturalWidth,rowHeight,p.x*12.8-w/2,p.y*7.2-h/2,w,h);
  }else if(outside)v.magnet(p,'N',.65);
  else if(!v.equipment('pad',p,w,h))v.iron(p,'',68);
}
function workshopParts(v:Surface,m:Point,t:Point,remote:boolean){
  const left=remote?'손잡이 속 자석':'덮개에 넣을 자석',right=v.s.design.pair==='iron'?'철판':'두 번째 자석';
  if(!remote)drawAssemblyCase(v.ctx,v.asset('mailbox-wood','/assets/quest/mailbox-wood.webp'));
  v.target(pt(43,55),'',142,72);v.target(pt(57,55),'',142,72);
  v.label(left,pt(41,46),true);v.label(remote?'패드 속 '+right:'몸체에 붙일 '+right,pt(60,46),true);
  if(remote){
    const g=v.ctx;g.save();g.strokeStyle='#459da5';g.lineWidth=7;g.beginPath();g.moveTo(640,345);g.lineTo(640,457);g.stroke();g.restore();
    v.label('유리',pt(50,65),true);
  }
  v.magnet(m,opposite(v.s.design.pole),.76);
  if(v.s.design.pair==='iron')v.hardware('plate',t);else v.magnet(t,'N',.76);
}
export function design(v: Surface){
  const chosen=v.has('chosen'),remote=v.s.design.template==='remote';
  const changed=()=>{v.s.design.revision++;v.c.touch();v.c.meta();};
  v.draw=()=>{v.base();if(!chosen)return;
    const body=v.p('base',pt(18,65)),fixed=v.has('base');
    if(!fixed)v.target(pt(50,61),'몸체 놓는 곳',405,160);
    const w=fixed?415:200,h=remote?w/2.4:w*.56;
    if(remote)workshopTank(v,body.x*12.8-w/2,body.y*7.2-h/2,w,h);
    else if(!fixed){
      const g=v.ctx;g.save();g.translate(body.x*12.8,body.y*7.2);g.scale(.42,.42);g.translate(-620,-435);
      drawMailbox(g,v.asset('mailbox-wood','/assets/quest/mailbox-wood.webp'),mailbox.handleClosed);g.restore();
    }
    if(!fixed)v.label(remote?'유리 수조':'우편함 몸체',pt(body.x,body.y+12),true);
    const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));
    if(fixed)workshopParts(v,m,t,remote);
    else{
      v.magnet(m,opposite(v.s.design.pole),.76);v.label('조작 자석',pt(m.x,m.y+6),true);
      if(v.s.design.pair==='iron')v.hardware('plate',t);else v.magnet(t,'N',.76);
      v.label(v.s.design.pair==='iron'?'철판':'짝 자석',pt(t.x,t.y+6),true);
    }
    const tested=v.a.trials?.some(t=>t.key==='prototype'&&t.designRevision===v.s.design.revision);
    if(tested){const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));if(!assemblyIssue(m,t,remote))v.arrow(t,pt(t.x+(v.s.design.pair==='magnet'&&v.s.design.pole==='N'?7:-7),t.y));}
  };
  for(const template of ['box','remote'] as const)v.button(template,()=>{v.s.design={template,pair:'iron',pole:'N',gap:65,aligned:false,revision:v.s.design.revision+1};v.a.values.chosen=true;v.a.points={};v.refresh();});
  if(!chosen)return;
  const base=v.c.root.querySelector<HTMLButtonElement>('[data-drag="base"]')!;
  base.disabled=v.has('base');
  v.drag('base',pt(18,65),p=>{if(distance(p,pt(50,61))<13){v.set('base',pt(50,61));base.disabled=true;v.mark('base','장치 몸체','시민의 요청에 맞는 몸체를 놓았어.');}v.draw();});
  const align=()=>{const m=v.p('design-magnet',pt(22,44)),t=v.p('design-target',pt(77,45));v.s.design.gap=distance(m,t)*2;v.s.design.aligned=assemblyAligned(m,t,remote);changed();v.draw();};
  const seat=(id:string,p:Point,center:Point)=>{
    if(v.has('base')&&distance(p,center)<2.5){v.set(id,center);playEffect('snap',v.s.settings);}
    align();
  };
  v.drag('design-magnet',pt(22,44),p=>{seat('design-magnet',p,pt(43,55));v.mark('magnet','자석 배치','자석의 위치를 직접 정했어.');});
  v.drag('design-target',pt(77,45),p=>{seat('design-target',p,pt(57,55));v.mark('target','대상 부품 배치','자석과 마주 볼 부품의 위치를 정했어.');});
  v.button('flip',()=>{v.s.design.pole=opposite(v.s.design.pole);changed();v.draw();});
  v.button('pair',()=>{v.s.design.pair=v.s.design.pair==='iron'?'magnet':'iron';changed();v.refresh();});
  v.button('prototype',()=>{
    if(!v.has('base')||!v.has('magnet')||!v.has('target'))return v.tell('몸체와 두 부품을 모두 배치한 뒤 시험해 줘.');
    const magnet=v.p('design-magnet',pt(22,44)),target=v.p('design-target',pt(77,45)),d=v.s.design;
    d.gap=distance(magnet,target)*2;
    d.aligned=assemblyAligned(magnet,target,remote);
    const issue=assemblyIssue(magnet,target,remote);
    const attracts=d.pair==='iron'||d.pole==='S',good=!issue&&attracts;
    v.proof('prototype','내 설계 시제품의 반응 시험',good?'success':'failure',{gap:d.gap,aligned:d.aligned,pair:d.pair,pole:d.pole});
    v.tell(issue||(attracts?'서로 당겨지는 배치야! 이제 실제 장치에서 사용해 보자.':'마주 보는 극이 같아 서로 밀어내. 붙잡으려면 한쪽 자석을 뒤집어 봐.'),good);
    v.draw();
  });
}
export function useDesign(v: Surface){
  const r=Number(v.a.values.round||0),remote=v.s.design.template==='remote',adjusting=v.has('adjusting');
  const m=v.p('design-magnet',v.s.activities[9]?.points['design-magnet']||pt(43,55)),t=v.p('design-target',v.s.activities[9]?.points['design-target']||pt(57,55));
  const sync=()=>{const a=v.p('design-magnet',m),b=v.p('design-target',t);v.s.design.gap=distance(a,b)*2;v.s.design.aligned=assemblyAligned(a,b,remote);};
  const resetHandle=()=>{delete v.a.points['operating-magnet'];delete v.a.points['operating-target'];v.set('use-handle',remote?v.p('design-magnet',m):mailbox.handleOpen);};
  const change=()=>{sync();resetHandle();v.s.design.revision++;delete v.a.values.use0;delete v.a.values.use1;delete v.a.values['force-arrow'];v.a.values.round=0;v.tell('배치를 고쳤어. 조작 손잡이로 돌아가 다시 시험해 봐.');v.refresh();};
  sync();
  const destination=pt(t.x,r===0?42:66);
  const forceSpot=remote?pt((m.x+t.x)/2,v.p('operating-target',t).y):pt(mailbox.plate.x,62);
  const atGoal=()=>remote?!!v.a.points['operating-magnet']&&!!v.a.points['operating-target']&&Math.abs(v.a.points['operating-target'].y-destination.y)<4:v.p('use-handle',mailbox.handleOpen).y>=mailbox.handleClosed.y;
  v.draw=()=>{
    v.base();
    const handle=v.p('use-handle',remote?m:mailbox.handleOpen),g=v.ctx;
    if(adjusting){
      workshopParts(v,v.p('design-magnet',m),v.p('design-target',t),remote);
    }else if(remote){
      const pad=v.p('operating-target',t);
      workshopTank(v,637,244,425,300);
      g.save();g.lineWidth=9;g.strokeStyle='#2396a2';g.beginPath();g.moveTo(640,249);g.lineTo(640,538);g.stroke();g.restore();
      v.label('유리 밖',pt(41,35),true);v.label('물속',pt(68,35),true);
      v.target(destination,'',109,83);
      const goalLabel=r===0?'위층 도착 칸':'아래층 도착 칸';
      v.label(goalLabel,pt(Math.min(75,destination.x+13),destination.y),true);
      workshopGrip(v,pad,false);workshopGrip(v,handle,true);
      v.label('빨간 손잡이',pt(Math.max(14,handle.x-12),handle.y),true);v.label('유리벽',pt(50,78),true);
    }else{
      const lid=lidPosition(handle),open=(mailbox.handleClosed.y-lid.y)/(mailbox.handleClosed.y-mailbox.handleOpen.y);
      v.mailboxBody(r,lid,false,r===0?'편지가 든 우편함':'책이 든 보관함');
      const aligned=!assemblyIssue(m,t,false);
      const shift=((m.x-43)+(t.x-57))/2;
      const strike=pt(mailbox.plate.x+(aligned?shift:t.x-57),mailbox.plate.y);
      if(open>.23){
      if(v.s.design.pair==='iron')v.fixedPlate(strike);else v.magnet(strike,'N',.55);
      }
      const mounted=mountedMagnet(lid);
      if(open>.58)v.magnet(pt(mounted.x+(aligned?shift:m.x-43),mounted.y),opposite(v.s.design.pole),.58);
      if(open>.18){v.arrow(pt(36,43),pt(36,59));v.label('내려 닫기',pt(31,62),true);}
    }
    if(v.has('use1')&&!v.compact&&!adjusting){const arrow=v.p('force-arrow',pt(16,78));v.arrow(arrow,pt(arrow.x+9,arrow.y));v.target(forceSpot,'힘이 작용한 곳',120,70);}
  };
  if(adjusting){v.drag('design-magnet',m,change);v.drag('design-target',t,change);}
  else{
    const constrain=(p:Point)=>remote?pt(m.x,clamp(p.y,35,72)):lidPosition(p);
    const move=(handle:Point)=>{
      if(!remote)return;
      v.set('operating-magnet',handle);
      if(!assemblyIssue(m,t,true)&&(v.s.design.pair==='iron'||v.s.design.pole==='S'))v.set('operating-target',pt(t.x,handle.y));
    };
    v.drag('use-handle',remote?m:mailbox.handleOpen,p=>{
      move(p);
      v.tell(atGoal()?(remote?'패드가 도착했어! 사용 시험으로 확인해 봐.':'덮개를 닫았어! 사용 시험을 눌러 잘 붙잡는지 확인해 봐.'):remote?'빨간 손잡이를 위아래로 움직여 물속 패드를 점선 칸에 맞춰 봐.':'나무 손잡이를 잡고 아래로 끝까지 내려 줘.');
      v.draw();
    },move,constrain);
  }
  v.button('test',()=>{sync();const issue=assemblyIssue(v.p('design-magnet',m),v.p('design-target',t),remote);if(issue){v.proof(`failed${r}`,'내 발명품 사용 시험','failure',{gap:v.s.design.gap,aligned:v.s.design.aligned,reason:issue});return v.tell(issue);}
    if(v.s.design.pair==='magnet'&&v.s.design.pole==='N')return v.tell('같은 극끼리 밀어내고 있어. 배치 고치기를 열고 자석을 뒤집어 봐.');
    if(!atGoal())return v.tell(remote?`빨간 손잡이를 움직여 물속 패드를 ${r===0?'위':'아래'}층의 점선 칸에 맞춰 줘.`:'나무 손잡이를 잡고 아래로 끝까지 내려 덮개를 닫아 줘.');
    // Canonical design convention uses pole S for a successful box magnet pair.
    v.mark(`use${r}`,'다른 조건에서 사용',remote?'유리 밖 손잡이로 물속 패드를 옮겼어.':r===0?'편지를 넣고도 덮개가 고정됐어.':'책을 넣고도 덮개가 고정됐어.');v.proof(`use${r}`,v.compact?'내 설계의 실제 사용 시험':'내 설계로 두 조건 사용 시험','success',{gap:v.s.design.gap,aligned:true,load:remote?(r===0?'upper-pad':'lower-pad'):(r===0?'letter':'book')});
    // This interoperable proof lets the final restoration use the student's actual design.
    v.a.values.adjusting=false;v.proof('use','현재 발명 설계 작동','success',{gap:v.s.design.gap,aligned:true});v.refresh();
  });
  v.button('next',()=>{v.a.values.round=1;if(!remote)v.set('use-handle',mailbox.handleOpen);v.refresh();});
  v.button('adjust',()=>{v.a.values.adjusting=!adjusting;v.refresh();});
  v.button('flip',()=>{v.s.design.pole=opposite(v.s.design.pole);change();});
  if(v.has('use1')&&!v.compact&&!adjusting){
    const zone=document.createElement('div');zone.className='force-drop-zone';zone.style.left=`${forceSpot.x}%`;zone.style.top=`${forceSpot.y}%`;zone.setAttribute('aria-hidden','true');v.c.root.querySelector('.mission-board')!.append(zone);
    v.drag('force-arrow',pt(16,78),p=>{if(distance(p,forceSpot)<11){v.mark('force-arrow','힘이 작용한 곳 표현','내 발명품의 자석과 대상 사이에 힘 화살표를 놓았어.');v.tell('그 자리에서 어떤 물체가 어떤 물체를 당겼는지 이야기해 줘.',true);}else v.tell('선택한 화살표를 ‘힘이 작용한 곳’ 점선 안에 놓아 줘.');v.draw();});
  }
}
