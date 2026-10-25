import { currentInventionTrial, paperComparison, validTrial, type Trial } from './trial-records';
import { missionReady } from './mission-model';
import { inquiryReady } from './inquiry-model';
export type Pole = 'N' | 'S';
export type Relation = 'attract' | 'repel' | 'none';
export type Point = { x: number; y: number };
export type Value = string | number | boolean;
export interface Observation { key: string; label: string; result: string; value?: number }
export interface Activity {
  values: Record<string, Value>;
  points: Record<string, Point>;
  records: Observation[];
  mask: number[];
  trials?: Trial[];
}
export interface Evidence { stage: number; date: string; activities: Activity[]; summary: string[] }
export interface Design { template: 'box' | 'remote'; pair: 'iron' | 'magnet'; pole: Pole; gap: number; aligned: boolean; revision: number }
export interface Save {
  version: 1 | 2; revision: number; started: boolean; updated: string;
  completed: number[]; evidence: Evidence[]; activities: Record<number, Activity>;
  design: Design; designs: Partial<Record<'box' | 'remote', Design>>;
  resume: number; city: Point; settings: { sound: boolean; motion: boolean; nickname: string; music?: boolean; musicVersion?: number; effects?: boolean; musicVolume?: number };
  final: { report: boolean; latch: Pole; ring: Pole; plate: number; complete: boolean; date: string; route?: { mode: 'basic' | 'challenge'; repair: 'delivery' | 'rings' | 'invention'; installed: boolean; operated: boolean; segments: string[]; revision: number; template: string; attempt?: Activity; optionalBackup?: string; replayEvidenceIds?: number[] } };
}
export const stageNames = ['생활 자석 조사국', '힘 실험 연구소', '극성 복원 센터', '원격 제어 구역', '시민 발명 공방'];
export const missionNames = ['장치 속 힘의 단서', '붙는 물체의 규칙', '뒤섞인 극을 복원하라', '손대지 않는 제어 작전', '도시를 위한 자석 발명'];
export const titles = ['숨어 있는 자석 찾기', '자꾸 열리는 물건 수리', '철 부품 분류 작전', '손대지 않고 클립 움직이기', '사라진 극 표시 복원', '고리자석 수리 의뢰', '수조 청소 구조 작전', '자석 택배를 부탁해', '시민을 위한 발명 설계', '내 발명품 사용 시험'];
export const evidenceNames = ['생활 자석 조사 기록', '힘 반응 실험 기록', '극성 판별 기록', '원격 제어 운용 기록', '발명 장치 검증서'];
export const descriptions = ['열고, 살펴보고, 숨어 있는 자석을 찾아봐.', '자석을 넣고 빼면 무엇이 달라질까?', '어떤 물체가 자석을 따라올까?', '거리와 종이판을 바꾸며 비교해 보자.', '당기고 미는 반응에서 극의 단서를 찾아봐.', '고리를 뒤집어 서로 떨어져 있게 만들어봐.', '수조 밖에서 안쪽 청소 패드를 움직여봐.', '자석으로 카트를 밀고 당겨 목적지로 보내봐.', '시민의 작은 불편을 해결하는 장치를 만들어봐.', '내가 만든 장치가 정말 작동하는지 확인해봐.'];
export const materials = [
  { id: 'clip', name: '철 클립', magnetic: true },
  { id: 'nail', name: '철못', magnetic: true },
  { id: 'aluminum', name: '알루미늄', magnetic: false },
  { id: 'wood', name: '나무 조각', magnetic: false },
  { id: 'plastic', name: '플라스틱', magnetic: false },
  { id: 'rubber', name: '고무 지우개', magnetic: false }
];
export const emptyActivity = (): Activity => ({ values: {}, points: {}, records: [], mask: [] });
export const defaultDesign = (template: Design['template'] = 'box'): Design => ({ template, pair: 'iron', pole: 'N', gap: 65, aligned: false, revision: 0 });
export function freshSave(): Save {
  return { version: 2, revision: 0, started: false, updated: new Date().toISOString(), completed: [], evidence: [], activities: {}, design: defaultDesign(), designs: {}, resume: 0, city: { x: 233, y: 245 }, settings: { sound: true, music: true, musicVersion: 1, effects: true, musicVolume: .35, motion: true, nickname: '' }, final: { report: false, latch: 'N', ring: 'N', plate: 80, complete: false, date: '' } };
}
export function opposite(p: Pole): Pole { return p === 'N' ? 'S' : 'N'; }
export function relation(a: Pole, b: Pole): Relation { return a === b ? 'repel' : 'attract'; }
export function response(distance: number, magnetic = true): 'strong' | 'weak' | 'none' { return !magnetic || distance > 70 ? 'none' : distance > 36 ? 'weak' : 'strong'; }
export function ringGaps(tops: Pole[]): boolean[] { return tops.slice(1).map((p, i) => tops[i] === opposite(p)); }
export function cartDirection(side: 'front' | 'back', facing: Pole): number {
  const cartFacing: Pole = side === 'front' ? 'N' : 'S';
  const towardMagnet = relation(facing, cartFacing) === 'attract';
  return (side === 'front' ? 1 : -1) * (towardMagnet ? 1 : -1);
}
export function designResult(d: Design): { ready: boolean; reason: string } {
  if (!d.aligned) return { ready: false, reason: '자석과 대상이 마주 보는 위치로 옮겨봐.' };
  if (d.gap > 36) return { ready: false, reason: '거리가 멀어서 힘이 잘 닿지 않아. 자석을 더 가까이 놓아봐.' };
  if (d.template === 'box' && d.pair === 'magnet' && d.pole === 'N') return { ready: false, reason: '마주 보는 극이 같아서 덮개가 밀려나. 자석을 뒤집어봐.' };
  return { ready: true, reason: d.template === 'box' ? '자석이 마주 보는 대상을 당겨 덮개가 고정됐어!' : '판 너머 철제 부품이 자석을 따라 움직여!' };
}
export function progress(s: Save): number { return s.final.complete ? 100 : [0, 20, 40, 60, 80, 95][s.evidence.length] ?? 0; }
export function unlockedStage(s: Save, stage: number, preview = false): boolean { return stage >= 0 && stage < 5 && (preview || stage <= s.evidence.length); }
export function accessible(s: Save, screen: number, preview = false): boolean { return Number.isInteger(screen) && screen >= 1 && screen <= 10 && (preview || (unlockedStage(s, Math.floor((screen - 1) / 2)) && (screen % 2 === 1 || s.completed.includes(screen - 1)))); }
export function value(a: Activity, key: string, fallback: number): number { return typeof a.values[key] === 'number' ? a.values[key] as number : fallback; }
export function flag(a: Activity, key: string): boolean { return a.values[key] === true; }
export function record(a: Activity, o: Observation): void { const i = a.records.findIndex(r => r.key === o.key); if (i >= 0) a.records[i] = o; else a.records.push(o); }
export function ready(screen: number, a: Activity, s: Save): boolean {
  if (a.values.playVersion === 4) return missionReady(screen, a, s) && inquiryReady(screen,a);
  const f = (k: string) => flag(a, k);
  if (a.values.playVersion === 3) {
    switch (screen) {
      case 1: return [0, 1].every(i => f(`open${i}`) && f(`found${i}`));
      case 2: return [0, 1].every(i => f(`with${i}`) && f(`without${i}`));
      case 3: return materials.every(m => f(m.id) && f(`sorted-${m.id}`));
      case 4: return !!a.trials?.some(t => t.key === 'far-clear' && t.outcome === 'none' && validTrial(t)) && paperComparison(a);
      case 5: return [0, 1, 2, 3].every(i => f(`test${i}N`) && f(`test${i}S`) && f(`solved${i}`));
      case 6: return f('two-attract') && f('two-repel') && f('order1');
      case 9: return f('base') && f('magnet') && f('target');
      case 10: return f('reason') && designResult(s.design).ready && currentInventionTrial(a, s.design.template, s.design.revision);
    }
  }
  if (a.values.playVersion === 2) {
    switch (screen) {
      case 1: return [0, 1].every(i => f(`open${i}`) && f(`found${i}`));
      case 2: return [0, 1].every(i => f(`with${i}`) && f(`without${i}`) && f(`role${i}`));
      case 3: return materials.every(m => f(m.id) && f(`sorted-${m.id}`));
      case 4: return ['near-clear', 'far-clear', 'near-paper'].every(f);
      case 5: return [0, 1, 2, 3].every(i => f(`test${i}N`) && f(`test${i}S`) && f(`solved${i}`));
      case 6: return [0, 1, 2].every(i => f(`order${i}`));
      case 8: return [0, 1, 2].every(i => f(`segment${i}`));
      case 9: return f('base') && f('magnet') && f('target');
      case 10: return f('trial0') && f('trial1') && f('reason') && a.values.template === s.design.template && value(a, 'revision', -1) === s.design.revision;
    }
  }
  switch (screen) {
    case 1: return [0, 1].every(i => f(`open${i}`) && f(`inside${i}`) && f(`found${i}`) && f(`predicted${i}`));
    case 2: return [0, 1].every(i => f(`with${i}`) && f(`without${i}`) && f(`role${i}`));
    case 3: return materials.every(m => f(m.id)) && f('compare');
    case 4: return ['near-clear', 'far-clear', 'near-paper'].every(k => f(k)) && f('compare');
    case 5: return [0, 1, 2, 3].every(i => f(`test${i}N`) && f(`test${i}S`) && f(`solved${i}`));
    case 6: return f('tested') && f('gaps') && f('reason');
    case 7: return cleanPercent(a.mask) >= 85;
    case 8: return [0, 1, 2].every(i => f(`segment${i}`));
    case 9: return f('base') && f('magnet') && f('target');
    case 10: return f('passed') && f('reason') && a.values.template === s.design.template && value(a, 'revision', -1) === s.design.revision;
    default: return false;
  }
}
export function completeActivity(s: Save, screen: number): boolean {
  const a = s.activities[screen];
  if (!a || !accessible(s, screen) || !ready(screen, a, s)) return false;
  if (!s.completed.includes(screen)) s.completed.push(screen);
  if (screen % 2 === 0) {
    const stage = screen / 2 - 1;
    if (!s.evidence.some(e => e.stage === stage)) {
      if (s.evidence.length !== stage) return false;
      const activities = structuredClone([s.activities[screen - 1], a]);
      s.evidence.push({ stage, date: new Date().toISOString(), activities, summary: activities.flatMap(x => x.records.map(r => `${r.label}: ${r.result}`)) });
    }
    s.resume = 0;
  } else s.resume = screen + 1;
  return true;
}
export const grid = { w: 48, h: 24 };
export function dirtyCell(x: number, y: number): boolean {
  return ((x - 12) ** 2 / 85 + (y - 7) ** 2 / 26 < 1) || ((x - 34) ** 2 / 67 + (y - 15) ** 2 / 25 < 1) || (x > 22 && x < 31 && y > 3 && y < 8);
}
export const dirtyCount = Array.from({ length: grid.w * grid.h }, (_, i) => dirtyCell(i % grid.w, Math.floor(i / grid.w))).filter(Boolean).length;
export function cleanPercent(mask: number[]): number { return Math.min(100, Math.round(new Set(mask.filter(i => i >= 0 && i < grid.w * grid.h && dirtyCell(i % grid.w, Math.floor(i / grid.w)))).size / dirtyCount * 100)); }
export function sweep(mask: number[], from: Point, to: Point): number[] {
  const set = new Set(mask); const distance = Math.hypot(to.x - from.x, to.y - from.y); const steps = Math.max(1, Math.ceil(distance / 2));
  for (let n = 0; n <= steps; n++) { const px = (from.x + (to.x - from.x) * n / steps) / 100 * grid.w; const py = (from.y + (to.y - from.y) * n / steps) / 100 * grid.h;
    for (let y = Math.max(0, Math.floor(py - 2)); y <= Math.min(grid.h - 1, Math.ceil(py + 2)); y++) for (let x = Math.max(0, Math.floor(px - 3)); x <= Math.min(grid.w - 1, Math.ceil(px + 3)); x++) if (dirtyCell(x, y) && ((x - px) / 3) ** 2 + ((y - py) / 2) ** 2 < 1) set.add(y * grid.w + x);
  } return [...set];
}
export function coreReady(s: Save, preview = false): boolean {
  if (s.final.route) {
    const r = s.final.route;
    return (preview || s.evidence.length === 5 && s.final.report) && r.operated && finalRepairPassed(s) &&
      (r.repair !== 'invention' || r.installed && r.revision === s.design.revision && r.template === s.design.template) &&
      (r.mode === 'basic' || ['sort', 'delivery', 'rings', 'invention'].every(k => r.segments.includes(k)));
  }
  return (preview || (s.evidence.length === 5 && s.final.report)) && s.final.latch === 'S' && s.final.ring === 'S' && s.final.plate <= 36;
}
export function finalRepairPassed(s: Save): boolean {
  const r = s.final.route, a = r?.attempt; if (!r || !a) return false;
  if (r.repair === 'invention') return r.installed && designResult(s.design).ready && currentInventionTrial(a, s.design.template, s.design.revision);
  if (r.repair === 'delivery') return !!a.trials?.some(t => validTrial(t) && t.key === 'segment0' && t.objects.some(o => o.id === 'cart-magnet' && Math.abs(o.x - 53) < 10));
  return !!a.trials?.some(t => validTrial(t) && t.key === 'rings-1-NSS');
}
export function validSave(input: unknown): input is Save {
  if (!input || typeof input !== 'object') return false;
  const s = input as Save;
  if (![1, 2].includes(s.version) || !Array.isArray(s.completed) || !Array.isArray(s.evidence) || !s.activities || !s.settings || !s.final || !s.design || !s.city || !Number.isInteger(s.revision)) return false;
  if (s.evidence.length > 5 || s.evidence.some((e, i) => e.stage !== i || !Array.isArray(e.activities) || !Array.isArray(e.summary) || !s.completed.includes(i * 2 + 1) || !s.completed.includes(i * 2 + 2))) return false;
  if (s.completed.some(x => !Number.isInteger(x) || x < 1 || x > 10)) return false;
  const validActivity = (a: Activity) => !!a && typeof a.values === 'object' && !!a.values && typeof a.points === 'object' && !!a.points &&
    Object.values(a.points).every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y)) &&
    Array.isArray(a.records) && a.records.every(r => r && typeof r.key === 'string' && typeof r.label === 'string' && typeof r.result === 'string') &&
    Array.isArray(a.mask) && a.mask.every(Number.isInteger) && (!a.trials || Array.isArray(a.trials) && a.trials.every(validTrial));
  for (const a of [...Object.values(s.activities), ...s.evidence.flatMap(e => e.activities)]) if (!validActivity(a)) return false;
  const route = s.final.route;
  if (route && (!['basic', 'challenge'].includes(route.mode) || !['delivery', 'rings', 'invention'].includes(route.repair) || !Array.isArray(route.segments) || typeof route.operated !== 'boolean' || typeof route.installed !== 'boolean' || !Number.isInteger(route.revision) || !['box', 'remote'].includes(route.template))) return false;
  if (route?.attempt && !validActivity(route.attempt)) return false;
  if (!['box', 'remote'].includes(s.design.template) || !['iron', 'magnet'].includes(s.design.pair) || !['N', 'S'].includes(s.design.pole) || !Number.isFinite(s.design.gap) || !Number.isInteger(s.design.revision) || typeof s.design.aligned !== 'boolean') return false;
  if (s.final.complete && !coreReady(s)) return false;
  return Number.isFinite(s.city.x) && Number.isFinite(s.city.y);
}
export function migrateSave(input: unknown): Save | null {
  if (!validSave(input)) return null;
  const next = structuredClone(input);
  next.version = 2;
  next.designs ||= {};
  // The effects-only release forced music=false. Enable the new tracks once,
  // while preserving global mute and all later independent preferences.
  next.settings.music = next.settings.musicVersion === 1 && typeof next.settings.music === 'boolean' ? next.settings.music : next.settings.sound;
  next.settings.musicVersion = 1;
  next.settings.effects = typeof next.settings.effects === 'boolean' ? next.settings.effects : next.settings.sound;
  next.settings.musicVolume = Number.isFinite(next.settings.musicVolume) ? Math.max(0, Math.min(1, next.settings.musicVolume!)) : .35;
  for (const a of Object.values(next.activities)) a.trials ||= [];
  return validSave(next) ? next : null;
}
