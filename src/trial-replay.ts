import type { Trial } from './trial-records';

const escape = (s: unknown) => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const names: Record<string,string> = { 'sweep-magnet':'자석', 'distance-magnet':'자석', magnet:'자석', clip:'철 클립', paper:'종이', probe:'기준 자석', cleaner:'바깥 자석', 'inner-pad':'안쪽 패드', controller:'조종 자석', 'cart-magnet':'카트', lid:'덮개', 'repair-magnet':'자석', 'hidden-magnet':'자석', 'repair-plate':'철판', 'design-magnet':'자석', 'design-target':'대상 부품', 'use-handle':'손잡이', base:'몸체', 'force-arrow':'힘 화살표' };

export function trialReplayMarkup(trials: Trial[]) {
  if (!trials.length) return '';
  return `<div class="trial-replay"><label for="trial-choice">비교할 실험<select id="trial-choice">${trials.map((t,i)=>`<option value="${i}">${escape(t.conditions.label || t.key)}</option>`).join('')}</select></label><svg class="trial-compare" viewBox="0 0 800 340" role="img" aria-label="저장된 실험 처음과 결과의 위치 비교"></svg><div class="trial-replay-legend"></div><label class="trial-scrubber" for="trial-position"><span>처음 위치</span><output id="trial-position-value">결과 위치</output><input id="trial-position" type="range" min="0" max="100" value="100" aria-label="처음과 결과 위치 비교" aria-describedby="trial-compare-note"></label><p id="trial-compare-note">슬라이더로 처음과 결과를 비교해 봐. 점선은 위치 변화야.</p></div>`;
}

export function bindTrialReplay(root: HTMLElement, trials: Trial[]) {
  if (!trials.length) return () => {};
  const controller=new AbortController(), slider=root.querySelector<HTMLInputElement>('#trial-position')!, select=root.querySelector<HTMLSelectElement>('#trial-choice')!;
  const draw=()=>{
    const t=trials[Number(select.value)], k=Number(slider.value)/100;
    const objects=t.objects.filter(o=>!o.id.startsWith('initial:'));
    const positions=[...objects,...t.initialObjects],xs=positions.map(o=>o.x*8),ys=positions.map(o=>o.y*4.5);
    const midX=(Math.min(...xs)+Math.max(...xs))/2,midY=(Math.min(...ys)+Math.max(...ys))/2;
    const scale=Math.min(640/Math.max(180,Math.max(...xs)-Math.min(...xs)),200/Math.max(90,Math.max(...ys)-Math.min(...ys)));
    const location=(x:number,y:number)=>({x:400+(x*8-midX)*scale,y:170+(y*4.5-midY)*scale});
    const marks=objects.map((o,i)=>{
      const start=t.initialObjects.find(p=>p.id===o.id)||o,{x,y}=location(start.x+(o.x-start.x)*k,start.y+(o.y-start.y)*k);
      const {x:sx,y:sy}=location(start.x,start.y),end=location(o.x,o.y),magnetic=o.id.includes('magnet')||['probe','controller','cleaner'].includes(o.id);
      const label=names[o.id] || (o.id.startsWith('ring')?`${Number(o.id.slice(4))+1}번 고리`:o.id.startsWith('material')?'재료':o.id);
      return `<g><title>${escape(label)}</title><path d="M${sx} ${sy} L${end.x} ${end.y}" stroke="#698e7e" stroke-width="3" stroke-dasharray="5 6"/><circle cx="${sx}" cy="${sy}" r="17" fill="none" stroke="#86a398" stroke-width="3"/><rect x="${x-34}" y="${y-16}" width="68" height="32" rx="8" fill="${magnetic?'#5c8e8c':'#9bb6bd'}" stroke="#315d65" stroke-width="2"/>${magnetic?`<text x="${x}" y="${y+7}" text-anchor="middle" font-size="18" fill="white">${o.pole ? (o.pole==='N'?'N  S':'S  N') : '자석'}</text>`:''}<circle cx="${x-38}" cy="${y-23}" r="15" fill="#173f47"/><text x="${x-38}" y="${y-17}" text-anchor="middle" font-size="18" fill="white">${i+1}</text></g>`;
    }).join('');
    root.querySelector('.trial-compare')!.innerHTML=`<rect x="2" y="2" width="796" height="336" rx="20" fill="#f1ecd9"/>${marks}`;
    root.querySelector('.trial-replay-legend')!.textContent=objects.map((o,i)=>`${i+1} ${names[o.id]|| (o.id.startsWith('ring')?'고리':o.id.startsWith('material')?'재료':o.id)}`).join('　 ·　');
    root.querySelector('output')!.textContent=k===0?'처음 위치':k===1?'결과 위치':`비교 ${Math.round(k*100)}%`;
  };
  slider.addEventListener('input',draw,{signal:controller.signal});select.addEventListener('change',()=>{slider.value='100';draw();},{signal:controller.signal});draw();
  return()=>controller.abort();
}
