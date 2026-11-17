import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyActivity, freshSave, type Activity, type Point, type Save } from '../src/domain';
import type { Context } from '../src/activity-types';
import { Surface } from '../src/mission-surface';
import { delivery, type DeliveryRun, type DeliveryState } from '../src/missions-remote';
import { deliveryCourse, missionReady } from '../src/mission-model';
import { missionView } from '../src/mission-play';
import { validTrial } from '../src/trial-records';
import { arrivalHint, benchPoint, checkpointFor, courseEnd, hintAfterFalls, pickupSticks, practiceItems, resumeSpot, runView, setRunBlocked, UNIT } from '../src/run-stage-rules';

// The 3D course is only an input device and a display. These tests feed it scripted
// magnet positions and check that the bench model writes the usual records.
class ElementStub extends EventTarget {
  style: Record<string, unknown> = { setProperty() {} };
  dataset: Record<string, string> = {};
  classList = { add() {}, remove() {}, toggle() {} };
  textContent = ''; className = ''; disabled = false; inert = false;
  elements = new Map<string, ElementStub>();
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; }
  querySelector(selector: string): ElementStub | null {
    for (const part of selector.split(',').map(s => s.trim())) { const el = this.elements.get(part); if (el) return el; }
    return null;
  }
  closest() { return null; }
  querySelectorAll() { return []; }
  setAttribute() {}
  append(el: ElementStub) { if (el.dataset.object) this.elements.set(`[data-object="${el.dataset.object}"]`, el); }
  click() { this.dispatchEvent(new Event('click')); }
}

let time = 0, rafId = 0, frames = new Map<number, FrameRequestCallback>(), cleanups: (() => void)[] = [];
beforeEach(() => {
  time = 0; rafId = 0; frames = new Map(); cleanups = []; setRunBlocked(false);
  vi.spyOn(performance, 'now').mockImplementation(() => time);
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false, fonts: { ready: Promise.resolve() }, querySelector: () => null, createElement: () => new ElementStub() }));
  vi.stubGlobal('window', Object.assign(new EventTarget(), { devicePixelRatio: 1 }));
  vi.stubGlobal('Image', class extends EventTarget { complete = false; naturalWidth = 0; src = ''; });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++rafId, fn); return rafId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanups.forEach(fn => fn()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function tick(seconds: number) {
  for (let i = 0; i < seconds * 25; i++) { time += 40; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); }
}

/** A runner that stands wherever the test puts it. */
function course(saved?: { a: Activity; s: Save }) {
  cleanups.forEach(fn => fn()); cleanups = [];
  const a = saved?.a || emptyActivity(), s = saved?.s || freshSave();
  s.activities[8] = a; s.settings.effects = false; s.settings.sound = false;
  const html = missionView(8, a, s).html; // A new attempt: puzzleRevision 2 and the 3D view.
  const root = new ElementStub(), board = new ElementStub(), canvas = new ElementStub();
  Object.assign(canvas, { getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) });
  root.elements.set('canvas', canvas); root.elements.set('.mission-board', board); root.elements.set('.mission-feedback', new ElementStub());
  for (const match of html.matchAll(/data-mission="([^"]+)"/g)) root.elements.set(`[data-mission="${match[1]}"]`, new ElementStub());
  const c: Context = { screen: 8, s, a, root: root as unknown as HTMLElement, touch: vi.fn(), meta: vi.fn(), refresh: vi.fn(), notify: vi.fn() };
  const shown: DeliveryState[] = [];
  const hand: { at: Point | null } = { at: null };
  const run: DeliveryRun = { walk: () => hand.at, show: state => { shown.push(state); } };
  const surface = new Surface(c, 8); delivery(surface, run); surface.draw(); cleanups.push(() => surface.cleanup());
  const car = () => Number(a.values.car ?? deliveryCourse.start);
  const click = (id: string) => { const el = root.querySelector(`[data-mission="${id}"]`); expect(el, id).not.toBeNull(); el!.click(); };
  return { a, s, c, html, hand, shown, car, click, state: () => shown[shown.length - 1] };
}
const proof = (a: Activity, key: string) => a.trials!.find(t => t.key === key && validTrial(t) && t.outcome === 'success');

describe('3D 달리기 · 기존 택배 판정에 연결', () => {
  it('새로 시작한 활동 8은 3D 화면으로 열리고 조종 자석 드래그 조각은 없다', () => {
    const m = course();
    expect(m.a.values.view).toBe('run');
    expect(m.html).toContain('data-run-stage');
    expect(m.html).not.toContain('data-drag="controller"');
    expect(m.html).toContain('data-mission="view-bench"');
    expect(m.state()).toMatchObject({ round: 0, car: 27, goal: 44, wall: false, pole: 'N', done: false });
  });
  it('수레 앞에서 다른 극을 대고 걸으면 수레가 따라오고, 깃발 칸에서 자석을 내리면 1구간 기록이 남는다', () => {
    const m = course();
    for (let i = 0; i < 200 && m.car() < 43; i++) { m.hand.at = benchPoint(m.car() + 8, 2.2, true); tick(.1); }
    expect(m.car()).toBeGreaterThan(41);
    expect(m.state()).toMatchObject({ forceOn: true, attract: true });
    expect(m.a.values.segment0).not.toBe(true);
    m.hand.at = benchPoint(m.a.points.controller.x, 2.2, false); tick(1.5);
    expect(m.a.values.segment0).toBe(true);
    expect(m.a.values.cartMethod0).toBe('pull');
    expect(Number(m.a.values.controlled0)).toBeGreaterThan(10);
    const delivered = proof(m.a, 'delivery0')!;
    expect(delivered.conditions).toMatchObject({ method: 'pull', manual: true, facing: 'N', cartFacing: 'S' });
    expect(delivered.objects.map(o => o.id).sort()).toEqual(['cart-magnet', 'controller']);
    expect(delivered.initialObjects.find(o => o.id === 'controller')).toBeTruthy();
    expect(delivered.input.length).toBeGreaterThan(2);
    expect(m.c.refresh).toHaveBeenCalled();
    // One stop is not the whole delivery in the extended course.
    expect(missionReady(8, m.a, m.s)).toBe(false);
  });
  it('2구간은 유리문 앞까지만 갈 수 있고, 뒤집어 뒤에서 밀어야 보관실 깃발 칸에 닿는다', () => {
    let m = course();
    for (let i = 0; i < 200 && m.car() < 43; i++) { m.hand.at = benchPoint(m.car() + 8, 2.2, true); tick(.1); }
    m.hand.at = benchPoint(m.a.points.controller.x, 2.2, false); tick(1.5); m = course(m); m.click('delivery-next');
    expect(m.a.values.round).toBe(1);
    m = course(m);
    expect(m.state()).toMatchObject({ round: 1, car: 44, goal: deliveryCourse.goal, wall: true });
    // Pulling: the hand stops at the closed door however far the runner tries to go.
    m.hand.at = benchPoint(70, 2.2, true); tick(2);
    expect(m.a.points.controller.x).toBeLessThanOrEqual(deliveryCourse.reach);
    expect(m.car()).toBeLessThan(deliveryCourse.wall);
    expect(m.a.values.puzzleMisses).toBe(1);
    m.click('flip');
    expect(m.state().pole).toBe('S');
    for (let i = 0; i < 300 && m.car() < deliveryCourse.goal - 1; i++) { m.hand.at = benchPoint(Math.min(m.car() - 8, deliveryCourse.reach), 2.2, true); tick(.1); }
    expect(m.car()).toBeGreaterThan(deliveryCourse.wall);
    m.hand.at = benchPoint(m.a.points.controller.x, 2.2, false); tick(1.5);
    expect(m.a.values.segment1).toBe(true);
    expect(proof(m.a, 'delivery1')!.conditions).toMatchObject({ method: 'push', course: 'glass-room', manual: true });
    expect(missionReady(8, m.a, m.s)).toBe(true);
  });
  it('방해꾼에게 부딪혀도, 자석을 내리고 걸어도 수레 위치와 기록은 바뀌지 않는다', () => {
    const m = course();
    m.hand.at = benchPoint(30, 2.2, false); tick(2);
    expect(m.a.points.controller).toEqual({ x: 30, y: 38 });
    expect(m.car()).toBe(27);
    expect(m.a.trials).toEqual([]);
    expect(m.state()).toMatchObject({ forceOn: false, held: false });
  });
});

describe('3D 달리기 · 좌표와 구간 규칙', () => {
  it('밀이의 자석 위치를 실험대 좌표로 옮긴다: 든 자석은 힘이 닿는 높이, 내린 자석은 닿지 않는 높이', () => {
    for (const lateral of [1.1, 2.2, 3.3]) expect(Math.abs(benchPoint(30, lateral, true).y - 59)).toBeLessThan(12);
    expect(benchPoint(30, 2.2, true).x).toBe(30);
    expect(Math.abs(benchPoint(30, 2.2, false).y - 59)).toBeGreaterThan(12);
    expect(UNIT).toBe(.5);
  });
  it('철 클립만 자석에 붙고, 멀리 있으면 철도 붙지 않는다', () => {
    const magnet = benchPoint(0, 2.2, true);
    expect(practiceItems.map(item => item.id)).toEqual(['clip', 'aluminum', 'plastic']);
    expect(pickupSticks('clip', magnet, { x: 3, y: magnet.y })).toBe(true);
    expect(pickupSticks('clip', magnet, { x: 40, y: magnet.y })).toBe(false);
    expect(pickupSticks('aluminum', magnet, { x: 1, y: magnet.y })).toBe(false);
    expect(pickupSticks('plastic', magnet, { x: 1, y: magnet.y })).toBe(false);
  });
  it('떨어지면 지나온 가장 가까운 지점으로 돌아오고, 같은 곳에서 세 번 막히면 도움말을 준다', () => {
    expect(checkpointFor(-25)).toBe(-30);
    expect(checkpointFor(-3)).toBe(-11);
    expect(checkpointFor(30)).toBe(20);
    expect(checkpointFor(46)).toBe(38);
    expect(hintAfterFalls(2)).toBe(false);
    expect(hintAfterFalls(3)).toBe(true);
  });
  it('이어 하기는 저장된 자석 위치에서, 2구간은 유리문 앞에서 시작한다', () => {
    const a = emptyActivity();
    expect(resumeSpot(a)).toBe(-30);
    a.points.controller = { x: 33, y: 50 };
    expect(resumeSpot(a)).toBe(33);
    a.values.round = 1; a.values.puzzleRevision = 2; a.values.puzzleVersion = 1; a.points.controller = { x: 55, y: 50 };
    expect(resumeSpot(a)).toBeLessThanOrEqual(deliveryCourse.reach);
    expect(courseEnd(true)).toBe(deliveryCourse.reach);
    expect(courseEnd(false)).toBeGreaterThan(deliveryCourse.reach);
  });
  it('진행 중이던 저장, 움직임 줄이기, 교사용 열기, 3D를 못 쓰는 기기는 기존 실험대로 연다', () => {
    const s = freshSave(), fresh = emptyActivity();
    missionView(8, fresh, s);
    expect(runView(fresh, s)).toBe(true);
    const saved = emptyActivity(); saved.values = { playVersion: 4, mechanicsVersion: 1, paceVersion: 1, puzzleVersion: 1, puzzleRevision: 2 };
    const html = missionView(8, saved, s).html;
    expect(runView(saved, s)).toBe(false);
    expect(html).toContain('data-drag="controller"');
    expect(html).toContain('data-mission="view-run"');
    const calm = freshSave(); calm.settings.motion = false;
    expect(runView(fresh, calm)).toBe(false);
    expect(missionView(8, fresh, calm).html).not.toContain('data-mission="view-run"');
    const teacher = emptyActivity(); missionView(8, teacher, s, true);
    expect(teacher.values.view).toBe('bench');
    setRunBlocked(true);
    expect(runView(fresh, s)).toBe(false);
    expect(missionView(8, fresh, s).html).toContain('data-drag="controller"');
  });
});

describe('깃발 칸 도착 안내', () => {
  const at = (car: number, extra: Partial<{ atGoal: boolean; done: boolean; forceOn: boolean }> = {}) =>
    ({ car, start: 27, goal: 44, atGoal: Math.abs(car - 44) < 3, done: false, forceOn: true, ...extra });
  it('수레가 깃발 칸에 있고 자석을 들고 있으면 내리라고 알려 준다', () => {
    expect(arrivalHint(at(43), true, false)).toContain('자석 내리기');
    expect(arrivalHint(at(43, { done: true }), true, true)).toBe('');
    expect(arrivalHint(at(38), true, true)).toBe('');
  });
  it('내린 뒤 칸 밖에 멈추면 모자란지 지나쳤는지 알려 준다', () => {
    expect(arrivalHint(at(39, { forceOn: false }), false, true)).toContain('모자라');
    expect(arrivalHint(at(49, { forceOn: false }), false, true)).toContain('지나쳤어');
    expect(arrivalHint(at(39, { forceOn: false }), false, false)).toBe('');
    expect(arrivalHint(at(27, { forceOn: false }), false, true)).toBe('');
  });
});

