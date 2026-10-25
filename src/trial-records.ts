import type { Activity, Point, Value } from './domain';
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
export const trialTitle = (t:Trial) => typeof t.conditions.label === 'string' && /[가-힣]/.test(t.conditions.label) ? t.conditions.label : `탐구 ${t.activity} 실험`;
export function trialObjectName(id:string):string {
  const names:Record<string,string>={probe:'기준 자석','unknown-magnet':'대상 자석',controller:'조종 자석','cart-magnet':'택배 카트',cleaner:'바깥 자석','inner-pad':'안쪽 패드',clip:'철 클립',paper:'종이',lid:'덮개',base:'몸체','design-target':'대상 부품','use-handle':'손잡이','force-arrow':'힘 화살표'};
  if(names[id])return names[id];
  if(/^ring\d+$/.test(id))return `${Number(id.slice(4))+1}번 고리`;
  if(/^material-[0-5]$/.test(id))return ['철 클립','철못','알루미늄','나무 조각','플라스틱','고무 지우개'][Number(id.slice(-1))];
  return /magnet/.test(id)?'자석':/plate/.test(id)?'철판':/target/.test(id)?'대상 부품':'실험 물체';
}
export function trialPoleLabel(o:TrialObject):string {
  if(o.id.startsWith('ring'))return o.topPole&&o.bottomPole?`윗면 ${o.topPole}극 · 아랫면 ${o.bottomPole}극`:'당시 극 정보 없음';
  if(/magnet|probe|controller|cleaner/.test(o.id))return o.pole?`왼쪽 ${o.pole}극 · 오른쪽 ${o.pole==='N'?'S':'N'}극`:'당시 극 정보 없음';
  return '';
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
function trialGlyph(o: TrialObject, t: Trial, x: number, y: number): string {
  const crop = (file: string, box: string, width = 46, height = 36, neutral = false) => `<svg x="${x-width/2}" y="${y-height/2}" width="${width}" height="${height}" viewBox="${box}" preserveAspectRatio="xMidYMid meet"><image href="/assets/quest/${file}.webp" width="1536" height="1024"${neutral?' style="filter:grayscale(1)"':''}/></svg>`;
  const material = /^material-([0-5])$/.exec(o.id);
  if (material) { const i=Number(material[1]); return crop('material-kit',`${i%3*512} ${Math.floor(i/3)*512} 512 512`); }
  if (o.id==='clip') return t.key==='rescue'?crop('science-equipment','544 512 465 430'):crop('material-kit','0 0 512 512');
  if (o.id==='cart-magnet') return `<image href="/assets/quest/prop-cart.webp" x="${x-25}" y="${y-20}" width="50" height="40"/>`;
  if (/magnet|probe|controller|cleaner/.test(o.id)) return crop('magnet-bar','60 370 1420 285',52,20,true)+`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="12" fill="white">${o.pole?(o.pole==='N'?'N　S':'S　N'):'?'}</text>`;
  if (o.id.includes('ring')) return crop('science-equipment','32 87 453 324',46,32,true)+`<text x="${x}" y="${y+26}" text-anchor="middle" font-size="12">${o.topPole&&o.bottomPole?`위 ${o.topPole} / 아래 ${o.bottomPole}`:'극 정보 없음'}</text>`;
  if (o.id.includes('pad')) return crop('science-equipment','33 561 466 366');
  if (o.id.includes('plate')||o.id.includes('target')&&t.conditions.pair==='iron') return crop('science-equipment','1064 83 439 328');
  if (o.id.includes('target')&&t.conditions.pair==='magnet') return crop('magnet-bar','60 370 1420 285',52,20,true);
  if (o.id==='base') return `<image href="/assets/quest/prop-${t.template==='remote'?'cart':'postal-box'}.webp" x="${x-25}" y="${y-22}" width="50" height="44"/>`;
  if (o.id.startsWith('sticker')) return `<text x="${x}" y="${y+8}" text-anchor="middle" font-size="24" font-weight="700" fill="#28565e">${o.id==='stickerN'?'N':'S'}</text>`;
  return `<rect x="${x-17}" y="${y-10}" width="34" height="20" rx="5" fill="#fff9e9" stroke="#547b78" stroke-width="2"/>`;
}
export function trialPicture(t: Trial): string {
  const list=t.objects.filter(o=>!o.id.startsWith('initial:')), all=[...list,...t.initialObjects];
  if(!all.length)return `<figure class="trial-picture"><figcaption>${escape(trialTitle(t))} · ${escape(trialSummary(t))}</figcaption></figure>`;
  const xs=all.map(o=>o.x*4),ys=all.map(o=>o.y*2.25),mx=(Math.min(...xs)+Math.max(...xs))/2,my=(Math.min(...ys)+Math.max(...ys))/2;
  const scale=Math.min(320/Math.max(100,Math.max(...xs)-Math.min(...xs)),100/Math.max(45,Math.max(...ys)-Math.min(...ys)));
  const pos=(o:TrialObject)=>({x:200+(o.x*4-mx)*scale,y:85+(o.y*2.25-my)*scale});
  const label=trialObjectName;
  const marks=list.map((o,i)=>{const end=pos(o),before=pos(t.initialObjects.find(p=>p.id===o.id)||o);
    return `<g><title>${escape(label(o.id))}</title><path d="M${before.x} ${before.y}L${end.x} ${end.y}" stroke="#71968b" stroke-width="2" stroke-dasharray="4 5"/><rect x="${before.x-21}" y="${before.y-14}" width="42" height="28" rx="7" fill="none" stroke="#9ab1a6" stroke-width="2" stroke-dasharray="3 3"/>${trialGlyph(o,t,end.x,end.y)}<circle cx="${end.x+21}" cy="${end.y-18}" r="10" fill="#315d65"/><text x="${end.x+21}" y="${end.y-14}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff9e9">${i+1}</text></g>`;}).join('');
  return `<figure class="trial-picture"><svg viewBox="0 0 400 170" role="img" aria-label="${escape(trialTitle(t))} · ${escape(trialSummary(t))}"><rect x="1" y="1" width="398" height="168" rx="12" fill="#f1ecd9"/>${marks}</svg><figcaption><span class="trial-key">${list.map((o,i)=>`${i+1} ${escape(label(o.id))}`).join(' · ')}</span>${escape(trialTitle(t))}<small>${escape(trialSummary(t))}</small><small>점선은 처음 자리, 그림은 결과 자리야.</small></figcaption></figure>`;
}
