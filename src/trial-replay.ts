import './trial-replay.css';
import { replayInitialObjects, replayObjects, trialObjectArt, trialObjectName, trialPoleLabel, trialResultSentence, trialTitle, type Trial, type TrialObject } from './trial-records';

const escape = (s: string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const description = (o:TrialObject) => [trialObjectName(o.id),trialPoleLabel(o)].filter(Boolean).join(' · ');
const missing = (text:string) => `<text class="replay-no-scene" x="180" y="98" text-anchor="middle">${text}</text>`;

export function trialReplayMarkup(trials: Trial[]) {
  if(!trials.length)return '<p class="replay-empty">아직 다시 볼 장면이 없어. 실험대에서 물체를 움직이고 결과를 관찰해 봐.</p>';
  const cards=trials.map((trial,i)=>{
    const sample=replayObjects(trial)[0]||trial.initialObjects[0];
    const preview=sample?trialObjectArt(sample,trial,38,32,.84):'<path d="M21 19h31v23H21z M26 26h20 M26 32h13" fill="none" stroke="#598277" stroke-width="3"/>';
    return `<button type="button" class="replay-choice" data-trial-choice="${i}" aria-pressed="${i===trials.length-1}"><svg viewBox="0 0 76 64" aria-hidden="true" focusable="false">${preview}</svg><span><small>실험 ${i+1}</small><strong>${escape(trialTitle(trial))}</strong></span></button>`;
  }).reverse().join('');
  return `<div class="replay-layout"><div class="replay-library" role="group" aria-label="다시 볼 실험 고르기">${cards}</div>
    <section class="replay-view" aria-label="선택한 실험"><h3 data-replay-title></h3>
      <div class="replay-scenes"><figure><figcaption><b>1</b> 처음</figcaption><svg class="replay-before" viewBox="0 0 360 188" role="img" aria-label="실험의 처음 모습"></svg></figure>
      <figure><figcaption><b>2</b> <span data-replay-phase>결과</span></figcaption><svg class="trial-compare" viewBox="0 0 360 188" role="img" aria-label="선택한 실험의 결과"></svg></figure></div>
      <p class="replay-finding" role="status" aria-atomic="true"></p>
      <div class="replay-controls"><button type="button" data-replay-play>▶ 다시 재생</button><label class="replay-time"><span>처음</span><input id="trial-position" type="range" min="0" max="100" step="1" value="100" aria-label="처음부터 결과까지 장면 선택"><span>결과</span></label></div>
    </section></div>`;
}

function scene(trial:Trial) {
  const after=replayObjects(trial),first=replayInitialObjects(trial);
  const beforeById=new Map(first.map(o=>[o.id,o]));
  const all=[...first,...after], xs=all.map(o=>o.x), ys=all.map(o=>o.y*.5625);
  const mid=(values:number[])=>values.length?(Math.min(...values)+Math.max(...values))/2:0;
  const cx=mid(xs),cy=mid(ys);
  const span=(values:number[])=>values.length?Math.max(...values)-Math.min(...values):0;
  const zoom=Math.min(260/Math.max(26,span(xs)),110/Math.max(11,span(ys)));
  const position=(o:TrialObject)=>({x:180+(o.x-cx)*zoom,y:94+(o.y*.5625-cy)*zoom});
  const artScale=all.length>8?.77:1;
  const art=(o:TrialObject)=>`<title>${escape(description(o))}</title>${trialObjectArt(o,trial,0,0,artScale)}`;
  const stationary=(o:TrialObject)=>{const p=position(o);return `<g transform="translate(${p.x} ${p.y})">${art(o)}</g>`;};
  const parts=after.map(o=>({before:beforeById.get(o.id),after:o,end:position(o)}));
  const traces=parts.map(part=>{
    if(!part.before)return '';
    const start=position(part.before),end=part.end;
    if(Math.hypot(end.x-start.x,end.y-start.y)<10)return '';
    return `<path class="replay-trace" d="M${start.x} ${start.y} L${end.x} ${end.y}"/><circle class="replay-origin" cx="${start.x}" cy="${start.y}" r="4"/>`;
  }).join('');
  const marks=parts.map((part,i)=>{
    const old=part.before,now=part.after;
    const turned=!!old&&(old.pole!==now.pole||old.topPole!==now.topPole||old.bottomPole!==now.bottomPole);
    return `<g data-replay-part="${i}" transform="translate(${part.end.x} ${part.end.y})">${turned?`<g data-old-art visibility="hidden">${art(old!)}</g><g data-new-art>${art(now)}</g>`:art(now)}</g>`;
  }).join('');
  const endIds=new Set(after.map(o=>o.id));
  const onlyAtStart=first.filter(o=>!endIds.has(o.id)).map(stationary).join('');
  return {
    before:first.length?first.map(stationary).join(''):missing('처음 모습은 남아 있지 않아.'),
    result:after.length?`${traces}${onlyAtStart?`<g data-start-only visibility="hidden">${onlyAtStart}</g>`:''}${marks}`:missing('결과 모습은 남아 있지 않아.'),
    beforeLabel:first.length?`처음 모습 · ${first.map(description).join(', ')}`:'처음 모습은 남아 있지 않아.',
    resultLabel:after.length?after.map(description).join(', '):'결과 모습은 남아 있지 않아.',
    comparable:parts.some(part=>part.before),
    parts:parts.map(part=>({start:part.before?position(part.before):null,end:part.end})),
  };
}

export function bindTrialReplay(root:HTMLElement,trials:Trial[],motion=true) {
  if(!trials.length)return ()=>{};
  const events=new AbortController(),opts={signal:events.signal};
  const buttons=[...root.querySelectorAll<HTMLButtonElement>('[data-trial-choice]')];
  const slider=root.querySelector<HTMLInputElement>('#trial-position')!,play=root.querySelector<HTMLButtonElement>('[data-replay-play]')!;
  const before=root.querySelector<SVGSVGElement>('.replay-before')!,result=root.querySelector<SVGSVGElement>('.trial-compare')!;
  const phase=root.querySelector<HTMLElement>('[data-replay-phase]')!,controls=root.querySelector<HTMLElement>('.replay-controls')!;
  const browser=root.ownerDocument.defaultView!,reduced=browser.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate=()=>motion&&!reduced.matches;
  let frame=0,playing=false,progress=1,current:ReturnType<typeof scene>;
  let parts: {shape:SVGElement;oldArt:SVGElement|null;newArt:SVGElement|null}[]=[],startOnly:SVGElement|null=null;
  function display(value:number) {
    progress=value;
    const atStart=value===0,atEnd=value===1;
    slider.value=String(Math.round(value*100));
    slider.setAttribute('aria-valuetext',atStart?'처음':atEnd?'결과':`두 장면 사이 ${slider.value}%`);
    const caption=atEnd?'결과':atStart?'처음 위치':'두 장면 사이';
    if(phase.textContent!==caption)phase.textContent=caption;
    result.setAttribute('aria-label',`${caption} · ${current.resultLabel}`);
    startOnly?.setAttribute('visibility',atStart?'visible':'hidden');
    current.parts.forEach(({start,end},i)=>{
      const {shape,oldArt,newArt}=parts[i];
      shape.setAttribute('visibility',start||atEnd?'visible':'hidden');
      if(start)shape.setAttribute('transform',`translate(${start.x+(end.x-start.x)*value} ${start.y+(end.y-start.y)*value})`);
      oldArt?.setAttribute('visibility',atEnd?'hidden':'visible');
      newArt?.setAttribute('visibility',atEnd?'visible':'hidden');
    });
    const label=canAnimate()?(playing?'Ⅱ 일시정지':atEnd?'▶ 다시 재생':atStart?'▶ 재생':'▶ 이어 재생'):(atEnd?'처음 보기':'결과 보기');
    if(play.textContent!==label)play.textContent=label;
  }
  function stop(){
    browser.cancelAnimationFrame(frame);frame=0;playing=false;
  }
  function select(next:number){
    stop();const trial=trials[next];current=scene(trial);
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.trialChoice)===next)));
    root.querySelector<HTMLElement>('[data-replay-title]')!.textContent=trialTitle(trial);
    root.querySelector<HTMLElement>('.replay-finding')!.textContent=trialResultSentence(trial);
    before.setAttribute('aria-label',current.beforeLabel);before.innerHTML=current.before;result.innerHTML=current.result;
    parts=[...result.querySelectorAll<SVGElement>('[data-replay-part]')].map(shape=>({shape,oldArt:shape.querySelector<SVGElement>('[data-old-art]'),newArt:shape.querySelector<SVGElement>('[data-new-art]')}));
    startOnly=result.querySelector('[data-start-only]');
    controls.hidden=!current.comparable;
    display(1);
  }
  buttons.forEach((button,i)=>{
    button.addEventListener('click',()=>select(Number(button.dataset.trialChoice)),opts);
    button.addEventListener('keydown',e=>{
      const delta=['ArrowRight','ArrowDown'].includes(e.key)?1:['ArrowLeft','ArrowUp'].includes(e.key)?-1:0;
      if(!delta&&e.key!=='Home'&&e.key!=='End')return;
      e.preventDefault();
      const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,i+delta));
      buttons[next].focus();select(Number(buttons[next].dataset.trialChoice));
    },opts);
  });
  slider.addEventListener('input',()=>{stop();display(Number(slider.value)/100);},opts);
  play.addEventListener('click',()=>{
    if(!current.comparable)return;
    if(playing){stop();display(progress);return;}
    if(!canAnimate()){display(progress===1?0:1);return;}
    if(progress===1)display(0);
    playing=true;const start=browser.performance.now()-progress*1800;
    const tick=(now:number)=>{
      const value=Math.min(1,(now-start)/1800);
      if(value===1)stop();
      display(value);if(playing)frame=browser.requestAnimationFrame(tick);
    };
    display(progress);frame=browser.requestAnimationFrame(tick);
  },opts);
  const pause=()=>{stop();display(progress);};
  root.ownerDocument.addEventListener('visibilitychange',()=>{if(root.ownerDocument.hidden)pause();},opts);
  reduced.addEventListener('change',pause,opts);
  select(trials.length-1);
  return ()=>{stop();events.abort();};
}
