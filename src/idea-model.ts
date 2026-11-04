import type { Point, Pole } from './domain';

export const boardSize = { w: 160, h: 90 };
export interface IdeaSticker { uid: number; id: string; x: number; y: number; pole?: Pole }
export interface IdeaFeedback { from: string; sticker: 'useful' | 'clever' | 'curious'; question: string }
export interface Idea {
  problem: string; custom: string; properties: string[];
  strokes: Point[][]; arrows: [Point, Point][]; stickers: IdeaSticker[];
  name: string; pitch: string; voice: boolean; shown: boolean;
  feedback: IdeaFeedback[]; chosen: number; change: string;
  step9: number; step10: number; checked: boolean;
}
export const emptyIdea = (): Idea => ({ problem: '', custom: '', properties: [], strokes: [], arrows: [], stickers: [], name: '', pitch: '', voice: false, shown: false, feedback: [], chosen: -1, change: '', step9: 0, step10: 0, checked: false });

/** A learner between the old design and use tests finishes them; everyone else gets the idea workshop. */
export function usesIdeaLab(s: { completed: number[]; idea?: Idea }, screen: number): boolean {
  return screen >= 9 && !(s.completed.includes(9) && !s.completed.includes(10) && !s.idea);
}

const reach = 42;
const apart = (a: IdeaSticker, b: IdeaSticker) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (list: IdeaSticker[], others: IdeaSticker[]) => list.some(a => others.some(b => a !== b && apart(a, b) <= reach));

/** Science checks only: the idea itself is the learner's, but the magnet must really be able to do the job. */
export function ideaChecks(i: Idea): string[] {
  const magnets = i.stickers.filter(s => s.id === 'magnet'), iron = i.stickers.filter(s => s.id === 'iron'), plate = i.stickers.filter(s => s.id === 'plate');
  const has = (id: string) => i.properties.includes(id), issues: string[] = [];
  if (!magnets.length) return ['자석 스티커를 하나 이상 붙여 줘.'];
  if (has('iron')) {
    if (!iron.length) issues.push('철을 끌어당긴다고 골랐어. 철 스티커는 어디 있을까?');
    else if (!near(magnets, iron)) issues.push('자석과 철이 너무 멀어. 힘이 닿게 더 가까이 옮겨 봐.');
  }
  const pairs = magnets.flatMap((a, n) => magnets.slice(n + 1).map(b => [a, b] as const)).filter(([a, b]) => apart(a, b) <= reach);
  if (has('opposite') || has('same')) {
    if (magnets.length < 2) issues.push('자석끼리의 힘을 쓰려면 자석이 두 개 필요해.');
    else if (!pairs.length) issues.push('두 자석이 너무 멀어. 힘이 닿게 더 가까이 옮겨 봐.');
    else {
      if (has('opposite') && !pairs.some(([a, b]) => a.pole !== b.pole)) issues.push('서로 당기려면 마주 보는 극이 달라야 해. 한 자석을 뒤집어 봐.');
      if (has('same') && !pairs.some(([a, b]) => a.pole === b.pole)) issues.push('서로 밀어내려면 마주 보는 극이 같아야 해. 한 자석을 뒤집어 봐.');
    }
  }
  if (has('through') && !plate.length) issues.push('얇은 물체 너머로 힘을 쓴다고 골랐어. 얇은 판 스티커를 놓아 봐.');
  if (!i.arrows.length) issues.push('자석의 힘이 어느 쪽으로 작용하는지 화살표를 그려 봐.');
  return issues;
}
export const problemChosen = (i: Idea) => i.problem !== '' && (i.problem !== 'custom' || i.custom.trim().length >= 4);
export const pitchReady = (i: Idea) => i.voice || i.pitch.trim().length >= 10;

export function ideaReady(screen: number, i: Idea | undefined): boolean {
  if (!i) return false;
  if (screen === 9) return problemChosen(i) && i.properties.length > 0 && i.checked && !ideaChecks(i).length;
  return i.name.trim().length > 0 && pitchReady(i) && i.shown && i.feedback.length > 0 && i.chosen >= 0 && i.change.trim().length >= 4 && !ideaChecks(i).length;
}

/** Keeps a learner working alone from being stuck waiting for a classmate. */
export function buddyFeedback(i: Idea): IdeaFeedback[] {
  const question = i.properties.includes('same') ? '두 자석이 계속 밀어내려면 어떻게 고정할 거야?'
    : i.properties.includes('through') ? '판이 더 두꺼워지면 어떻게 될까?'
    : i.properties.includes('distance') ? '얼마나 가까워야 잘 작동할까?'
    : '자석이 너무 세게 붙으면 어떻게 뗄 거야?';
  return [{ from: '밀이', sticker: 'curious', question }, { from: '당이', sticker: 'useful', question: '이 발명품은 누가 가장 기뻐할까? 그 사람이 쓰기 편하게 바꿀 곳이 있어?' }];
}

const isPoint = (p: Point) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
export function validIdea(input: unknown): input is Idea {
  const i = input as Idea;
  return !!i && typeof i === 'object' && ['problem', 'custom', 'name', 'pitch', 'change'].every(k => typeof i[k as keyof Idea] === 'string') &&
    Array.isArray(i.properties) && i.properties.every(p => typeof p === 'string') &&
    Array.isArray(i.strokes) && i.strokes.every(line => Array.isArray(line) && line.every(isPoint)) &&
    Array.isArray(i.arrows) && i.arrows.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(isPoint)) &&
    Array.isArray(i.stickers) && i.stickers.every(s => s && typeof s.id === 'string' && Number.isInteger(s.uid) && isPoint(s)) &&
    Array.isArray(i.feedback) && i.feedback.every(f => f && typeof f.question === 'string' && typeof f.from === 'string') &&
    typeof i.voice === 'boolean' && typeof i.shown === 'boolean' && typeof i.checked === 'boolean' &&
    [i.chosen, i.step9, i.step10].every(Number.isInteger);
}
