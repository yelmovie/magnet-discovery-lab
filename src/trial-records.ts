import type { Activity, Point, Value } from './domain';
export interface TrialObject extends Point { id: string; pole?: 'N' | 'S' }
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
  return typeof t.id === 'string' && typeof t.key === 'string' && Number.isInteger(t.activity) && t.activity >= 1 && t.activity <= 10 && t.modelVersion === 1 &&
    !!t.conditions && Object.values(t.conditions).every(v => typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v)) &&
    Array.isArray(t.initialObjects) && t.initialObjects.every(p => point(p) && typeof p.id === 'string') &&
    Array.isArray(t.objects) && t.objects.every(p => point(p) && typeof p.id === 'string') &&
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
function trialGlyph(o: TrialObject, t: Trial, x: number, y: number): string {
  const crop = (file: string, box: string, width = 46, height = 36, neutral = false) => `<svg x="${x-width/2}" y="${y-height/2}" width="${width}" height="${height}" viewBox="${box}" preserveAspectRatio="xMidYMid meet"><image href="/assets/quest/${file}.webp" width="1536" height="1024"${neutral?' style="filter:grayscale(1)"':''}/></svg>`;
  const material = /^material-([0-5])$/.exec(o.id);
  if (material) { const i=Number(material[1]); return crop('material-kit',`${i%3*512} ${Math.floor(i/3)*512} 512 512`); }
  if (o.id==='clip') return t.key==='rescue'?crop('science-equipment','544 512 465 430'):crop('material-kit','0 0 512 512');
  if (o.id==='cart-magnet') return `<image href="/assets/quest/prop-cart.webp" x="${x-25}" y="${y-20}" width="50" height="40"/>`;
  if (/magnet|probe|controller|cleaner/.test(o.id)) return crop('magnet-bar','60 370 1420 285',52,20,true);
  if (o.id.includes('ring')) return crop('science-equipment','32 87 453 324',46,32,true);
  if (o.id.includes('pad')) return crop('science-equipment','33 561 466 366');
  if (o.id.includes('plate')||o.id.includes('target')&&t.conditions.pair==='iron') return crop('science-equipment','1064 83 439 328');
  if (o.id.includes('target')&&t.conditions.pair==='magnet') return crop('magnet-bar','60 370 1420 285',52,20,true);
  if (o.id==='base') return `<image href="/assets/quest/prop-${t.template==='remote'?'cart':'postal-box'}.webp" x="${x-25}" y="${y-22}" width="50" height="44"/>`;
  if (o.id.startsWith('sticker')) return `<text x="${x}" y="${y+8}" text-anchor="middle" font-size="24" font-weight="700" fill="#28565e">${o.id==='stickerN'?'N':'S'}</text>`;
  return `<rect x="${x-17}" y="${y-10}" width="34" height="20" rx="5" fill="#fff9e9" stroke="#547b78" stroke-width="2"/>`;
}
export function trialPicture(t: Trial): string {
  const list=t.objects.filter(o=>!o.id.startsWith('initial:')), all=[...list,...t.initialObjects];
  if(!all.length)return `<figure class="trial-picture"><figcaption>${escape(t.conditions.label||t.key)}</figcaption></figure>`;
  const xs=all.map(o=>o.x*4),ys=all.map(o=>o.y*2.25),mx=(Math.min(...xs)+Math.max(...xs))/2,my=(Math.min(...ys)+Math.max(...ys))/2;
  const scale=Math.min(320/Math.max(100,Math.max(...xs)-Math.min(...xs)),100/Math.max(45,Math.max(...ys)-Math.min(...ys)));
  const pos=(o:TrialObject)=>({x:200+(o.x*4-mx)*scale,y:85+(o.y*2.25-my)*scale});
  const label=(id:string)=>id.includes('magnet')||['probe','controller','cleaner'].includes(id)?'자석':id.includes('lid')||id==='use-handle'?'손잡이':id.includes('ring')?'고리':id.includes('paper')?'종이':id.includes('plate')||id.includes('target')?'대상 부품':id.includes('pad')?'패드':id.includes('clip')?'철 클립':id.includes('material')?'재료':'부품';
  const marks=list.map((o,i)=>{const end=pos(o),before=pos(t.initialObjects.find(p=>p.id===o.id)||o);
    return `<g><title>${escape(label(o.id))}</title><path d="M${before.x} ${before.y}L${end.x} ${end.y}" stroke="#71968b" stroke-width="2" stroke-dasharray="4 5"/><rect x="${before.x-21}" y="${before.y-14}" width="42" height="28" rx="7" fill="none" stroke="#9ab1a6" stroke-width="2" stroke-dasharray="3 3"/>${trialGlyph(o,t,end.x,end.y)}<circle cx="${end.x+21}" cy="${end.y-18}" r="10" fill="#315d65"/><text x="${end.x+21}" y="${end.y-14}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff9e9">${i+1}</text></g>`;}).join('');
  const outcome=({attract:'움직였어',none:'움직이지 않았어',success:'작동했어',failure:'다시 살펴보자'} as Record<string,string>)[t.outcome]||t.outcome;
  return `<figure class="trial-picture"><svg viewBox="0 0 400 170" role="img" aria-label="${escape(t.conditions.label||t.key)} · 처음과 결과 위치. 극 방향은 생략"><rect x="1" y="1" width="398" height="168" rx="12" fill="#f1ecd9"/>${marks}</svg><figcaption><span class="trial-key">${list.map((o,i)=>`${i+1} ${escape(label(o.id))}`).join(' · ')}</span>${escape(t.conditions.label||t.key)} · ${escape(outcome)}<small>점선은 처음 자리, 그림은 결과 자리야. 극 방향은 생략했어.</small></figcaption></figure>`;
}
