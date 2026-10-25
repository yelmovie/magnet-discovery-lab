import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyActivity, freshSave, type Activity, type Point, type Save } from '../src/domain';
import { missionView } from '../src/mission-play';
import { missionReady } from '../src/mission-model';
import type { Context } from '../src/activity-types';

// Exercise the public manipulation events, including the animation clock, without
// depending on canvas pixels. Visual layout is checked in the actual browser.
class ElementStub extends EventTarget {
  style: Record<string, unknown> = { setProperty() {} };
  dataset: Record<string, string> = {};
  classList = { add() {}, remove() {}, toggle() {} };
  textContent = ''; className = ''; disabled = false; inert = false;
  elements = new Map<string, ElementStub>();
  board: ElementStub = this;
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; }
  querySelector(selector: string): ElementStub | null {
    for (const part of selector.split(',').map(s => s.trim())) {
      const element = this.elements.get(part); if (element) return element;
    }
    return null;
  }
  closest(selector: string) { return selector === '.play-board' ? this.board : null; }
  querySelectorAll(selector: string) { return selector.split(',').map(s=>this.elements.get(s.trim())).filter(Boolean) as ElementStub[]; }
  setAttribute() {}
  append(el: ElementStub) { if (el.dataset.object) this.elements.set(`[data-object="${el.dataset.object}"]`, el); }
  focus() {}
  setPointerCapture() {}
  hasPointerCapture() { return true; }
  releasePointerCapture() {}
  click() { this.dispatchEvent(new Event('click')); }
}

let time = 0, rafId = 0;
let frames = new Map<number, FrameRequestCallback>();
let cleanups: (() => void)[] = [];
const imageInstances=new Map<string,ImageStub>();
class ImageStub extends EventTarget {
  complete=false;naturalWidth=0;naturalHeight=0;private path='';
  set src(value:string){this.path=value;imageInstances.set(value,this);}
  get src(){return this.path;}
}

beforeEach(() => {
  time = 0; rafId = 0; frames = new Map(); cleanups = [];
  vi.spyOn(performance, 'now').mockImplementation(() => time);
  const doc = Object.assign(new EventTarget(), {
    hidden: false, fonts: { ready: Promise.resolve() }, querySelector: () => null,
    createElement: () => new ElementStub(),
  });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { devicePixelRatio: 1 }));
  vi.stubGlobal('Image',ImageStub);
  vi.stubGlobal('PointerEvent', class extends Event {
    button=0;isPrimary=true;pointerId=1;clientX=0;clientY=0;
    constructor(type:string,init:Record<string,unknown>={}){super(type);Object.assign(this,init);}
  });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++rafId, fn); return rafId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanups.forEach(fn => fn()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function tick(seconds: number) {
  for (let i = 0; i < seconds * 25; i++) {
    time += 40;
    const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time));
  }
}
function mount(n: number, values: Record<string, string | number | boolean> = {}, saved?:{a:Activity;s:Save}) {
  if(saved){cleanups.forEach(fn=>fn());cleanups=[];}
  const a = saved?.a||emptyActivity(), s = saved?.s||freshSave(); if(!saved)a.values = { playVersion: 4, ...values };
  s.activities[n] = a; s.settings.effects = false; s.settings.sound = false;
  const root = new ElementStub(), board = new ElementStub(), canvas = new ElementStub();
  board.board = board; root.board = board;
  const drawCalls=new Map<PropertyKey,ReturnType<typeof vi.fn>>();
  const draw = new Proxy({}, { get: (_, key) => {if(key==='createLinearGradient')return ()=>({addColorStop(){}});if(!drawCalls.has(key))drawCalls.set(key,vi.fn());return drawCalls.get(key);} });
  Object.assign(canvas, { getContext: () => draw });
  root.elements.set('canvas', canvas); root.elements.set('.mission-board', board);
  root.elements.set('.mission-feedback', new ElementStub());
  const view = missionView(n, a, s);
  for (const match of view.html.matchAll(/data-(drag|mission)="([^"]+)"/g)) {
    const el = new ElementStub(); el.board = board;
    el.getBoundingClientRect = () => ({left:0,top:0,width:48,height:48});
    root.elements.set(`[data-${match[1]}="${match[2]}"]`, el);
  }
  const originalAppend = board.append.bind(board);
  board.append = (el: ElementStub) => { originalAppend(el); if (el.dataset.object) root.elements.set(`[data-object="${el.dataset.object}"]`, el); };
  const c: Context = { screen: n, s, a, root: root as unknown as HTMLElement, touch: vi.fn(), meta: vi.fn(), refresh: vi.fn(), notify: vi.fn() };
  const cleanup = view.bind(c); if (cleanup) cleanups.push(cleanup);
  const place = (id: string, p: Point) => {
    const el = root.querySelector(`[data-drag="${id}"]`); expect(el, id).not.toBeNull();
    el!.dispatchEvent(Object.assign(new Event('piece-place'), { detail: p }));
  };
  const click = (id: string) => { const el = root.querySelector(`[data-mission="${id}"]`); expect(el, id).not.toBeNull(); el!.click(); };
  const key = (id:string,key:string) => root.querySelector(`[data-drag="${id}"]`)!.dispatchEvent(Object.assign(new Event('keydown'),{key,shiftKey:false}));
  const drag = (id:string,from:Point,to:Point) => {const el=root.querySelector(`[data-drag="${id}"]`)!;for(const [type,p] of [['pointerdown',from],['pointermove',to],['pointerup',to]] as const)el.dispatchEvent(new PointerEvent(type,{clientX:p.x*12.8,clientY:p.y*7.2,button:0,isPrimary:true,pointerId:1}));};
  const cancelDrag = (id:string,from:Point,to:Point) => {const el=root.querySelector(`[data-drag="${id}"]`)!;for(const [type,p] of [['pointerdown',from],['pointermove',to]] as const)el.dispatchEvent(new PointerEvent(type,{clientX:p.x*12.8,clientY:p.y*7.2,button:0,isPrimary:true,pointerId:1}));el.dispatchEvent(new Event('pointercancel'));};
  return { a, s, c, place, click, key, drag, cancelDrag, drawCalls };
}

describe('학생 조작으로 완성하는 탐구', () => {
  it.each([0,1])('두 대상에서 극을 번갈아 시험하면 안내·캔버스·기록을 즉시 갱신한다 (대상 %i)',round=>{
    const m=mount(5,{round});
    for(let i=0;i<4;i++){
      if(i)m.click('flip');
      const before={...(m.a.points['unknown-magnet']||{x:64,y:53})};
      if(i%3===0)m.drag('probe',i?{x:29,y:54}:{x:29,y:54},{x:48,y:53});
      else if(i%3===1)m.place('probe',{x:48,y:53});
      else{for(let j=0;j<4;j++)m.key('probe','ArrowRight');m.key('probe','Enter');}
      const facing=i%2?'N':'S',hidden=round===0?'S':'N',repel=facing===hidden;
      expect(m.a.values.reaction).toBe(repel?'밀려났어':'당겨졌어');
      expect(m.drawCalls.get('fillText')!.mock.calls.at(-1)?.[0]).toBe(m.a.values.reaction);
      const trial=m.a.trials!.find(t=>t.key===`pole${round}${facing}`)!;
      expect(trial.objects.find(o=>o.id==='unknown-magnet')).toMatchObject({x:repel?72:59,y:53,pole:hidden});
      expect(trial.initialObjects.find(o=>o.id==='unknown-magnet')).toMatchObject({...before,pole:hidden});
      expect(m.a.records.at(-1)?.result).not.toMatch(/repel|attract/);
    }
  });
  it('붙은 두 고리를 뒤집으면 시험 자리로 돌아오고 양쪽 면과 실제 이동을 기록한다',()=>{
    const m=mount(6);m.place('ring0',{x:68,y:71});m.place('ring1',{x:68,y:56});m.click('check');tick(1);
    expect(m.a.points.ring1.y).toBe(65);
    m.c.root.querySelector('[data-drag="ring1"]')!.dispatchEvent(new Event('dblclick'));
    expect(m.a.points.ring1.y).toBe(56);m.click('check');tick(1);
    expect(m.a.trials!.find(t=>t.key==='float2')?.objects[1]).toMatchObject({y:56,topPole:'S',bottomPole:'N'});
    expect(m.a.trials!.find(t=>t.key==='rings-failed0')?.objects[1].y).toBe(65);
  });
  it('수조 연결이 복구되면 이전 거리 실패 안내를 지운다',()=>{
    const m=mount(7);m.place('cleaner',{x:77,y:74});tick(.1);
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('너무 멀어');
    m.place('cleaner',{x:30,y:48});tick(.1);
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('다시 연결');
  });
  it('조종 자석의 세 입력을 안전 영역에 제한하고 복구 버튼은 실험 증거를 보존한다',()=>{
    const m=mount(8,{car:50});m.place('controller',{x:57,y:59});m.place('controller',{x:20,y:35});m.click('checkpoint');
    const trials=structuredClone(m.a.trials);m.place('controller',{x:-100,y:-100});expect(m.a.points.controller.y).toBeGreaterThan(36);
    m.drag('controller',m.a.points.controller,{x:99,y:99});expect(m.a.points.controller.y).toBeLessThan(77);
    for(let i=0;i<30;i++)m.key('controller','ArrowUp');m.key('controller','Enter');expect(m.a.points.controller.y).toBeGreaterThan(36);
    m.click('detach');m.click('safe');expect(m.a.values.checkpoint0).toBe(true);expect(m.a.trials).toEqual(trials);expect(m.a.values.car??50).toBe(50);
  });
  it('꺼낸 자석의 관찰과 철판 반응 관찰을 구분한다', () => {
    const m = mount(1);
    m.place('lid', { x: 50, y: 37 }); m.place('hidden-magnet', { x: 78, y: 52 });
    expect(m.a.values.found0).toBe(true); expect(m.a.values.latch0).not.toBe(true);
    m.place('hidden-magnet', { x: 68, y: 59 }); expect(m.a.values.latch0).toBe(true);
  });
  it('이미지 로딩 중 화면을 다시 열어도 현재 화면에 완성된 이미지가 그려진다',()=>{
    const existing=imageInstances.get('/assets/quest/prop-postal-box.webp');if(existing)existing.complete=false;
    const first=mount(1),image=imageInstances.get('/assets/quest/prop-postal-box.webp')!;
    const next=mount(1,{},first),oldDraws=first.drawCalls.get('clearRect')!.mock.calls.length,newDraws=next.drawCalls.get('clearRect')!.mock.calls.length;
    image.complete=true;image.naturalWidth=1024;image.naturalHeight=1024;image.dispatchEvent(new Event('load'));
    expect(first.drawCalls.get('clearRect')!.mock.calls).toHaveLength(oldDraws);
    expect(next.drawCalls.get('clearRect')!.mock.calls).toHaveLength(newDraws+1);
  });
  it('알루미늄은 관찰만으로 자동 분류되지 않고 잘못 넣으면 되돌아온다', () => {
    const m = mount(3);
    m.place('sweep-magnet', { x: 66, y: 43 });
    expect(m.a.values['tested-aluminum']).toBe(true); expect(m.a.values['sorted-aluminum']).not.toBe(true);
    m.place('material-2', { x: 86, y: 44 });
    expect(m.a.values['sorted-aluminum']).not.toBe(true); expect(m.a.points['material-2']).toEqual({ x: 66, y: 43 });
    m.place('material-2', { x: 86, y: 70 }); expect(m.a.values['sorted-aluminum']).toBe(true);
  });
  it('오답 후 돌아온 재료에서 방향키를 누르면 현재 선반 위치부터 연속 이동한다',()=>{
    const m=mount(3);m.place('sweep-magnet',{x:66,y:43});m.place('material-2',{x:86,y:44});
    m.key('material-2','ArrowRight');expect(m.a.points['material-2']).toEqual({x:70,y:43});
    m.key('material-2','ArrowRight');expect(m.a.points['material-2']).toEqual({x:74,y:43});
  });
  it('오답 후 재료를 다시 집으면 옛 분류함으로 튀지 않고 현재 위치를 따라온다',()=>{
    const m=mount(3);m.place('sweep-magnet',{x:66,y:43});m.place('material-2',{x:86,y:44});
    m.drag('material-2',{x:66,y:43},{x:70,y:45});
    expect(m.a.points['material-2'].x).toBeCloseTo(70);expect(m.a.points['material-2'].y).toBeCloseTo(45);
  });
  it('철 부품은 손으로 분류함에 옮기는 것과 자석으로 운반하는 것을 구분한다', () => {
    const m = mount(3);
    m.place('sweep-magnet', { x: 36, y: 42 }); m.place('material-0', { x: 86, y: 44 });
    expect(m.a.values['delivered-clip']).not.toBe(true);
    m.place('sweep-magnet', { x: 36, y: 42 }); m.place('sweep-magnet', { x: 86, y: 38 });
    expect(m.a.values['delivered-clip']).toBe(true); expect(m.a.values['sorted-clip']).toBe(true);
  });
  it('이미 분류된 재료는 눌러서 이동이나 방향키로 다시 움직이지 않는다',()=>{
    const m=mount(3);m.place('sweep-magnet',{x:66,y:43});m.place('material-2',{x:86,y:70});
    const sorted={...m.a.points['material-2']};m.key('material-2','ArrowLeft');m.place('material-2',{x:36,y:65});
    expect(m.a.points['material-2']).toEqual(sorted);
  });
  it('닫힌 덮개가 저장된 기존 시도를 다시 열면 바로 흔들기 시험을 이어간다',()=>{
    const first=mount(2);first.place('repair-magnet',{x:43,y:59});first.place('lid',{x:50,y:65});
    delete first.a.values.repairClosed;
    const resumed=mount(2,{},first);resumed.click('shake');expect(resumed.a.values.with0).toBe(true);expect(resumed.a.points.lid).toEqual({x:50,y:65});
    resumed.place('repair-magnet',{x:24,y:61});expect(resumed.a.values.repairClosed).toBe(false);expect(resumed.a.points.lid).toEqual({x:50,y:38});
  });
  it('고장 증거를 확인하기 전에는 진단이나 철판 수리로 건너뛸 수 없다', () => {
    const m = mount(2, { round: 2 });
    m.click('fault-distance'); expect(m.a.values.diagnosis2).not.toBe(true);
    m.place('repair-plate', { x: 59, y: 59 }); expect(m.a.points['repair-plate']).toEqual({ x: 75, y: 47 });
    m.place('repair-magnet', { x: 43, y: 59 }); m.place('lid', { x: 50, y: 65 }); m.click('shake');
    expect(m.a.values.faultObserved2).toBe(true);
    m.click('fault-distance'); expect(m.a.values.diagnosis2).toBe(true);
  });
  it('수조 얼룩은 손잡이를 올려두고 기다려도 지워지지 않으며 왕복해야 지워진다', () => {
    const m = mount(7); m.place('cleaner', { x: 40, y: 44 }); tick(12);
    expect(m.a.values.clean0).not.toBe(true);
    for (const x of [34, 46, 34, 46, 34]) { m.place('cleaner', { x, y: 44 }); tick(1.3); }
    expect(m.a.values.clean0).toBe(true); expect(Number(m.a.values.scrubTurns0)).toBeGreaterThanOrEqual(2);
  });
  it('수조 밖으로 끌다 조작이 취소돼도 실제 제한된 손잡이 위치를 저장한다',()=>{
    const m=mount(7);m.cancelDrag('cleaner',{x:27,y:47},{x:2,y:2});
    expect(m.a.points.cleaner).toEqual({x:26,y:35});
  });
  it('배달 점검은 점검소에 도착하고 조종 자석을 멀리 해야 기록된다', () => {
    const m = mount(8, { car: 50 });
    m.place('controller', { x: 57, y: 59 }); m.click('checkpoint'); expect(m.a.values.checkpoint0).not.toBe(true);
    m.place('controller', { x: 20, y: 35 }); m.click('checkpoint'); expect(m.a.values.checkpoint0).toBe(true);
  });
  it('발명품은 현재 설계의 반응을 시험하고 변경하면 이전 시험과 구분한다', () => {
    const m = mount(9, { chosen: true });
    m.place('base', { x: 50, y: 61 }); m.place('design-magnet', { x: 44, y: 53 }); m.place('design-target', { x: 57, y: 53 });
    m.click('prototype'); const testedRevision = m.a.trials?.find(t => t.key === 'prototype')?.designRevision;
    expect(testedRevision).toBe(m.s.design.revision); expect(m.a.trials?.find(t => t.key === 'prototype')?.outcome).toBe('success');
    m.click('flip'); expect(testedRevision).not.toBe(m.s.design.revision);
  });
  it('발명품 손잡이를 조작한 뒤 새로고침해도 사용 시험을 이어간다',()=>{
    const first=mount(10);first.place('use-handle',{x:50,y:65});
    const resumed=mount(10,{},first);resumed.click('test');expect(resumed.a.values.use0).toBe(true);
    const revised=mount(10,{},resumed);revised.place('design-magnet',{x:44,y:55});
    expect(revised.a.values.use0).toBeUndefined();expect(revised.a.points['use-handle']).toEqual({x:50,y:37});
  });
  it('원격 발명품이 목적지에 도착한 저장에서도 사용 시험을 이어간다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4};s.design.template='remote';
    const first=mount(10,{}, {a,s});first.place('use-handle',{x:43,y:42});
    const resumed=mount(10,{},first);resumed.click('test');expect(resumed.a.values.use0).toBe(true);
  });
  it('새 실험에만 새 조작 규칙을 켜고 이미 진행 중인 v4 라운드는 보존한다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4,round:1,found0:true};
    missionView(1,a,s);expect(a.values.mechanicsVersion).toBeUndefined();expect(a.values.round).toBe(1);expect(a.values.found0).toBe(true);
    const fresh=emptyActivity();missionView(1,fresh,s);expect(fresh.values.mechanicsVersion).toBe(1);
  });
  it('가까운 실험에서 직접 고른 위치를 종이 비교에도 보존해 끝까지 완료된다',()=>{
    const far=mount(4,{round:0,mechanicsVersion:1});far.click('release');far.a.values.round=1;
    const near=mount(4,{},far);near.place('distance-magnet',{x:52,y:55});near.click('release');
    const next=mount(4,{},near);next.click('next');expect(next.a.points['distance-magnet']).toEqual({x:52,y:55});
    const paper=mount(4,{},next);paper.place('paper',{x:57,y:55});paper.click('release');
    expect(paper.a.trials?.find(t=>t.key==='paper')?.initialObjects).toEqual(paper.a.trials?.find(t=>t.key==='near')?.initialObjects);
    paper.a.values.round=3;const rescue=mount(4,{},paper);rescue.place('distance-magnet',{x:57,y:42});rescue.click('release');
    expect(missionReady(4,rescue.a,rescue.s)).toBe(true);
  });
});
