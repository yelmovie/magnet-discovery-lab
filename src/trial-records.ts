import type { Activity, Point, Value } from './domain';
import { ironNutArt, materialCatalog } from './material-sorting';
import { replayInitialObjects, replayObjects, trialResultSentence } from './trial-observations';
export { replayInitialObjects, replayObjects, trialResultSentence };
export interface TrialObject extends Point { id: string; pole?: 'N' | 'S'; topPole?: 'N' | 'S'; bottomPole?: 'N' | 'S' }
export interface Trial {
  id: string; key: string; activity: number; modelVersion: 1;
  conditions: Record<string, Value>; initialObjects: TrialObject[]; objects: TrialObject[];
  input: Point[]; outcome: string; designRevision?: number; template?: string; pinned?: boolean;
}
export function addTrial(a: Activity, trial: Omit<Trial, 'id' | 'modelVersion'>): Trial {
  const item: Trial = structuredClone({ ...trial, id: `${trial.activity}:${trial.key}`, modelVersion: 1 });
  item.input = item.input.filter((p, i, all) => !i || p.x !== all[i - 1].x || p.y !== all[i - 1].y);
  if (item.input.length > 240) item.input = Array.from({ length: 240 }, (_, i) => item.input[Math.round(i * (item.input.length - 1) / 239)]);
  a.trials ||= [];
  const previous = a.trials.findIndex(t => t.id === item.id);
  if (previous >= 0) a.trials[previous] = item; else a.trials.push(item);
  while (a.trials.filter(t => !t.pinned).length > 12) a.trials.splice(a.trials.findIndex(t => !t.pinned), 1);
  return item;
}
export function validTrial(input: unknown): input is Trial {
  if (!input || typeof input !== 'object') return false;
  const t = input as Trial;
  try { if (new TextEncoder().encode(JSON.stringify(t)).byteLength > 64000) return false; } catch { return false; }
  const point = (p: Point) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 1000 && Math.abs(p.y) <= 1000;
  const object = (p: TrialObject) => point(p) && typeof p.id === 'string' && [p.pole,p.topPole,p.bottomPole].every(v => v === undefined || v === 'N' || v === 'S');
  return typeof t.id === 'string' && typeof t.key === 'string' && Number.isInteger(t.activity) && t.activity >= 1 && t.activity <= 10 && t.modelVersion === 1 &&
    !!t.conditions && Object.values(t.conditions).every(v => typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v)) &&
    Array.isArray(t.initialObjects) && t.initialObjects.every(object) &&
    Array.isArray(t.objects) && t.objects.every(object) &&
    Array.isArray(t.input) && t.input.length <= 240 && t.input.every(point) && typeof t.outcome === 'string';
}
export function paperComparison(a: Activity): boolean {
  const left = a.trials?.find(t => t.key === 'near-clear'), right = a.trials?.find(t => t.key === 'near-paper');
  return !!left && !!right && validTrial(left) && validTrial(right) && left.conditions.paper === false && right.conditions.paper === true &&
    left.conditions.material === 'iron' && right.conditions.material === 'iron' &&
    JSON.stringify(left.initialObjects) === JSON.stringify(right.initialObjects) && left.outcome === 'attract' && right.outcome === 'attract';
}
export function currentInventionTrial(a: Activity, template: string, revision: number): boolean {
  return !!a.trials?.some(t => validTrial(t) && t.key === 'use' && t.template === template && t.designRevision === revision && t.outcome === 'success' && t.conditions.aligned === true && typeof t.conditions.gap === 'number' && t.conditions.gap <= 36);
}
const escape = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function trialOutcome(outcome: string): string {
  return ({attract:'당겨졌어',repel:'밀려났어',none:'움직이지 않았어',success:'실제 조작으로 확인했어',failure:'시험 조건을 다시 살펴보자'} as Record<string,string>)[outcome] || (/[가-힣]/.test(outcome)?outcome:'시험 결과 정보 없음');
}
export const readableRecord = (text:string) => text.replace(/\b(attract|repel|none|success|failure)\b/g,trialOutcome);
export function trialTitle(t:Trial):string {
  const title=plainTrialTitle(t);
  return t.conditions.autoplay===true?`${title} · 자동재생`:title;
}
function plainTrialTitle(t:Trial):string {
  if(t.activity===4){
    if(t.conditions.paper===true)return '종이 한 장을 사이에 두면?';
    if(t.key==='rescue')return '철 열쇠 끌어오기';
    if(typeof t.conditions.clearanceCells==='number')return `${t.conditions.clearanceCells}칸에서 클립 관찰`;
    if(t.key==='far'||t.key==='far-clear')return '먼 곳에서 클립 관찰';
    if(t.key==='near'||t.key==='near-clear')return '가까이에서 클립 관찰';
  }
  return typeof t.conditions.label==='string'&&/[가-힣]/.test(t.conditions.label)?t.conditions.label:`탐구 ${t.activity} 실험`;
}
export function trialObjectName(id:string):string {
  const names:Record<string,string>={probe:'기준 자석',reference:'기준 자석','unknown-magnet':'대상 자석',controller:'조종 자석','cart-magnet':'택배 수레',cart:'택배 수레',cleaner:'바깥 손잡이','inner-pad':'물속 패드',pad:'물속 패드',clip:'철 클립',key:'철 열쇠',paper:'종이 한 장',lid:'우편함 덮개',iron:'철판',
    'fixed-magnet':'덮개의 자석','fixed-plate':'몸체의 철판','repair-plate':'철판','repair-magnet':'수리 자석','hidden-magnet':'숨은 자석',base:'장치 몸체','design-target':'마주 보는 부품','operating-target':'물속 패드','operating-magnet':'바깥 손잡이','use-handle':'손잡이','force-arrow':'힘 화살표',stickerN:'N극 스티커',stickerS:'S극 스티커'};
  if(names[id])return names[id];
  if(/^ring\d+$/.test(id))return `${Number(id.slice(4))+1}번 고리`;
  if(/^material-[0-6]$/.test(id))return materialCatalog[Number(id.slice(-1))].name;
  return /magnet/.test(id)?'자석':/plate/.test(id)?'철판':/target/.test(id)?'대상 부품':'실험 물체';
}
export function trialPoleLabel(o:TrialObject):string {
  if(o.id.startsWith('ring'))return o.topPole&&o.bottomPole?`윗면 ${o.topPole}극 · 아랫면 ${o.bottomPole}극`:'';
  if(o.id.includes('magnet')&&o.topPole&&o.bottomPole)return `위쪽 ${o.topPole}극 · 아래쪽 ${o.bottomPole}극`;
  if(/magnet|probe|controller|cleaner/.test(o.id)&&o.pole)return `왼쪽 ${o.pole}극 · 오른쪽 ${o.pole==='N'?'S':'N'}극`;
  return '';
}
export function uprightMagnet(top:'N'|'S',bottom:'N'|'S',width=48,height=64) {
  const topColor=top==='N'?'#bc423c':'#366d9b',bottomColor=bottom==='N'?'#bc423c':'#366d9b';
  return `<svg width="${width}" height="${height}" viewBox="0 0 48 64" role="img" aria-label="위 ${top}극, 아래 ${bottom}극"><rect width="48" height="64" rx="6" fill="${bottomColor}"/><path d="M0 7 Q0 0 7 0 H41 Q48 0 48 7 V32 H0 Z" fill="${topColor}"/><g text-anchor="middle" fill="white" font-size="20" font-weight="bold"><text x="24" y="23">${top}</text><text x="24" y="55">${bottom}</text></g></svg>`;
}
export function trialSummary(t:Trial):string {
  const facing=t.conditions.facing,hidden=t.conditions.hidden;
  const poles=t.activity===5 ? (['N','S'].includes(String(facing))&&['N','S'].includes(String(hidden))?`마주 본 극: 기준 ${facing}극 · 대상 ${hidden}극. `:'당시 극 정보 없음. ') : '';
  const movement=t.objects.filter(o=>!o.id.startsWith('initial:')).map(o=>{
    const start=t.initialObjects.find(p=>p.id===o.id),directions=start?[Math.abs(o.x-start.x)<.1?'':o.x>start.x?'오른쪽':'왼쪽',Math.abs(o.y-start.y)<.1?'':o.y>start.y?'아래':'위'].filter(Boolean):[];
    const direction=directions.join('·'),position=!start?'처음 위치 정보 없음':directions.length?`처음 자리에서 ${direction}${direction.endsWith('쪽')?'으로':'로'} 이동했어`:'처음 자리에 그대로 있었어';
    return `${trialObjectName(o.id)}: ${position}${trialPoleLabel(o)?` · ${trialPoleLabel(o)}`:''}`;
  }).join('; ');
  return `${poles}${trialOutcome(t.outcome)}. ${movement}${t.activity===5&&!t.objects.some(o=>o.id==='unknown-magnet')?' · 대상 자석의 위치 기록 없음':''}`;
}
/** Draw a saved object around its centre. Local artwork stays inside a 72 × 64 box at scale 1. */
export function trialObjectArt(o:TrialObject,t:Trial,x:number,y:number,scale=1):string {
  const image=(file:string,w:number,h:number)=>`<image href="/assets/quest/${file}.webp" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  const frame=(file:string,box:string,w:number,h:number,atlasW=1536,atlasH=1024)=>
    `<svg x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" viewBox="${box}" preserveAspectRatio="none" overflow="hidden"><image href="/assets/quest/${file}.webp" width="${atlasW}" height="${atlasH}"/></svg>`;
  const row=(file:string,i:number,w:number,h:number)=>frame(file,`2 ${i*112+2} 316 108`,w,h,320,448);
  const material=(i:number)=>materialCatalog[i].id==='nut'?`<image href="${ironNutArt}" x="-31" y="-31" width="62" height="62"/>`:frame('material-kit',`${i%3*512} ${Math.floor(i/3)*512} 512 512`,62,62);
  const bar=(pole=o.pole)=>{
    if(o.topPole&&o.bottomPole)return `<g transform="translate(-17 -23)">${uprightMagnet(o.topPole,o.bottomPole,34,46)}</g>`;
    const shape=frame('magnet-bar','60 370 1420 285',70,24);
    if(!pole)return `<g style="filter:grayscale(1)">${shape}</g>`;
    return `<g transform="scale(${pole==='S'?-1:1} 1)">${shape}</g><g text-anchor="middle" fill="white" font-size="13" font-weight="bold"><text x="-17" y="5">${pole}</text><text x="17" y="5">${pole==='N'?'S':'N'}</text></g>`;
  };
  const coupled=(inside:boolean)=>row('aquarium-cleaner-parts',inside?1:0,inside?42:56,48);
  function glyph():string {
    const id=o.id;
    const index=/^material-([0-6])$/.exec(id);
    if(index)return material(Number(index[1]));
    if((id==='clip'&&t.key==='rescue')||id==='key')return frame('science-equipment','544 512 465 430',52,48);
    const knownMaterial=materialCatalog.findIndex(m=>m.id===id);
    if(knownMaterial>=0)return material(knownMaterial);
    if(id==='paper')return image('prop-paper-sheet',29,54);
    if(id==='cart-magnet'||id==='cart'||id==='car')return image('prop-cart',72,60);
    if(id==='cargo'||id==='parcel')return image('prop-parcel',52,50);
    if(id==='lid')return image('prop-postal-lid',72,62);
    if(id==='use-handle'||id==='test-handle')return t.template==='remote'?coupled(false):image('mailbox-pull-handle',62,28);
    if(id==='inner-pad'||id==='pad'||id==='operating-target'&&t.template==='remote')return coupled(true);
    if(id==='cleaner'||id==='operating-magnet'&&t.template==='remote')return coupled(false);
    if(id==='base')return t.template==='remote'?image('aquarium-window',72,38):image('prop-postal-box',72,64);
    if(id==='stickerN'||id==='stickerS')return `<circle r="16" fill="${id==='stickerN'?'#bc423c':'#366d9b'}" stroke="#fff5db" stroke-width="3"/><text text-anchor="middle" y="6" fill="white" font-size="18" font-weight="bold">${id.slice(-1)}</text>`;
    if(id==='force-arrow')return '<path d="M-23 0H16" fill="none" stroke="#ab4a32" stroke-width="6" stroke-linecap="round"/><path d="M24 0l-13 -9v18z" fill="#ab4a32"/>';
    if(/^ring\d+$/.test(id)){
      const shape=row('polarity-parts',o.topPole==='S'?2:1,64,34);
      if(!o.topPole||!o.bottomPole)return `<g style="filter:grayscale(1)">${shape}</g>`;
      return shape+`<g text-anchor="middle" fill="white" stroke="#25383d" stroke-width="2" paint-order="stroke" font-weight="bold" font-size="12"><text x="-16" y="-3">${o.topPole}</text><text x="8" y="13">${o.bottomPole}</text></g>`;
    }
    if(id==='iron'||id.includes('plate')||id.includes('target')&&t.conditions.pair==='iron')return row('mailbox-hardware',1,60,17);
    if(id.includes('magnet')||['probe','reference','controller','hidden'].includes(id)||id.includes('target')&&t.conditions.pair==='magnet')return bar();
    // Some old records store an unnamed part, but no identifying material. Mark its position only.
    return '<circle r="9" fill="#f9f2db" stroke="#52736c" stroke-width="3"/><circle r="3" fill="#52736c"/>';
  }
  return `<g transform="translate(${x} ${y}) scale(${scale})">${glyph()}</g>`;
}
export function trialPicture(t: Trial): string {
  const list=replayObjects(t),initial=replayInitialObjects(t),all=[...list,...initial];
  if(!all.length)return `<figure class="trial-picture"><figcaption>${escape(trialTitle(t))} · ${escape(trialResultSentence(t))}</figcaption></figure>`;
  const xs=all.map(o=>o.x*4),ys=all.map(o=>o.y*2.25),mx=(Math.min(...xs)+Math.max(...xs))/2,my=(Math.min(...ys)+Math.max(...ys))/2;
  const scale=Math.min(320/Math.max(100,Math.max(...xs)-Math.min(...xs)),100/Math.max(45,Math.max(...ys)-Math.min(...ys)));
  const pos=(o:TrialObject)=>({x:200+(o.x*4-mx)*scale,y:85+(o.y*2.25-my)*scale});
  const label=trialObjectName;
  const marks=list.map((o,i)=>{const end=pos(o),before=pos(initial.find(p=>p.id===o.id)||o);
    return `<g><title>${escape(label(o.id))}</title><path d="M${before.x} ${before.y}L${end.x} ${end.y}" stroke="#71968b" stroke-width="2" stroke-dasharray="4 5"/><rect x="${before.x-21}" y="${before.y-14}" width="42" height="28" rx="7" fill="none" stroke="#9ab1a6" stroke-width="2" stroke-dasharray="3 3"/>${trialObjectArt(o,t,end.x,end.y)}<circle cx="${end.x+21}" cy="${end.y-18}" r="10" fill="#315d65"/><text x="${end.x+21}" y="${end.y-14}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff9e9">${i+1}</text></g>`;}).join('');
  return `<figure class="trial-picture"><svg viewBox="0 0 400 170" role="img" aria-label="${escape(trialTitle(t))} · ${escape(trialResultSentence(t))}"><rect x="1" y="1" width="398" height="168" rx="12" fill="#f1ecd9"/><image href="/assets/quest/notebook-page.webp" x="1" y="1" width="398" height="168" preserveAspectRatio="xMidYMid slice"/>${marks}</svg><figcaption><span class="trial-key">${list.map((o,i)=>`${i+1} ${escape(label(o.id))}`).join(' · ')}</span>${escape(trialTitle(t))}<small>${escape(trialResultSentence(t))}</small><small>점선은 처음 자리야. 물체가 어디로 움직였는지 찾아봐.</small></figcaption></figure>`;
}
