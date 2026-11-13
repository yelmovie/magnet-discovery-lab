import { emptyActivity, type Activity, type Point, type Save } from './domain';
import { sortingSpecimens } from './material-sorting';
import type { View } from './activity-types';
import { missionGuide, missionQuestion, questRewards } from './mission-content';
import { bindPuzzleHud, puzzleHud } from './puzzle-hud';
import { mailbox, updateMailboxLayout } from './mailbox';
import { clipCompareView, clipStops } from './clip-comparison';
import { handImages } from './experiment-hand';
import { mailboxParts, partKey, nextMailboxPart, mailboxAssembled, prepareMailboxAssembly } from './mailbox-assembly';

import { Surface, W, H, pt, paperStart, e, themes, type Hit } from './mission-surface';
import { inspect, inspectionNote, repair } from './missions-mailbox';
import { salvage, distanceLab, liveKeyLab } from './missions-force';
import { poles, rings } from './missions-poles';
import { aquarium, delivery } from './missions-remote';
import { design, useDesign } from './missions-workshop';
import { validTrial } from './trial-records';
import { deliveryCourse, missionReady } from './mission-model';
import { bindInquiryPrompts } from './inquiry-prompts';

function hit(h: Hit) {
  // Match the whole pictured object, including its ends, rather than only its centre.
  const handle=h.id==='lid'||h.kind==='lid-handle';
  const sticker=/^sticker[NS]$/.test(h.id);
  const magnet=/magnet|probe|controller|cleaner/.test(h.id)||h.kind==='remote-handle';
  const magnetWidth:Record<string,number>={'hidden-magnet':116,'repair-magnet':116,'sweep-magnet':144,'distance-magnet':130,probe:192,cleaner:102,controller:116,'design-magnet':124,'use-handle':124};
  const assemblyPart=mailboxParts.find(part=>partKey(part)===h.id);
  const size=assemblyPart?assemblyPart.size:handle?[130,66]:/^ring/.test(h.id)?[166,75]:/^material/.test(h.id)?[102,102]:h.id==='paper'?[102,146]:h.id==='base'?[204,148]:magnet?[magnetWidth[h.id]||156,68]:h.id==='design-target'?[128,76]:[72,72];
  const grip=sticker?`<span class="canvas-pole-sticker pole-${h.id.slice(-1)}" aria-hidden="true">${h.id.slice(-1)}</span>`:'';
  return `<button class="canvas-hit ${h.kind ? `canvas-${h.kind}` : ''} ${handle?'canvas-handle':''} ${magnet?'canvas-magnet-hit':''}" data-drag="${h.id}" style="left:${h.p.x}%;top:${h.p.y}%;width:${size[0]/W*100}%;height:${size[1]/H*100}%" aria-label="${e(h.label)}. 끌어서 이동, 방향키로 이동 후 Enter로 놓기.">${grip}<span class="sr-only">${e(h.label)}</span></button>`;
}
function action(id: string, text: string, disabled = false) { return `<button class="mission-action" data-mission="${id}" ${disabled?'disabled':''}>${text}</button>`; }
function initialize(a: Activity, n: number) {
  if(a.values.playVersion===4)return;
  // Completed historical evidence is immutable. New attempts start a coherent new experiment.
  const fresh=emptyActivity();a.points=fresh.points;a.values={playVersion:4,mechanicsVersion:1,paceVersion:1};a.records=fresh.records;a.trials=[];a.mask=[];
  a.values.round=0;
  // Puzzle courses start with new attempts only; an activity already in progress keeps its rules.
  if(n>=2&&n<=8){a.values.puzzleVersion=1;a.values.puzzleRevision=2;}
}
export function prepareQuickMailbox(a: Activity) {
  initialize(a,2);
  updateMailboxLayout(a);
  const verified=a.values.with0===true&&a.trials?.some(t=>t.key==='repair0'&&validTrial(t)&&t.outcome==='success');
  if(a.values.assemblyVersion!==1){
    a.points['repair-magnet']=verified?mailbox.socket:mailbox.looseMagnet;
    a.points.lid=verified?mailbox.handleClosed:mailbox.handleOpen;
    a.values.repairClosed=Boolean(verified);
    prepareMailboxAssembly(a);
    if(verified)for(const part of mailboxParts)a.values[partKey(part)]=true;
  }
  a.values.round=0;
  a.values.mailboxQuickRepair=true;
}
export function missionView(n: number, a: Activity, s: Save): View {
  initialize(a,n);
  // Resume attempts saved on the removed return leg at the glass delivery result.
  if(n===8&&a.values.puzzleRevision===2&&a.values.round===2){
    const delivered=a.trials?.find(t=>t.key==='delivery1'&&validTrial(t)&&t.outcome==='success');
    a.values.round=1;a.values.car=delivered?.objects.find(o=>o.id==='cart-magnet')?.x??(delivered?deliveryCourse.goal:44);
    a.values.cartSpeed=0;a.values.controllerPole=delivered?.objects.find(o=>o.id==='controller')?.pole??'N';
    a.points=Object.fromEntries((delivered?.objects??[]).map(o=>[o.id,pt(o.x,o.y)]));
  }
  if(n===2&&a.values.mailboxQuickRepair===true)prepareQuickMailbox(a);
  if(n===4&&a.values.puzzleRevision===2&&!a.values.liveKeyRescue&&!missionReady(n,a,s)){
    a.values.liveKeyRescue=true;
    a.points['distance-magnet']=pt(25,55);
    a.points['initial:distance-magnet']=pt(25,55);
  }
  const round=Number(a.values.round||0), compact=a.values.paceVersion===1, quick=n===2&&a.values.mailboxQuickRepair===true, hits:Hit[]=[];let actions='', comparison='';
  const keyRescue=n===4&&a.values.liveKeyRescue===true;
  if(n<=2)updateMailboxLayout(a);
  const p=(id:string, fallback:Point)=>a.points[id]||fallback;
  if(n===1||quick&&!mailboxAssembled(a)){
    prepareMailboxAssembly(a);
    if(!mailboxAssembled(a)){
      const next=nextMailboxPart(a)!;
      for(const part of mailboxParts)hits.push({id:partKey(part),p:p(partKey(part),part.start),label:part.name});
      actions=action('fit-part',`${mailboxParts.indexOf(next)+1}. ${next.button}`);
    }else{
    comparison=`<aside class="mailbox-inspection" aria-label="우편함 조사 진행">${inspectionNote(a)}</aside>`;
    if(a.values.fixedMailbox!==true){
      delete a.points['hidden-magnet'];
      delete a.points['initial:hidden-magnet'];
      a.points.lid=a.values[`latch${round}`]?mailbox.handleClosed:a.values[`found${round}`]?mailbox.handleOpen:mailbox.handleClosed;
      a.values.fixedMailbox=true;
    }
    hits.push({id:'lid',p:p('lid',mailbox.handleClosed),label:'나무 손잡이. 위로 열고 아래로 닫기'});
    const inspected=a.values[`latch${round}`]===true;
    if(!inspected)actions+=action('close-lid','손잡이 내려 덮개 닫기');
    if(!compact&&inspected&&round===0)actions+=action('next','책 보관함도 살펴보기 →');
    }
  }
  if(n===2&&(!quick||mailboxAssembled(a))){hits.push({id:'repair-magnet',p:p('repair-magnet',mailbox.looseMagnet),label:'넣고 뺄 수 있는 자석'},{id:'lid',p:p('lid',mailbox.handleOpen),label:'덮개 손잡이'});if(!quick&&(round===2||a.values.puzzleVersion===1&&round===0))hits.push({id:'repair-plate',p:p('repair-plate',pt(75,47)),label:'자리가 어긋난 철판'});actions=action('shake','흔들어 열리는지 보기',quick&&missionReady(n,a,s));if(!quick&&!compact&&a.values.with0&&a.values.without0&&round===0)actions=action('next','책 보관함도 고쳐 주기 →');if(a.values.with1&&a.values.without1&&round===1)actions=action('next','새 우편함의 철판도 맞춰 줘 →');}
  if(n===2&&round===2&&!a.values.diagnosis2)actions+=`<div class="mission-diagnosis">${action('fault-distance','철판 위치를 고칠래')}${action('fault-color','자석 색을 바꿀래')}</div>`;
  if(n===3){hits.push({id:'sweep-magnet',p:p('sweep-magnet',pt(20,39)),label:'수리 키트의 자석'});sortingSpecimens.forEach(m=>{if(!a.values[`sorted-${m.id}`])hits.push({id:`material-${m.index}`,p:p(`material-${m.index}`,m),label:`${m.name}. 자석 반응을 확인한 뒤 알맞은 분류함으로 옮기기`});});}
  if(n===4){
    hits.push({id:'distance-magnet',p:p('distance-magnet',pt(25,55)),label:keyRescue?'틈 밖에서 좌우로 움직이는 막대자석':'눈금 위에서 좌우로 움직이는 조사 자석'});
    if(keyRescue)comparison='<span class="key-rescue-gap-label">손이 닿지 않는 틈</span>';
    if(round===2&&!a.values.liveKeyRescue){
      if(a.points.paper?.x===23&&a.points.paper.y===76)a.points.paper={...paperStart};
      hits.push({id:'paper',p:p('paper',paperStart),label:'얇은 종이 한 장'});
    }
    if(!a.values.liveKeyRescue){
      actions=action('release',`<img class="release-hand-icon" src="${handImages.released}" alt="">손 놓고 관찰`,a.values[`done${round}`]===true);
      if(round===1&&!a.values.done1&&a.values.puzzleRevision!==2)comparison=`<div class="distance-choices" role="group" aria-label="붙을 것 같은 자리 고르기"><span>붙을 것 같은 곳은?</span>${[4,3,2,1].map(mark=>action(`gap-${mark}`,`${mark}칸`)).join('')}</div>`;
      if(a.values[`done${round}`]&&round<(compact?2:3))actions=action('next',round===0?'붙을 것 같은 자리 고르기 →':round===1?'같은 배치에 종이만 넣어 보기 →':'이번엔 철 열쇠를 구하자 →');
    }
  }
  if(n===4&&round===2&&a.values.done2&&a.values.puzzleRevision!==2){
    const stops=clipStops(a.trials);
    if(stops){comparison=clipCompareView(stops);actions=action('replay-pull','▶ 두 실험 다시 보기')+(compact?'':actions);}
  }
  if(n===5){hits.push({id:'probe',p:p('probe',pt(29,54)),label:'기준 자석'},{id:'stickerN',p:p('stickerN',pt(33,78)),label:'N극 스티커'},{id:'stickerS',p:p('stickerS',pt(47,78)),label:'S극 스티커'});actions=action('flip','기준 자석 뒤집기');if(!compact&&a.values.solved0&&a.values.test0N&&a.values.test0S&&round===0)actions=action('next','두 번째 문 자석 조사 →');}
  if(n===5&&a.values.puzzleRevision===2&&a.values.doorOpen&&!a.values.doorPullOpen&&!a.values.doorIndex)actions=action('door-next','이번에는 당겨 여는 문 →');
  if(n===6){
    if(!a.values.platformCrossed)for(let i=0;i<(compact||round===0?2:3);i++)hits.push({id:`ring${i}`,p:p(`ring${i}`,pt(23+i*16,73)),label:`${i+1}번 고리자석`});
    if(a.values[`done${round}`]&&round<2)actions=action('next',a.values.platformRaised&&(compact||round===1)?'다음: 발판 내리기 →':compact?'이번엔 두 고리를 붙여 줘! →':round===0?'세 개도 띄워 볼까? →':'이번엔 모두 붙여 줘! →');
    else if(!a.values.platformCrossed)actions=action('check',`<img class="release-hand-icon" src="${handImages.released}" alt="">손 놓고 고리 관찰`);
  }
  if(n===7)hits.push({id:'cleaner',p:p('cleaner',pt(27,47)),label:'유리 밖 청소 자석 손잡이'});
  if(n===8){hits.push({id:'controller',p:p('controller',pt(20,40)),label:'택배 조종 자석'});actions=action('flip','조종 자석 뒤집기')+action('detach','자석 떼기');}
  if(n===8&&a.values.puzzleRevision===2&&round===0&&a.values.segment0)actions=action('delivery-next','유리벽 너머로 배달 →');
  if(n===9){
    if(!a.values.chosen)actions=`<div class="mission-requests workshop-requests">${action('box','<img src="/assets/learning/mailbox.webp" alt="">우편함이 자꾸 열려요')}${action('remote','<img src="/assets/learning/aquarium.webp" alt="">유리 너머 패드를 옮겨 주세요')}</div>`;
    else {hits.push({id:'base',p:p('base',pt(18,65)),label:'장치 몸체'},{id:'design-magnet',p:p('design-magnet',pt(22,44)),label:'설계 자석'},{id:'design-target',p:p('design-target',pt(77,45)),label:'마주 볼 철판 또는 자석'});actions=action('pair',s.design.pair==='iron'?'자석으로 바꾸기':'철판으로 바꾸기')+action('flip','자석 뒤집기')+action('prototype','시제품 반응 시험');}
  }
  if(n===10){
    const remote=s.design.template==='remote',magnet=s.activities[9]?.points['design-magnet']||pt(43,55),target=s.activities[9]?.points['design-target']||pt(57,55);
    if(a.values.adjusting){
      hits.push({id:'design-magnet',p:p('design-magnet',magnet),label:'내 설계 자석'},{id:'design-target',p:p('design-target',target),label:'내 설계 대상 부품'});
      actions=action('flip','자석 뒤집기')+action('adjust','조작 손잡이로');
    }else{
      hits.push({id:'use-handle',kind:remote?'remote-handle':'lid-handle',p:p('use-handle',remote?magnet:mailbox.handleOpen),label:remote?'유리 밖 빨간 조작 손잡이':'우편함 덮개의 나무 손잡이'});
      actions=(!compact&&a.values.use0&&round===0?action('next','다른 사용 상황으로 시험 →'):action('test','사용 시험'))+action('adjust','배치 고치기');
      if(!compact&&a.values.use1)hits.push({id:'force-arrow',p:p('force-arrow',pt(16,78)),label:'힘이 작용한 곳을 나타낼 화살표'});
    }
  }
  const stage=Math.floor((n-1)/2), tool=stage&&n!==8?questRewards[stage-1]:null;
  const canExpand=n===8||n===9||n===10;
  const wide=canExpand&&(a.values.benchWide===true||(a.values.benchWide===undefined&&n===8));
  const viewToggle=canExpand?`<button type="button" class="quest-text-button bench-view-toggle" data-mission="bench-view" aria-pressed="${wide}" aria-label="조작 화면 전체보기">${wide?'기본 보기':'조작 화면 전체보기'}</button>`:'';
  return {html:`<div class="mission-world stage-${stage+1}${wide?' bench-wide':''}" style="--mission-background:url('/assets/quest/stage-${themes[stage]}.webp')"><div class="mission-board play-board${keyRescue?' key-rescue-board':''}" aria-label="${e(missionQuestion(n,a))}"><canvas width="1280" height="720" aria-hidden="true"></canvas>${hits.map(hit).join('')}${comparison}<div class="inquiry-prompt-host"></div>${quick?'':puzzleHud(n,a)}<div class="mission-actions">${actions}</div><p class="mission-feedback" role="status" aria-live="polite"></p>${n===4?'<div class="force-sensor" role="status"><span></span></div>':[3,7].includes(n)?'<div class="force-sensor" aria-label="물체 사이 거리"><span>거리를 바꿔 봐</span><i aria-hidden="true"></i></div>':''}${tool?`<button class="mission-pocket" data-mission="tool" aria-label="${tool.name} 사용 도움">${e(tool.name)}</button>`:''}${n===6?'<button class="mission-action mission-3d" data-mission="view3d">3D로 돌려 보기</button>':''}</div>${viewToggle}</div>`,bind(c){
    const surface=new Surface(c,n);surface.button('tool',()=>{if(n===5){surface.a.values.lens=!surface.a.values.lens;surface.tell('관찰 렌즈로 처음 위치와 움직인 방향을 함께 볼 수 있어.');surface.draw();}else c.notify(tool?tool.use:missionGuide(n,a));});
    surface.button('bench-view',()=>{
      const world=c.root.querySelector<HTMLElement>('.mission-world')!,button=c.root.querySelector<HTMLButtonElement>('[data-mission="bench-view"]')!;
      const expanded=world.classList.toggle('bench-wide');
      button.setAttribute('aria-pressed',String(expanded));button.textContent=expanded?'기본 보기':'조작 화면 전체보기';
      a.values.benchWide=expanded;c.touch();surface.draw();
    });
    const binders=[inspect,repair,salvage,a.values.liveKeyRescue?liveKeyLab:distanceLab,poles,rings,aquarium,delivery,design,useDesign];binders[n-1](surface);surface.draw();surface.cleanups.push(bindInquiryPrompts(c,n,()=>surface.draw()));bindPuzzleHud(c);return()=>surface.cleanup();
  }};
}
