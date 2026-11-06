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

export const problemChosen = (i: Idea) => i.problem !== '' && (i.problem !== 'custom' || i.custom.trim().length >= 4);
export const hasIdeaSketch = (i: Idea) => i.strokes.some(line => line.length > 1) || i.arrows.length > 0 || i.stickers.length > 0;
// Earlier saves can already have finished the introduction via recording.
export const pitchReady = (i: Idea) => i.voice || i.pitch.trim().length >= 10;

export function ideaReady(screen: number, i: Idea | undefined): boolean {
  if (!i) return false;
  if (screen === 9) return problemChosen(i) && i.properties.length > 0;
  return i.name.trim().length > 0 && pitchReady(i) && i.shown;
}

/** Keeps a learner working alone from being stuck waiting for a classmate. */
export function buddyFeedback(i: Idea): IdeaFeedback[] {
  const question = i.properties.includes('same') ? '두 자석이 계속 밀어내려면 어떻게 고정할 거야?'
    : i.properties.includes('through') ? '판이 더 두꺼워지면 어떻게 될까?'
    : i.properties.includes('distance') ? '얼마나 가까워야 잘 작동할까?'
    : '자석이 너무 세게 붙으면 어떻게 뗄 거야?';
  return [{ from: '밀이', sticker: 'curious', question }, { from: '당이', sticker: 'useful', question: '이 발명품은 누가 가장 기뻐할까? 어떻게 쓰는지 보여 줄래?' }];
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
