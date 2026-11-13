import { currentInventionTrial, paperComparison, validTrial, type Trial } from './trial-records';
import { missionReady } from './mission-model';
import { inquiryReady } from './inquiry-model';
import { reviewPassed, validReview, type FinalReview } from './final-review';
import { ideaReady, validIdea, type Idea } from './idea-model';
export type Pole = 'N' | 'S';
export type Relation = 'attract' | 'repel' | 'none';
export type Point = { x: number; y: number };
export type Value = string | number | boolean;
export interface Observation { key: string; label: string; result: string; value?: number }
export interface Activity {
  /** Small WebP of the learner's final arrangement, used on the question page. */
  experimentPhoto?: string;
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
  greetedResidents?: number[];
  mapEncounters?: Record<string, number>;
  design: Design; designs: Partial<Record<'box' | 'remote', Design>>;
  idea?: Idea;
  resume: number; city: Point; settings: { sound: boolean; motion: boolean; nickname: string; ability?: number; music?: boolean; musicVersion?: number; effects?: boolean; musicVolume?: number; autoplay?: boolean; autoplaySpeed?: 1 | 2 };
  final: { report: boolean; latch: Pole; ring: Pole; plate: number; complete: boolean; date: string; puzzle?: Activity; review?: FinalReview; route?: { mode: 'basic' | 'challenge'; repair: 'delivery' | 'rings' | 'invention'; installed: boolean; operated: boolean; segments: string[]; revision: number; template: string; attempt?: Activity; optionalBackup?: string; replayEvidenceIds?: number[] } };
}
export const stageNames = ['생활 자석 조사국', '힘 실험 연구소', '극성 복원 센터', '원격 제어 구역', '시민 발명 공방'];
export const missionNames = ['장치 속 힘의 단서', '붙는 물체의 규칙', '뒤섞인 극을 복원하라', '손대지 않는 제어 작전', '도시를 위한 자석 발명'];
export const titles = ['우편함 직접 조립하기', '자꾸 열리는 물건 수리', '철 부품 분류 작전', '손대지 않고 클립 움직이기', '사라진 극 표시 복원', '고리자석 수리 의뢰', '수조 청소 구조 작전', '자석 택배를 부탁해', '시민을 위한 발명 설계', '내 발명품 사용 시험'];
export const evidenceNames = ['생활 자석 조사 기록', '힘 반응 실험 기록', '극성 판별 기록', '원격 제어 운용 기록', '발명 아이디어 기록'];
export const descriptions = ['부품을 끼우고 덮개를 닫아 자석의 힘을 확인해 봐.', '자석을 넣고 빼면 무엇이 달라질까?', '어떤 물체가 자석을 따라올까?', '거리와 종이판을 바꾸며 비교해 보자.', '당기고 미는 반응에서 극의 단서를 찾아봐.', '고리를 뒤집어 서로 떨어져 있게 만들어봐.', '수조 밖에서 안쪽 청소 패드를 움직여봐.', '자석으로 카트를 밀고 당겨 목적지로 보내봐.', '시민의 작은 불편을 해결하는 장치를 만들어봐.', '내가 만든 장치가 정말 작동하는지 확인해봐.'];
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
  return { version: 2, revision: 0, started: false, updated: new Date().toISOString(), completed: [], evidence: [], activities: {}, design: defaultDesign(), designs: {}, resume: 0, city: { x: 233, y: 245 }, settings: { sound: true, music: true, musicVersion: 1, effects: true, musicVolume: .35, motion: true, nickname: '', autoplay: true, autoplaySpeed: 1 }, final: { report: false, latch: 'N', ring: 'N', plate: 80, complete: false, date: '' } };
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
  if (d.gap > 36) return { ready: false, reason: '지금 간격에서는 움직임이 잘 보이지 않아. 자석을 더 가까이 놓아 봐.' };
  if (d.pair === 'magnet' && d.pole === 'N') return { ready: false, reason: '마주 보는 극이 같아서 밀어내. 붙잡으려면 한 자석을 뒤집어 봐.' };
  return { ready: true, reason: d.template === 'box' ? '자석이 마주 보는 대상을 당겨 덮개가 고정됐어!' : '판 너머의 부품이 자석에 끌려 따라 움직여!' };
}
export function progress(s: Save): number { return s.final.complete ? 100 : [0, 20, 40, 60, 80, 95][s.evidence.length] ?? 0; }
export function unlockedStage(s: Save, stage: number, preview = false): boolean { return stage >= 0 && stage < 5 && (preview || stage <= s.evidence.length); }
export function accessible(s: Save, screen: number, preview = false): boolean { return Number.isInteger(screen) && screen >= 1 && screen <= 10 && (preview || (unlockedStage(s, Math.floor((screen - 1) / 2)) && (screen % 2 === 1 || s.completed.includes(screen - 1) || (screen === 2 && s.activities[2]?.values.mailboxQuickRepair === true)))); }
export function value(a: Activity, key: string, fallback: number): number { return typeof a.values[key] === 'number' ? a.values[key] as number : fallback; }
export function flag(a: Activity, key: string): boolean { return a.values[key] === true; }
export function record(a: Activity, o: Observation): void { const i = a.records.findIndex(r => r.key === o.key); if (i >= 0) a.records[i] = o; else a.records.push(o); }
export function ready(screen: number, a: Activity, s: Save): boolean {
  if (a.values.ideaVersion === 1) return ideaReady(screen, s.idea);
  if (a.values.playVersion === 4) return missionReady(screen, a, s) && ((screen === 2 && flag(a, 'mailboxQuickRepair')) || inquiryReady(screen,a));
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
  if (screen % 2 === 0) {
    const stage = screen / 2 - 1;
    if (!s.evidence.some(e => e.stage === stage)) {
      if (s.evidence.length !== stage) return false;
      // Older saves can retain the first completion flag without its detailed observations.
      // Keep the paired snapshot shape without inventing an observation or changing the working save.
      const previous = s.activities[screen - 1];
      const activities = structuredClone([previous ?? emptyActivity(), a]);
      const summary = activities.flatMap(x => x.records.map(r => `${r.label}: ${r.result}`));
      if (!previous && !(screen === 2 && flag(a, 'mailboxQuickRepair'))) summary.unshift('첫 번째 탐구는 완료했어. 이전 저장에는 그때의 관찰 기록이 남아 있지 않아.');
      s.evidence.push({ stage, date: new Date().toISOString(), activities, summary });
    }
    if (screen === 2 && flag(a, 'mailboxQuickRepair') && !s.completed.includes(1)) s.completed.push(1);
    s.resume = 0;
  } else s.resume = screen + 1;
  if (!s.completed.includes(screen)) s.completed.push(screen);
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
export function plazaPuzzlePassed(a:Activity):boolean {
  return ['plaza-iron','plaza-distance','plaza-poles','plaza-glass'].every(key=>a.trials?.some(t=>t.key===key&&validTrial(t)&&t.outcome==='success'));
}
export function coreReady(s: Save, preview = false): boolean {
  if(!preview&&s.final.puzzle&&!plazaPuzzlePassed(s.final.puzzle))return false;
  if(s.final.review)return preview || s.evidence.length===5&&s.final.report&&reviewPassed(s.final.review);
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
  if(s.final.puzzle&&!validActivity(s.final.puzzle))return false;
  const route = s.final.route;
  if(s.final.review&&!validReview(s.final.review))return false;
  if (route && (!['basic', 'challenge'].includes(route.mode) || !['delivery', 'rings', 'invention'].includes(route.repair) || !Array.isArray(route.segments) || typeof route.operated !== 'boolean' || typeof route.installed !== 'boolean' || !Number.isInteger(route.revision) || !['box', 'remote'].includes(route.template))) return false;
  if (route?.attempt && !validActivity(route.attempt)) return false;
  if (!['box', 'remote'].includes(s.design.template) || !['iron', 'magnet'].includes(s.design.pair) || !['N', 'S'].includes(s.design.pole) || !Number.isFinite(s.design.gap) || !Number.isInteger(s.design.revision) || typeof s.design.aligned !== 'boolean') return false;
  if (s.final.complete && !coreReady(s)) return false;
  return Number.isFinite(s.city.x) && Number.isFinite(s.city.y);
}
/** Keeps every field that still reads correctly. Unknown versions stay untouched: a newer build wrote them. */
export function repairSave(input: unknown): Save | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<Record<keyof Save, unknown>>;
  if (raw.version !== 1 && raw.version !== 2) return null;
  const next = freshSave();
  const keep = <K extends keyof Save>(key: K, value: unknown) => { const trial = { ...next, [key]: value }; if (validSave(trial)) Object.assign(next, { [key]: value }); };
  keep('revision', raw.revision); if (typeof raw.updated === 'string') next.updated = raw.updated;
  if (Array.isArray(raw.completed)) keep('completed', raw.completed.filter(n => Number.isInteger(n) && n >= 1 && n <= 10));
  if (Array.isArray(raw.evidence)) for (const evidence of raw.evidence) { const before = next.evidence.length; keep('evidence', [...next.evidence, evidence]); if (next.evidence.length === before) break; }
  if (raw.activities && typeof raw.activities === 'object') for (const [n, activity] of Object.entries(raw.activities)) keep('activities', { ...next.activities, [n]: activity });
  for (const key of ['design', 'designs', 'idea', 'greetedResidents', 'city', 'final'] as const) keep(key, raw[key]);
  if (Number.isInteger(raw.resume)) next.resume = raw.resume as number;
  if (raw.settings && typeof raw.settings === 'object') { const s = raw.settings as Partial<Save['settings']>; if (typeof s.sound === 'boolean') next.settings.sound = s.sound; if (typeof s.motion === 'boolean') next.settings.motion = s.motion; if (typeof s.nickname === 'string') next.settings.nickname = s.nickname; if (typeof s.autoplay === 'boolean') next.settings.autoplay = s.autoplay; if (s.autoplaySpeed === 1 || s.autoplaySpeed === 2) next.settings.autoplaySpeed = s.autoplaySpeed; }
  const recovered = next.completed.length > 0 || Object.keys(next.activities).length > 0;
  if (!recovered) return null;
  next.started = true;
  return migrateSave(next);
}
export function migrateSave(input: unknown): Save | null {
  if (!validSave(input)) return null;
  const next = structuredClone(input);
  next.version = 2;
  next.designs ||= {};
  next.mapEncounters = Object.fromEntries(['clip','parts','pole','latch','workshop','plaza'].flatMap(id => {
    const hits=next.mapEncounters?.[id];return typeof hits==='number'&&Number.isInteger(hits)&&hits>=1&&hits<=3?[[id,hits]]:[];
  }));
  if (next.idea && !validIdea(next.idea)) delete next.idea;
  next.greetedResidents = Array.isArray(next.greetedResidents)
    ? next.evidence.map(e => e.stage).filter(stage => next.greetedResidents!.includes(stage))
    : [];
  // The effects-only release forced music=false. Enable the new tracks once,
  // while preserving global mute and all later independent preferences.
  next.settings.music = next.settings.musicVersion === 1 && typeof next.settings.music === 'boolean' ? next.settings.music : next.settings.sound;
  next.settings.musicVersion = 1;
  next.settings.effects = typeof next.settings.effects === 'boolean' ? next.settings.effects : next.settings.sound;
  next.settings.musicVolume = Number.isFinite(next.settings.musicVolume) ? Math.max(0, Math.min(1, next.settings.musicVolume!)) : .35;
  next.settings.autoplay = next.settings.autoplay !== false;
  next.settings.autoplaySpeed = next.settings.autoplaySpeed === 2 ? 2 : 1;
  for (const a of Object.values(next.activities)) a.trials ||= [];
  return validSave(next) ? next : null;
}
