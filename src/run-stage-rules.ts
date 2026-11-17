// Rules that tie the 3D delivery course to the bench model. No three.js here:
// the cart is still moved and judged by delivery() in missions-remote.ts.
import { materials, type Activity, type Point, type Save } from './domain';
import { deliveryCourse, deliveryRoute, distance, magneticReach } from './mission-model';

/** One bench unit (1% of the bench width) is half a metre of course. */
export const UNIT = .5;
/** Rail centre and the walkway beside it, in metres across the course. */
export const lane = { rail: 2.1, left: -1.2, right: 1 } as const;
/** Bench row of the rail, and the row a lowered magnet is sent to (the 2D "자석 떼기" row). */
const RAIL_ROW = 59, LOWERED_ROW = 38;

/** The runner's hand magnet as a bench point. `lateral` is the distance to the rail in metres. */
export function benchPoint(s: number, lateral: number, held: boolean): Point {
  return { x: s, y: held ? RAIL_ROW - lateral / UNIT / .5625 : LOWERED_ROW };
}

/** Course positions in bench units. The stations sit where the bench puts them. */
export const courseStart = -30;
export const practice = { step: [-20, -13], stepHeight: .55, gap: [-5, -2], villain: 9, flipTip: 13 } as const;
/** How far the runner can go: the glass door closes for the second stretch. */
export const courseEnd = (wall: boolean) => wall ? deliveryCourse.reach : 56;

const checkpoints = [courseStart, -11, 0, 20, 38];
export const checkpointFor = (s: number) => checkpoints.reduce((best, mark) => mark <= s ? mark : best, courseStart);
export const hintAfterFalls = (falls: number) => falls >= 3;

/** Practice-lane objects. Whether each one is magnetic comes from the shared material table. */
export const practiceItems = [
  { id: 'clip', s: -23, name: '철 클립', atlas: 0 },
  { id: 'aluminum', s: -10, name: '알루미늄 포일', atlas: 2 },
  { id: 'plastic', s: 4, name: '플라스틱 조각', atlas: 4 },
] as const;
export function pickupSticks(id: string, magnet: Point, item: Point): boolean {
  const magnetic = materials.find(m => m.id === id)?.magnetic === true;
  // A clip does not leap across the street: the course asks for a closer pass than the bench.
  return magneticReach(magnet, item, magnetic) && distance(magnet, item) <= 4;
}
export const pickupLine = (id: string, name: string) =>
  materials.find(m => m.id === id)?.magnetic ? `${name}이 자석에 착 붙었어! 철은 자석에 붙어.` : `${name}은 자석을 가까이 대도 붙지 않아.`;

/** Practice-lane prompts: one small thing to try at each spot. Past the lane the delivery status takes over. */
export const practiceEnd = 16;
export function practiceTip(s: number, flipped: boolean): string {
  if (s < -21) return '방향판 ▲를 누르면 앞으로 가. 자석을 들고 걸어 보자!';
  if (s < -13) return '턱이야! 점프 버튼으로 뛰어올라 봐.';
  if (s >= -9 && s < -2) return '틈이 있어. 달리면서 점프!';
  if (s >= 2 && s < practice.villain) return '도깨비가 길을 왔다 갔다 해. 틈을 보고 지나가자.';
  if (s >= practice.villain + 1 && s < practiceEnd && !flipped) return '극 뒤집기를 눌러 봐. 자석의 앞뒤 극이 바뀌어.';
  if (s >= practice.villain + 1 && s < practiceEnd) return '저 앞이 출발역이야. 수레에 자석을 가까이 가져가 봐!';
  return '';
}
export const fallLine = (falls: number) => hintAfterFalls(falls)
  ? '당이: 가장자리 바로 앞에서 점프를 눌러 봐. 어려우면 위의 「2D 화면으로 보기」로 바꿔도 돼.'
  : '앗, 떨어졌어! 조금 앞에서 다시 해 보자.';

/** Where the runner stands when the course opens. */
export function resumeSpot(a: Activity): number {
  const saved = a.points.controller?.x;
  if (!Number.isFinite(saved)) return courseStart;
  return Math.max(courseStart, Math.min(courseEnd(deliveryRoute(a).wall), saved));
}

let blocked = false;
/** Set when this device cannot draw the course (no WebGL, or the scene failed to load). */
export const setRunBlocked = (value: boolean) => { blocked = value; };
export const runAvailable = (s: Save) => !blocked && s.settings.motion !== false;
/** Only the extended course has a 3D view, and only when the learner's attempt asked for it. */
export const runView = (a: Activity, s: Save) =>
  a.values.view === 'run' && a.values.puzzleRevision === 2 && runAvailable(s);

type Arrival = { car: number; start: number; goal: number; atGoal: boolean; done: boolean; forceOn: boolean };
/**
 * The runner lowers the magnet by herself as soon as her magnet has brought the cart into the flag bay.
 * Lowering only takes the force away: delivery() still lets the cart coast and decides whether it stopped in the bay.
 */
export const shouldAutoLower = (state: Arrival, held: boolean) => held && state.atGoal && state.forceOn && !state.done;
/**
 * What to tell the runner around the flag bay. `lowered` is true for a moment after the automatic lowering;
 * `settled` means the cart has not moved for a moment (it may still be coasting otherwise).
 */
export function arrivalHint(state: Arrival, held: boolean, settled: boolean, lowered = false): string {
  if (state.done) return '';
  if (lowered && !held) return '깃발 칸이야! 밀이가 자석을 내렸어. 수레가 멈추는지 봐.';
  if (held || !settled || state.atGoal || Math.abs(state.car - state.start) < .5) return '';
  return state.car < state.goal
    ? '깃발 칸까지 조금 모자라. 「자석 들기」를 누르고 수레를 조금 더 옮겨 봐.'
    : '깃발 칸을 지나쳤어. 「자석 들기」를 누르고 수레를 깃발 쪽으로 되돌려 봐.';
}
