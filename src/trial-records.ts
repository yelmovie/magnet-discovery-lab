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
export function trialPicture(t: Trial): string {
  const objects = (list: TrialObject[], before: boolean) => list.map(o => `<g class="${before ? 'trial-before' : 'trial-object'}" style="--dx:${((t.initialObjects.find(p => p.id === o.id)?.x ?? o.x) - o.x) * 4}px;--dy:${((t.initialObjects.find(p => p.id === o.id)?.y ?? o.y) - o.y) * 1.6}px" opacity="${before ? '.3' : '1'}"><rect x="${o.x * 4 - 18}" y="${o.y * 1.6 - 10}" width="36" height="22" rx="5" fill="${o.id.includes('magnet') ? '#d45b51' : o.id === 'paper' ? '#eadca9' : '#7d9ca6'}"/><text x="${o.x * 4}" y="${o.y * 1.6 + 6}" text-anchor="middle" font-size="13" fill="#123d4c">${escape(o.pole || (o.id.includes('magnet') ? 'N S' : o.id.includes('clip') ? '철' : o.id === 'paper' ? '종이' : '●'))}</text></g>`).join('');
  return `<figure class="trial-picture"><svg viewBox="0 0 400 170" role="img" aria-label="${escape(t.conditions.label || t.key)} · 실험 전후 위치">${objects(t.initialObjects, true)}${objects(t.objects, false)}</svg><figcaption>${escape(t.conditions.label || t.key)} · ${escape(({ attract: '클립이 움직였어', none: '움직이지 않았어', success: '작동했어', failure: '다시 살펴보자' } as Record<string, string>)[t.outcome] || t.outcome)}</figcaption></figure>`;
}
