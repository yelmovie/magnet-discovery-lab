import { record, type Activity, type Save } from './domain';
import type { Context, View } from './activity-types';
import { missionView } from './mission-play';
import { missionReady } from './mission-model';
import { discoveries, inquiries, fieldMissions, playQuestions } from './inquiry-content';
import { defaultFieldSetup, explanationCorrect, fieldResult, inquiryPhase, inquiryReady, routeDirection, type FieldSetup } from './inquiry-model';
import { icon, magnet, objectArt, equipmentArt, sceneArt } from './art';
import { trialPicture, readableRecord } from './trial-records';

const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const choice=(group:string,value:string|number,label:string,selected:boolean)=>`<button type="button" class="inquiry-option ${selected?'selected':''}" data-inquiry-group="${group}" data-value="${value}" aria-pressed="${selected}">${label}</button>`;
const button=(id:string,label:string,disabled=false)=>`<button type="button" class="btn primary inquiry-button" data-inquiry="${id}" ${disabled?'disabled':''}>${label}${icon('arrow',20)}</button>`;
export function inquiryNext(n:number,a:Activity,s:Save):{label:string;enabled:boolean} {
  const phase=inquiryPhase(a);
  if(a.values.inquiryVersion===2){
    if(phase==='experiment')return {label:n%2?'다음 탐구로':'발견 정리',enabled:missionReady(n,a,s)};
    return {label:phase==='complete'?'구역 복구하기':'발견을 하나 골라 줘',enabled:missionReady(n,a,s)&&inquiryReady(n,a)};
  }
  if(phase==='experiment')return {label:'실험 증거로 설명하기',enabled:missionReady(n,a,s)};
  return {label:phase==='complete'?(n%2?'다음 탐구로':'구역 복구하기'):'지금 탐구를 먼저 마쳐 줘',enabled:phase==='complete'&&missionReady(n,a,s)&&inquiryReady(n,a)};
}
export function advanceInquiry(a:Activity):boolean {
  if(inquiryPhase(a)!=='experiment')return false;
  if(a.values.inquiryVersion===2&&Number(a.values.inquiryActivity)%2===1)return false;
  if(a.values.inquiryVersion===2){
    a.values.reflected=false;delete a.values.reflection;delete a.values.reflectionFeedback;
  }
  a.values.inquiryPhase='explain';return true;
}
function setupOf(a:Activity):FieldSetup {
  const p=defaultFieldSetup();
  for(const k of Object.keys(p) as (keyof FieldSetup)[])if(a.values[`field:${k}`]!==undefined)(p as unknown as Record<string,unknown>)[k]=a.values[`field:${k}`];
  return p;
}
function poleChoice(key:string,value:string){return `<div class="inquiry-options compact">${['N','S'].map(p=>choice(key,p,`<span class="pole-chip pole-${p}">${p}극</span>`,value===p)).join('')}</div>`;}
/** Field conditions are pressed like switches on the bench, not picked from a form list. */
function fieldChoice(key:string,label:string,options:[string|number|boolean,string,boolean,string?][]){
  return `<div class="field-setting" role="group" aria-label="${label}"><span class="field-setting-label">${label}</span><div class="inquiry-options compact field-choices">${options.map(([v,text,on,art])=>choice(key,String(v),`${art?`<span class="field-chip-art" aria-hidden="true">${art}</span>`:''}<span>${text}</span>`,on)).join('')}</div></div>`;
}
function fieldMarkup(stage:number,round:number,a:Activity):string {
  const p=setupOf(a), last=String(a.values.fieldFeedback||''), passed=a.values[`field-${round}`]===true, observed=a.values.fieldObserved===true;
  let scene='',controls='';
  if(stage===1){
    scene=`<div class="comparison-benches">${['A','B'].map(k=>{const gap=k==='A'?p.gapA:p.gapB,paper=k==='A'?p.paperA:p.paperB;return `<article class="comparison-bench"><strong>실험 ${k}</strong><div class="field-pair ${observed&&gap<=15?'react-attract':''}" style="--field-gap:${gap}px">${magnet()}${paper?'<span class="field-paper">종이</span>':''}<span class="field-material">${objectArt('clip')}</span></div><p>${observed?(gap<=15?'관찰: 클립이 자석 쪽으로 움직였어':'관찰: 클립이 움직이지 않았어'):'같은 자석 · 같은 철 클립'}</p>${fieldChoice(`gap${k}`,'거리',[[12,'가까이',gap===12],[34,'멀리',gap===34]])}${fieldChoice(`paper${k}`,'종이',[[false,'없음',!paper],[true,'한 장 있음',paper]])}</article>`;}).join('')}</div>`;
  }else if(stage===2){
    const ref=round===0?'N':'S';
    scene=`<div class="comparison-benches">${['A','B'].map((k,i)=>{const selected=i?p.gateB:p.gateA;return `<article class="comparison-bench gate-bench ${passed?'is-operated':''}"><strong>${i?'밀어서 막는 안전문':'당겨서 여는 문'}</strong><div class="gate-apparatus ${observed?(selected===ref?'react-repel':'react-attract'):''}" role="img" aria-label="왼쪽 기준 ${ref}극과 오른쪽 문 자석 ${selected}극${observed?selected===ref?'이 서로 밀어내는 장치':'이 서로 끌어당기는 장치':''}"><img src="/assets/quest/magnetic-gate.webp" alt="" width="1536" height="1024" draggable="false"><span class="gate-pole-label gate-reference pole-${ref}" aria-hidden="true">${ref}</span><span class="gate-force" aria-hidden="true">${observed?(selected===ref?'↔':'→←'):'?'}</span><span class="gate-pole-label gate-selected pole-${selected}" aria-hidden="true">${selected}</span></div><p class="gate-reference-note">왼쪽 기준 ${ref}극 · 오른쪽 문 자석</p>${poleChoice(`gate${k}`,selected)}</article>`;}).join('')}</div>`;
  }else if(stage===3){
    const pos=Number(a.values.routePosition??(round?5:1)), cargo=a.values.routeCargo===true, side=String(a.values.routeSide||'left'), pole=String(a.values.routePole||'N');
    scene=`<div class="route-world"><div class="route-track">${Array.from({length:7},(_,i)=>`<div class="route-tile ${i===pos?'occupied':''}"><span>${i===3?'창고':i===(round?1:5)?'목적지':String(i+1)}</span>${i===pos?`<img src="/assets/quest/prop-cart.webp" alt="현재 택배 카트">`:i===3&&!cargo?'<img src="/assets/quest/prop-parcel.webp" alt="실어야 할 짐">':''}</div>`).join('')}</div><p class="route-cargo">${passed?'목적지에 짐을 안전하게 내려놓았어':cargo?'짐을 실었어 · 목적지에서 자석을 떼어 멈춰 줘':'먼저 창고에 도착한 뒤 자석을 떼어 짐을 실어 줘'}</p></div>`;
    controls=`<div class="route-controls"><fieldset><legend>조종 자석의 위치</legend><div class="inquiry-options compact">${choice('routeSide','left','카트 왼쪽',side==='left')}${choice('routeSide','right','카트 오른쪽',side==='right')}</div></fieldset><fieldset><legend>카트와 마주 보는 극</legend>${poleChoice('routePole',pole)}</fieldset></div><p class="field-model-note">카트 왼쪽은 N극, 오른쪽은 S극이야. 한 번 작동하면 한 칸 이동해.</p><div class="field-actions">${button('route-move','자석 가까이 · 한 칸 이동',passed)}${button('route-stop','자석 떼기 · 싣기 / 내리기',passed)}</div>`;
  }else{
    const illustrated=p.material==='magnet'?magnet(p.pole==='N'?'N':'S'):p.material==='iron'?equipmentArt('plate'):objectArt(p.material==='aluminum'?'aluminum':'wood');
    const devicePicture=stage===0?`<img src="/assets/quest/${round?'prop-book':'prop-postal-box'}.webp" alt="${round?'수리할 책 보관함':'수리할 우편함'}" width="160" height="150">`:sceneArt(4);
    scene=`<div class="field-device ${passed?'is-operated':''} ${p.aligned?'aligned':'misaligned'}"><div class="field-device-caption">${stage===4&&round===1?'닿지 않게 밀어내기':'닫힌 상태 유지하기'}${stage===0&&round===1?' · 얇은 종이 한 장 사이':''}</div><div class="field-apparatus-layout"><figure class="field-device-picture">${devicePicture}<figcaption>${stage===0?'수리할 시민의 물건':'나의 자석 발명대'}</figcaption></figure><div class="field-device-detail"><span class="field-detail-label">부품 확대 보기</span><div class="field-pair ${observed&&p.aligned&&p.gap<=15?(p.material==='iron'?'react-attract':p.material==='magnet'?(p.pole==='N'?'react-repel':'react-attract'):''):''}" style="--field-gap:${p.gap*2}px"><span class="fixed-magnet">${magnet('S')}<small>마주 보는 극 N</small></span>${stage===0&&round===1?'<span class="field-paper">종이</span>':''}<span class="field-material ${p.aligned?'':'offset'}">${illustrated}</span></div><div class="field-outcome">${observed?(p.gap<=15&&p.aligned&&(p.material==='iron'||p.material==='magnet')?(p.material==='magnet'&&p.pole==='N'?'← 서로 밀어내기 →':'→ 서로 끌어당기기 ←'):'움직임이 관찰되지 않았어'):'부품을 선택하고 작동을 시험해 봐'}</div></div></div></div>`;
    controls=`<div class="field-settings">${fieldChoice('material','마주 볼 부품',[['aluminum','알루미늄 조각',p.material==='aluminum',objectArt('aluminum')],['iron','철 부품',p.material==='iron',equipmentArt('plate')],['wood','나무 조각',p.material==='wood',objectArt('wood')],['magnet','자석',p.material==='magnet',magnet('N','field-chip-magnet')]])}${fieldChoice('gap','두 부품의 거리',[[34,'멀리',p.gap===34],[12,'가까이',p.gap===12]])}${fieldChoice('aligned','부품 위치',[[false,'높이가 어긋나게',!p.aligned],[true,'서로 마주 보게',p.aligned]])}${p.material==='magnet'?`<fieldset><legend>마주 보는 극</legend>${poleChoice('pole',p.pole)}</fieldset>`:''}</div>`;
  }
  return `<div class="field-content"><span class="inquiry-kicker">현장 의뢰 ${round+1} / 2 · 배운 것을 써 볼 시간</span><h2>${fieldMissions[stage][round]}</h2>${scene}${controls}<p class="inquiry-feedback ${passed?'success':''}" role="status">${escape(last||'실패해도 괜찮아. 결과를 보고 한 가지씩 바꾸며 해결해 봐.')}</p><p class="field-model-note">${stage===3?'': '자석의 성질을 알아보기 위한 설명 모형이야. 실제 힘은 자석과 물체에 따라 달라져.'}</p></div><div class="field-footer">${stage!==3&&!passed?button('field-test','장치 시험하기'):''}${passed?button('field-next',round===0?'다음 현장 의뢰로':'탐구 기록 완성하기'):''}</div>`;
}
/** Step tabs live in the mission head, so call this after inquiryView has settled the phase. */
export function inquirySteps(n:number,a:Activity):string {
  if(a.values.inquiryVersion===2){
    const phase=inquiryPhase(a),playing=phase==='experiment';
    return `<nav class="inquiry-steps play-steps" aria-label="탐구 단계"><span class="${playing?'active':'done'}" ${playing?'aria-current="step"':''}>${playing?'1':'✓'} 직접 해 보기</span>${n%2?'':`<span class="${playing?'':phase==='complete'?'done':'active'}" ${phase==='explain'?'aria-current="step"':''}>${phase==='complete'?'✓':'2'} 발견 정리</span>`}${playing?`<details class="play-question"><summary>먼저 생각해 볼까?</summary><div class="play-question-copy"><p>${playQuestions[n-1]}</p><small>마음속으로 예상하고 바로 실험해 봐. 틀려도 괜찮아.</small></div></details>`:''}</nav>`;
  }
  const phase=inquiryPhase(a), index={predict:0,experiment:1,explain:2,apply:3,complete:n%2?2:3}[phase];
  const labels=n%2?['예상하기','직접 실험','증거로 설명']:['예상하기','직접 실험','증거로 설명','현장 의뢰'];
  return `<nav class="inquiry-steps" aria-label="탐구 단계"><strong class="sr-only">탐구 단계</strong>${labels.map((t,i)=>`<span class="${i===index?'active':i<index?'done':''}" ${i===index?'aria-current="step"':''}><b>${i<index?'✓':i+1}</b>${t}</span>`).join('')}</nav>`;
}
export function inquiryView(n:number,a:Activity,s:Save):View {
  const base=missionView(n,a,s); // Initialize hands-on state before adding inquiry state.
  if(a.values.paceVersion===1||a.values.inquiryVersion===2)return playInquiryView(n,a,s,base);
  a.values.inquiryVersion=1;
  if(['explain','apply','complete'].includes(inquiryPhase(a))&&!missionReady(n,a,s)){
    a.values.inquiryPhase='experiment';a.values.reasoned=false;
  }
  const phase=inquiryPhase(a), q=inquiries[n-1], stage=Math.floor((n-1)/2);
  let content='';
  if(phase==='experiment')content=`<div class="inquiry-workbench">${base.html}</div>`;
  else if(phase==='predict')content=`<div class="inquiry-card inquiry-predict-card"><div class="inquiry-predict-layout"><aside class="inquiry-predict-art">${sceneArt(stage)}<span class="inquiry-picture-caption">탐구 ${n} · 현장의 단서</span></aside><div class="inquiry-predict-copy"><span class="inquiry-kicker">${q.client}</span><h2>새로운 수리 의뢰가 도착했어</h2><p class="inquiry-request">${q.request}</p><div class="inquiry-divider"></div><h3>${q.prediction}</h3><p>지금의 생각을 골라 줘. 실험 결과와 달라도 괜찮아.</p><div class="inquiry-options">${q.guesses.map((t,i)=>choice('prediction',i,t,a.values.prediction===i)).join('')}</div>${button('begin','내 예상으로 실험 시작',a.values.prediction===undefined)}</div></div></div>`;
  else if(phase==='explain')content=`<div class="inquiry-card"><span class="inquiry-kicker">실험실 연구 노트 · 근거를 연결해 보자</span><h2>${q.question}</h2><p class="prediction-reflection"><strong>실험 전 내 예상</strong> ${escape(q.guesses[Number(a.values.prediction)]||'')}<br>실제로 본 결과와 같았니? 근거로 설명해 보자.</p><details class="inquiry-evidence"><summary>내가 남긴 실험 증거 ${a.trials?.length||a.records.length}개 살펴보기</summary><div class="trial-grid">${(a.trials||[]).slice(-2).map(trialPicture).join('')}</div><ul>${a.records.filter(r=>!r.key.startsWith('inquiry')).slice(-3).map(r=>`<li>${escape(r.label)}: ${escape(readableRecord(r.result))}</li>`).join('')}</ul></details><div class="reason-columns"><fieldset><legend>내가 발견한 규칙</legend><div class="inquiry-options">${q.claims.map((t,i)=>choice('claim',i,t,a.values.claim===i)).join('')}</div></fieldset><fieldset><legend>그렇게 생각한 실험 근거</legend><div class="inquiry-options">${q.evidence.map((t,i)=>choice('proof',i,t,a.values.proof===i)).join('')}</div></fieldset></div><p class="inquiry-feedback" role="status">${escape(a.values.reasonFeedback||'규칙과 실험 근거를 하나씩 연결해 줘.')}</p><div class="field-actions">${button('reason','규칙과 근거 확인',a.values.claim===undefined||a.values.proof===undefined)}<button class="quest-text-button" data-inquiry="revisit">실험대로 돌아가 살펴보기</button></div></div>`;
  else if(phase==='apply')content=`<div class="inquiry-card field-card">${fieldMarkup(stage,Number(a.values.fieldRound||0),a)}</div>`;
  else content=`<div class="inquiry-card inquiry-complete"><div class="inquiry-complete-overview">${sceneArt(stage)}<div><span class="inquiry-kicker">탐구 기록 완성</span><h2>${n%2?'발견한 규칙을 다음 실험에 써 보자!':'새로운 현장 의뢰까지 해결했어!'}</h2><p>${q.claims[q.claim]}</p></div><span class="inquiry-seal">${icon('check',24)}</span></div><div class="inquiry-evidence"><strong>나의 실험 근거</strong><p>${q.evidence[q.proof]}</p></div><div class="inquiry-stamps"><span>예상 기록 ✓</span><span>직접 실험 ✓</span><span>근거 설명 ✓</span>${n%2?'':'<span>현장 해결 2 / 2 ✓</span>'}</div><p>아래의 ${n%2?'다음 탐구로':'구역 복구하기'} 버튼으로 이어가자.</p></div>`;
  return {html:`<div class="inquiry-shell" data-phase="${phase}">${content}</div>`,bind(c){
    if(phase==='experiment')return base.bind(c);
    const controller=new AbortController(),opts={signal:controller.signal};
    const refresh=()=>{c.touch();c.refresh();};
    const listen=(id:string,fn:()=>void)=>c.root.querySelector(`[data-inquiry="${id}"]`)?.addEventListener('click',fn,opts);
    c.root.querySelectorAll<HTMLButtonElement>('[data-inquiry-group]').forEach(b=>b.addEventListener('click',()=>{
      const k=b.dataset.inquiryGroup!,v=b.dataset.value!;
      if(['prediction','claim','proof'].includes(k))a.values[k]=Number(v);
      else if(k.startsWith('route'))a.values[k]=v;
      else a.values[`field:${k}`]=v==='true'?true:v==='false'?false:/^\d+$/.test(v)?Number(v):v;
      if(phase==='apply')invalidateField(a);
      a.values.reasonFeedback='';refresh();
    },opts));
    c.root.querySelectorAll<HTMLSelectElement>('[data-field]').forEach(el=>el.addEventListener('change',()=>{
      const raw=el.value; a.values[`field:${el.dataset.field}`]=raw==='true'?true:raw==='false'?false:/^\d+$/.test(raw)?Number(raw):raw;
      invalidateField(a);refresh();
    },opts));
    listen('begin',()=>{if(a.values.prediction===undefined)return;record(a,{key:'inquiry-prediction',label:'실험 전 내 예상',result:q.guesses[Number(a.values.prediction)]});a.values.inquiryPhase='experiment';refresh();});
    listen('revisit',()=>{a.values.inquiryPhase='experiment';refresh();});
    listen('reason',()=>{
      if(!missionReady(n,a,s))return;
      if(explanationCorrect(n,Number(a.values.claim),Number(a.values.proof))){
        a.values.reasoned=true;record(a,{key:'inquiry-reason',label:'실험으로 설명한 규칙과 근거',result:`${q.claims[q.claim]} · ${q.evidence[q.proof]}`});a.values.inquiryPhase=n%2?'complete':'apply';
      }else{a.values.reasonFeedback=q.feedback;a.values.reasonAttempts=Number(a.values.reasonAttempts||0)+1;}
      refresh();
    });
    listen('field-test',()=>{const round=Number(a.values.fieldRound||0),p=setupOf(a),result=fieldResult(stage,round,p);a.values.fieldFeedback=result.message;a.values.fieldObserved=true;
      a.values.fieldAttempts=Number(a.values.fieldAttempts||0)+1;
      record(a,{key:`inquiry-field-test-${round}`,label:`현장 의뢰 ${round+1} 시험`,result:result.message});
      if(result.pass)finishField(a,round,result.message);refresh();});
    listen('field-next',()=>{const round=Number(a.values.fieldRound||0);if(a.values[`field-${round}`]!==true)return;
      if(round===1){a.values.inquiryPhase='complete';}else {a.values.fieldRound=1;Object.keys(a.values).filter(k=>k.startsWith('field:')||k.startsWith('route')).forEach(k=>delete a.values[k]);a.values.fieldFeedback='';a.values.fieldObserved=false;}
      refresh();});
    listen('route-move',()=>{const round=Number(a.values.fieldRound||0);if(a.values[`field-${round}`])return;const pos=Number(a.values.routePosition??(round?5:1));
      const side=(a.values.routeSide||'left') as 'left'|'right',pole=(a.values.routePole||'N') as 'N'|'S',dir=routeDirection(side,pole),next=Math.max(0,Math.min(6,pos+dir));
      a.values.routePosition=next;a.values.fieldFeedback=next===pos?'길 끝이야. 위치나 극을 바꿔 돌아가 보자.':`카트가 ${dir>0?'오른쪽':'왼쪽'}으로 이동했어.${next===3?' 창고야. 자석을 떼어 짐을 실어 줘.':next===(round?1:5)?' 목적지야. 자석을 떼어 멈춰 줘.':''}`;
      a.values.routeMoves=Number(a.values.routeMoves||0)+1;refresh();});
    listen('route-stop',()=>{const round=Number(a.values.fieldRound||0),pos=Number(a.values.routePosition??(round?5:1));
      if(pos===3){a.values.routeCargo=true;a.values.fieldFeedback='창고에서 멈춰 짐을 실었어! 목적지로 출발하자.';}
      else if(pos===(round?1:5)&&a.values.routeCargo===true){finishField(a,round,'중간 창고에서 짐을 싣고 목적지에서 멈춰 배달했어!');}
      else a.values.fieldFeedback=pos===(round?1:5)?'아직 짐이 없어. 중간 창고에서 먼저 멈춰 줘.':'멈췄어. 짐을 싣는 창고와 목적지의 표지를 살펴봐.';
      refresh();});
    return ()=>controller.abort();
  }};
}
/** The experiment is the main activity. A district ends with one evidence-based reflection. */
function playInquiryView(n:number,a:Activity,s:Save,base:View):View {
  a.values.inquiryVersion=2;
  a.values.inquiryActivity=n;
  const oldPhase=inquiryPhase(a);
  if(oldPhase==='predict'||oldPhase==='apply'||n%2===1||!missionReady(n,a,s)){
    a.values.inquiryPhase='experiment';
    if(!missionReady(n,a,s)){a.values.reflected=false;a.values.reasoned=false;}
  }
  if(inquiryPhase(a)==='complete'&&!inquiryReady(n,a))a.values.inquiryPhase='explain';
  const phase=inquiryPhase(a);
  if(phase==='experiment')return {html:`<div class="inquiry-shell play-inquiry" data-phase="experiment"><div class="inquiry-workbench">${base.html}</div></div>`,bind:base.bind};
  const d=discoveries[Math.floor((n-1)/2)],complete=phase==='complete'&&inquiryReady(n,a);
  const evidence=(a.trials||[]).slice(-1);
  return {html:`<div class="inquiry-shell play-inquiry" data-phase="${complete?'complete':'explain'}"><div class="inquiry-card play-discovery"><span class="inquiry-kicker">우리 구역의 발견 · 한 가지만 떠올려 봐</span><h2>${d.question}</h2><p>방금 직접 움직이고 관찰한 결과를 골라 줘.</p><div class="inquiry-options play-discovery-options">${d.choices.map((t,i)=>`<button type="button" class="inquiry-option ${a.values.reflection===i?'selected':''}" data-inquiry-group="reflection" data-value="${i}" aria-pressed="${a.values.reflection===i}" ${complete?'disabled':''}>${complete&&i===d.answer?icon('check',24):''}<span>${t}</span></button>`).join('')}</div><p class="inquiry-feedback ${complete?'success':''}" role="status">${escape(complete?d.finding:a.values.reflectionFeedback||'정답을 서두르지 않아도 돼. 실험에서 본 움직임을 떠올려 봐.')}</p><details class="inquiry-evidence"><summary>내 실험 기록 펼치기</summary>${evidence.length?`<div class="trial-grid">${evidence.map(trialPicture).join('')}</div>`:''}<ul>${a.records.filter(r=>!r.key.startsWith('inquiry')).slice(-2).map(r=>`<li>${escape(r.label)}: ${escape(readableRecord(r.result))}</li>`).join('')}</ul></details>${complete?'':`<button class="quest-text-button" data-inquiry="revisit">실험대로 돌아가 보기</button>`}</div></div>`,bind(c){
    const controller=new AbortController(),opts={signal:controller.signal};
    const refresh=()=>{c.touch();c.refresh();};
    c.root.querySelectorAll<HTMLButtonElement>('[data-inquiry-group="reflection"]').forEach(b=>b.addEventListener('click',()=>{
      if(!missionReady(n,a,s)||inquiryPhase(a)!=='explain')return;
      const selected=Number(b.dataset.value);
      a.values.reflection=selected;
      if(selected===d.answer){
        a.values.reflected=true;a.values.inquiryPhase='complete';a.values.reflectionFeedback='';
        record(a,{key:'inquiry-discovery',label:'실험으로 발견한 규칙',result:d.choices[selected]});
      }else{
        a.values.reflected=false;a.values.reflectionFeedback=d.feedback;
      }
      refresh();
    },opts));
    c.root.querySelector('[data-inquiry="revisit"]')?.addEventListener('click',()=>{a.values.inquiryPhase='experiment';refresh();},opts);
    return ()=>controller.abort();
  }};
}
function invalidateField(a:Activity){const round=Number(a.values.fieldRound||0);a.values[`field-${round}`]=false;a.values.fieldObserved=false;a.values.fieldFeedback='조건이 바뀌었어. 새 배치로 다시 시험해 줘.';}
function finishField(a:Activity,round:number,message:string){a.values[`field-${round}`]=true;a.values.fieldFeedback=message;record(a,{key:`inquiry-field-${round}`,label:`새 상황 적용 ${round+1}`,result:message});}
