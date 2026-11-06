import { mailbox } from '../src/mailbox';
import { mailboxParts, partKey, partInstalled } from '../src/mailbox-assembly';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyActivity, freshSave, validSave, type Activity, type Point, type Save } from '../src/domain';
import { missionView } from '../src/mission-play';
import { missionReady } from '../src/mission-model';
import type { Context } from '../src/activity-types';
import { bindPlacement } from '../src/manipulation';
import { glassStains } from '../src/aquarium-glass';

// Exercise the public manipulation events, including the animation clock, without
// depending on canvas pixels. Visual layout is checked in the actual browser.
class ElementStub extends EventTarget {
  style: Record<string, unknown> = { setProperty() {} };
  dataset: Record<string, string> = {};
  classList = { add() {}, remove() {}, toggle() {} };
  textContent = ''; className = ''; disabled = false; inert = false;
  elements = new Map<string, ElementStub>();
  board: ElementStub = this;
  captured = new Set<number>();
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
  setPointerCapture(id:number) { this.captured.add(id); }
  hasPointerCapture(id:number) { return this.captured.has(id); }
  releasePointerCapture(id:number) { this.captured.delete(id);this.dispatchEvent(new Event('lostpointercapture')); }
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
const assembledValues=()=>({assemblyVersion:1,...Object.fromEntries(mailboxParts.map(part=>[partKey(part),true]))});

describe('분리된 부품부터 조립하는 우편함',()=>{
  it('처음에는 여섯 부품만 조작할 수 있고 기다려도 조립이나 관찰이 완료되지 않는다',()=>{
    const m=mount(1,{paceVersion:1,mechanicsVersion:1});
    expect(m.c.root.querySelector('[data-drag="lid"]')).toBeNull();
    for(const part of mailboxParts){
      expect(m.c.root.querySelector(`[data-drag="${partKey(part)}"]`)).not.toBeNull();
      expect(m.a.points[partKey(part)]).toEqual(part.start);
      expect(partInstalled(m.a,part)).toBe(false);
    }
    tick(5);
    expect(m.a.values.found0).not.toBe(true);
    expect(m.a.values.latch0).not.toBe(true);
    expect(m.a.trials||[]).toHaveLength(0);
    expect(missionReady(1,m.a,m.s)).toBe(false);
  });
  it('순서가 다른 부품이나 점선에서 먼 부품은 원래 자리로 돌아온다',()=>{
    const m=mount(1,{paceVersion:1,mechanicsVersion:1});
    const body=mailboxParts[0],magnet=mailboxParts[5];
    m.place(partKey(magnet),magnet.target);tick(.5);
    expect(m.a.points[partKey(magnet)]).toEqual(magnet.start);
    expect(partInstalled(m.a,magnet)).toBe(false);
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('먼저 우편함 몸체');
    m.place(partKey(body),{x:12,y:40});tick(.5);
    expect(m.a.points[partKey(body)]).toEqual(body.start);
    expect(partInstalled(m.a,body)).toBe(false);
    expect(m.a.trials||[]).toHaveLength(0);
  });
  it('중간 저장에서 조립을 이어가고 마지막 부품 뒤에도 직접 닫아야 완료된다',()=>{
    let m=mount(1,{paceVersion:1,mechanicsVersion:1});
    for(const [index,part] of mailboxParts.entries()){
      if(index===1)m.click('fit-part');
      else m.place(partKey(part),part.target);
      tick(.5);
      expect(partInstalled(m.a,part)).toBe(true);
      expect(m.a.points[partKey(part)]).toEqual(part.target);
      expect(m.a.values.latch0).not.toBe(true);
      expect(missionReady(1,m.a,m.s)).toBe(false);
      if(index===2){
        const saved:Save=JSON.parse(JSON.stringify(m.s));
        m=mount(1,{}, {a:saved.activities[1],s:saved});
        expect(mailboxParts.filter(part=>partInstalled(m.a,part))).toHaveLength(3);
        expect(m.a.values.found0).not.toBe(true);
      }else m=mount(1,{},m);
    }
    expect(m.a.values.found0).toBe(true);
    expect(m.a.trials?.map(t=>t.key)).toEqual(['inspect0']);
    expect(m.a.points.lid).toEqual(mailbox.handleOpen);
    expect(m.c.root.querySelector('[data-drag="assembly-magnet"]')).toBeNull();
    expect(m.c.root.querySelector('[data-drag="lid"]')).not.toBeNull();
    delete m.a.values.mechanicsVersion; // Older saved attempts must also require a real close.
    expect(missionReady(1,m.a,m.s)).toBe(false);
    m.place('lid',mailbox.handleClosed);tick(1);
    expect(m.a.values.latch0,'예상을 고르기 전에는 닫히지 않는다').not.toBe(true);
    m.a.values.predict='stick';mount(1,{},{a:m.a,s:m.s}).place('lid',mailbox.handleClosed);tick(1);
    expect(m.a.values.latch0).toBe(true);
    expect(missionReady(1,m.a,m.s)).toBe(true);
    const saved:Save=JSON.parse(JSON.stringify(m.s));
    m=mount(1,{}, {a:saved.activities[1],s:saved});
    expect(m.a.points.lid).toEqual(mailbox.handleClosed);
    expect(missionReady(1,m.a,m.s)).toBe(true);
  });
  it('기존에 닫기까지 마친 우편함은 업데이트 후 다시 해체하지 않는다',()=>{
    const m=mount(1,{paceVersion:1,mechanicsVersion:1,found0:true,latch0:true});
    expect(mailboxParts.every(part=>partInstalled(m.a,part))).toBe(true);
    expect(m.c.root.querySelector('[data-drag="assembly-body"]')).toBeNull();
    expect(m.a.points.lid).toEqual(mailbox.handleClosed);
    expect(m.a.values.latch0).toBe(true);
  });
});

describe('학생 조작으로 완성하는 탐구', () => {
  it('손잡이를 직접 끝까지 올리기 전에는 관찰 기록이 생기지 않는다',()=>{
    const m=mount(1,{...assembledValues(),paceVersion:1,mechanicsVersion:1});
    tick(3);m.place('lid',{x:44,y:56});tick(3);
    expect(m.a.trials||[]).toHaveLength(0);
    m.place('lid',{x:44,y:38});expect(m.a.trials?.map(t=>t.key)).toEqual(['inspect0']);
    tick(3);expect(m.a.values.latch0).toBeUndefined();
  });
  it.each([0,1])('두 대상에서 극을 번갈아 시험하면 안내·캔버스·기록을 즉시 갱신한다 (대상 %i)',round=>{
    const m=mount(5,{round});
    for(let i=0;i<4;i++){
      if(i){m.click('flip');tick(1);}
      const before={...m.a.points['unknown-magnet']};
      if(i%3===0)m.drag('probe',i?{x:29,y:54}:{x:29,y:54},{x:48,y:53});
      else if(i%3===1)m.place('probe',{x:48,y:53});
      else{for(let j=0;j<4;j++)m.key('probe','ArrowRight');m.key('probe','Enter');}
      tick(1);
      const facing=i%2?'N':'S',hidden=round===0?'S':'N',repel=facing===hidden;
      expect(m.a.values.reaction).toBe(repel?'밀려났어':'당겨졌어');
      expect(m.drawCalls.get('fillText')!.mock.calls.at(-1)?.[0]).toBe(m.a.values.reaction);
      const trial=m.a.trials!.find(t=>t.key===`pole${round}${facing}`)!;
      expect(trial.objects.find(o=>o.id==='unknown-magnet')).toMatchObject({x:repel?77:48+(192+211-2)/25.6,y:53,pole:hidden});
      expect(trial.initialObjects.find(o=>o.id==='unknown-magnet')).toMatchObject({...before,pole:hidden});
      expect(m.a.records.at(-1)?.result).not.toMatch(/repel|attract/);
    }
  });
  it('붙은 두 고리를 뒤집으면 시험 자리로 돌아오고 양쪽 면과 실제 이동을 기록한다',()=>{
    const m=mount(6);m.place('ring0',{x:68,y:71});m.place('ring1',{x:68,y:56});m.click('check');tick(1);
    expect(m.a.points.ring1.y).toBeCloseTo(71-17/7.2);
    m.c.root.querySelector('[data-drag="ring1"]')!.dispatchEvent(new Event('dblclick'));
    expect(m.a.points.ring1.y).toBe(56);m.click('check');tick(1);
    expect(m.a.trials!.find(t=>t.key==='float2')?.objects[1]).toMatchObject({y:53,topPole:'S',bottomPole:'N'});
    expect(m.a.trials!.find(t=>t.key==='rings-failed0')?.objects[1].y).toBeCloseTo(71-17/7.2);
  });
  it('수조 연결이 복구되면 이전 거리 실패 안내를 지운다',()=>{
    const m=mount(7);m.place('cleaner',{x:77,y:74});tick(.1);
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('너무 멀어');
    m.place('cleaner',{x:30,y:48});tick(.1);
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('다시 연결');
  });
  it('물속 패드가 닦은 자국은 저장되고 떨어진 손잡이만 움직이면 번지지 않는다',()=>{
    const m=mount(7,{paceVersion:1,mechanicsVersion:1});
    m.place('cleaner',{x:glassStains[0].x-4,y:glassStains[0].y});tick(1);
    const wipe=[...m.a.mask];
    expect(wipe.length).toBeGreaterThan(0);expect(m.a.values.clean0).not.toBe(true);
    m.place('cleaner',{x:66,y:44});tick(2);
    expect(m.a.values.padDetached).toBe(true);expect(m.a.mask).toEqual(wipe);
    const resume=mount(7,{},m);
    resume.place('cleaner',{x:59,y:65});tick(1);
    expect(resume.a.mask).toEqual(wipe);
    expect(resume.a.values.scrubDistance1).toBeUndefined();
    expect(resume.a.values.scrubDistance2).toBeUndefined();
  });
  it('조종 자석의 세 입력을 안전 영역에 제한하고 자석 떼기는 기존 기록을 보존한다',()=>{
    const m=mount(8,{car:50});m.a.records.push({key:'before',label:'지난 관찰',result:'관찰 기록'});
    const records=structuredClone(m.a.records);m.place('controller',{x:-100,y:-100});expect(m.a.points.controller.y).toBeGreaterThan(36);
    m.drag('controller',m.a.points.controller,{x:99,y:99});expect(m.a.points.controller.y).toBeLessThan(77);
    for(let i=0;i<30;i++)m.key('controller','ArrowUp');m.key('controller','Enter');expect(m.a.points.controller.y).toBeGreaterThan(36);
    m.click('detach');expect(m.a.records).toEqual(records);expect(m.a.values.car??50).toBe(50);
  });
  it('덮개를 열면 고정된 자석을 관찰하고 다시 닫아야 철판에 붙는다', () => {
    const m = mount(1,assembledValues());
    m.place('lid', { x: 50, y: 37 });
    expect(m.a.values.found0).toBe(true); expect(m.a.values.latch0).not.toBe(true);
    m.a.values.predict='stick';mount(1,{},{a:m.a,s:m.s}).place('lid', { x: 44, y: 59 }); tick(1); expect(m.a.values.latch0).toBe(true);
  });
  it('이미지 로딩 중 화면을 다시 열어도 현재 화면에 완성된 이미지가 그려진다',()=>{
    const existing=imageInstances.get('/assets/quest/mailbox-wood.webp');if(existing)existing.complete=false;
    const first=mount(1),image=imageInstances.get('/assets/quest/mailbox-wood.webp')!;
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
    m.place('sweep-magnet',{x:36,y:42});m.place('material-0',{x:86,y:44});
    expect(m.a.values['sorted-clip']).toBe(true);
    expect(m.a.values['delivered-clip']).not.toBe(true);
    expect(m.a.trials?.find(t=>t.key==='sort-clip')?.conditions.byMagnet).toBe(false);
    cleanups.splice(0).forEach(dispose=>dispose());
    const carried=mount(3);
    carried.place('sweep-magnet',{x:36,y:42});carried.place('sweep-magnet',{x:86,y:38});
    expect(carried.a.values['delivered-clip']).toBe(true);
  });
  it('이미 분류된 재료는 눌러서 이동이나 방향키로 다시 움직이지 않는다',()=>{
    const m=mount(3);m.place('sweep-magnet',{x:66,y:43});m.place('material-2',{x:86,y:70});
    const sorted={...m.a.points['material-2']};m.key('material-2','ArrowLeft');m.place('material-2',{x:36,y:65});
    expect(m.a.points['material-2']).toEqual(sorted);
  });
  it('닫힌 덮개가 저장된 기존 시도를 다시 열면 바로 흔들기 시험을 이어간다',()=>{
    const first=mount(2);first.place('repair-magnet',mailbox.socket);first.place('lid',{x:50,y:65});
    delete first.a.values.repairClosed;delete first.a.values.mailboxLayout;first.a.points['repair-magnet']={x:43,y:59};
    const resumed=mount(2,{},first);resumed.click('shake');tick(1);expect(resumed.a.values.with0).toBe(true);expect(resumed.a.points.lid).toEqual(mailbox.handleClosed);
    resumed.place('lid',{x:50,y:38});resumed.place('repair-magnet',{x:24,y:61});expect(resumed.a.values.repairClosed).toBe(false);expect(resumed.a.points.lid).toEqual(mailbox.handleOpen);
  });
  it('이전 오른쪽 홈에 끼워 둔 자석은 이어하기에서 가운데 홈에 장착된 채로 남는다',()=>{
    const previous=mount(2);
    previous.a.values.mailboxLayout=1;
    previous.a.values.without0=true;
    previous.a.values.repairClosed=true;
    previous.a.points['repair-magnet']={x:56,y:41};
    const resumed=mount(2,{},previous);
    expect(resumed.a.points['repair-magnet']).toEqual(mailbox.socket);
    resumed.click('shake');tick(1);
    expect(resumed.a.values.with0).toBe(true);
    expect(resumed.a.values.without0).toBe(true);
  });
  it('조사할 때 고정된 자석은 집을 수 없고 비교용 자석은 수리할 때만 뺄 수 있다',()=>{
    const inspection=mount(1,assembledValues());
    expect(inspection.c.root.querySelector('[data-drag="hidden-magnet"]')).toBeNull();
    inspection.place('lid',{x:44,y:60});expect(inspection.a.values.found0).not.toBe(true);
    inspection.place('lid',{x:44,y:38});expect(inspection.a.points['fixed-magnet']).toEqual(mailbox.socket);
    const repair=mount(2),magnet=repair.c.root.querySelector<HTMLButtonElement>('[data-drag="repair-magnet"]')!;
    repair.place('lid',{x:50,y:65});expect(magnet.disabled).toBe(false);
    repair.place('repair-magnet',mailbox.socket);expect(repair.a.points['repair-magnet']).toEqual(mailbox.looseMagnet);
    repair.place('lid',{x:44,y:38});repair.place('repair-magnet',mailbox.socket);repair.place('lid',{x:50,y:65});expect(magnet.disabled).toBe(true);
    repair.place('repair-magnet',{x:24,y:61});expect(repair.a.points['repair-magnet']).toEqual(mailbox.socket);
    repair.place('lid',{x:50,y:38});expect(magnet.disabled).toBe(false);repair.place('repair-magnet',{x:24,y:61});expect(repair.a.points['repair-magnet']).toEqual(mailbox.looseMagnet);
  });
  it('고장 증거를 확인하기 전에는 진단이나 철판 수리로 건너뛸 수 없다', () => {
    const m = mount(2, { round: 2 });
    m.click('fault-distance'); expect(m.a.values.diagnosis2).not.toBe(true);
    m.place('repair-plate', mailbox.plate); expect(m.a.points['repair-plate']).toEqual({ x: 75, y: 47 });
    m.place('repair-magnet', mailbox.socket); m.place('lid', { x: 50, y: 65 }); m.click('shake');tick(1);
    expect(m.a.values.faultObserved2).toBe(true);
    m.click('fault-distance'); expect(m.a.values.diagnosis2).toBe(true);
  });
  it('수조 얼룩은 손잡이를 올려두고 기다려도 지워지지 않으며 왕복해야 지워진다', () => {
    const m = mount(7),center=glassStains[0]; m.place('cleaner', center); tick(12);
    expect(m.a.values.clean0).not.toBe(true);
    for (const dx of [-6,6,-6,6,-6]) { m.place('cleaner', { x:center.x+dx, y:center.y }); tick(1.3); }
    expect(m.a.values.clean0).toBe(true); expect(Number(m.a.values.scrubTurns0)).toBeGreaterThanOrEqual(2);
  });
  it('수조 밖으로 끌다 조작이 취소돼도 실제 제한된 손잡이 위치를 저장한다',()=>{
    const m=mount(7);m.cancelDrag('cleaner',{x:27,y:47},{x:2,y:2});
    expect(m.a.points.cleaner).toEqual({x:26,y:35});
  });
  it.each(['resize','blur','visibilitychange','pointercancel','lostpointercapture'])('%s로 드래그가 끊겨도 포인터를 풀고 임의로 관찰 완료하지 않는다',type=>{
    const m=mount(5),el=m.c.root.querySelector('[data-drag="probe"]') as unknown as ElementStub;
    el.dispatchEvent(new PointerEvent('pointerdown',{clientX:29*12.8,clientY:54*7.2,pointerId:7,isPrimary:true,button:0}));
    el.dispatchEvent(new PointerEvent('pointermove',{clientX:48*12.8,clientY:53*7.2,pointerId:7,isPrimary:true,button:0}));
    expect(el.hasPointerCapture(7)).toBe(true);
    (type==='visibilitychange'?document:type.startsWith('pointer')||type==='lostpointercapture'?el:window).dispatchEvent(new Event(type));
    expect(el.hasPointerCapture(7)).toBe(false);expect(m.a.points.probe).toEqual({x:48,y:53});expect(m.a.values.test0S).not.toBe(true);
    el.dispatchEvent(new PointerEvent('pointerup',{pointerId:7,isPrimary:true,button:0}));expect(m.a.values.test0S).not.toBe(true);
    m.drag('probe',{x:48,y:53},{x:47,y:53});tick(1);expect(m.a.values.test0S).toBe(true);
  });
  it.each(['resize','blur','visibilitychange','pointercancel','lostpointercapture'])('%s 뒤 이전 손가락을 떼어도 선택한 물체가 엉뚱한 곳으로 배치되지 않는다',type=>{
    const root=new ElementStub(),piece=new ElementStub(),board=new ElementStub();let selecting=true,placed=0;
    root.closest=selector=>selector==='[data-drag]'&&selecting?piece:selector==='.play-board'?board:null;
    Object.assign(piece,{getAttribute:()=> '시험 물체. 이동'});piece.addEventListener('piece-place',()=>placed++);
    cleanups.push(bindPlacement(root as unknown as HTMLElement));root.dispatchEvent(new Event('piece-select'));selecting=false;
    const down=()=>root.dispatchEvent(new PointerEvent('pointerdown',{clientX:640,clientY:360,pointerId:7,isPrimary:true,button:0}));
    const up=()=>root.dispatchEvent(new PointerEvent('pointerup',{clientX:640,clientY:360,pointerId:7,isPrimary:true,button:0}));
    down();(type==='visibilitychange'?document:type.startsWith('pointer')||type==='lostpointercapture'?root:window).dispatchEvent(new Event(type));up();expect(placed).toBe(0);
    down();up();expect(placed).toBe(1);
  });
  it('배달에는 추가 점검이나 스티커가 없고 실제 운반 없이 완료되지 않는다', () => {
    const m = mount(8, { car: 73,mechanicsVersion:1 });
    for(const id of ['checkpoint','next','tool','safe'])expect(m.c.root.querySelector(`[data-mission="${id}"]`)).toBeNull();
    m.place('controller', { x: 20, y: 35 });tick(1);
    expect(m.a.values.segment0).not.toBe(true);expect(missionReady(8,m.a,m.s)).toBe(false);
  });
  it('발명품은 현재 설계의 반응을 시험하고 변경하면 이전 시험과 구분한다', () => {
    const m = mount(9, { chosen: true });
    m.place('base', { x: 50, y: 61 }); m.place('design-magnet', { x: 44, y: 53 }); m.place('design-target', { x: 57, y: 53 });
    m.click('prototype'); const testedRevision = m.a.trials?.find(t => t.key === 'prototype')?.designRevision;
    expect(testedRevision).toBe(m.s.design.revision); expect(m.a.trials?.find(t => t.key === 'prototype')?.outcome).toBe('success');
    m.click('flip'); expect(testedRevision).not.toBe(m.s.design.revision);
  });
  it('설계 부품이 겹친 배치는 시제품 시험과 사용 시험 모두 실패한다',()=>{
    const m=mount(9,{chosen:true});m.place('base',{x:50,y:61});
    m.place('design-magnet',{x:48,y:55});m.place('design-target',{x:53,y:55});m.click('prototype');
    expect(m.a.trials?.find(t=>t.key==='prototype')?.outcome).toBe('failure');
    const use=mount(10,{},m);use.click('test');
    expect(use.a.trials?.some(t=>t.key==='use0'&&t.outcome==='success')).toBe(false);
  });
  it('발명품 손잡이를 조작한 뒤 새로고침해도 사용 시험을 이어간다',()=>{
    const first=mount(10);first.place('use-handle',{x:50,y:65});
    const resumed=mount(10,{},first);resumed.click('test');expect(resumed.a.values.use0).toBe(true);
    resumed.click('adjust');const revised=mount(10,{},resumed);revised.place('design-magnet',{x:44,y:55});
    expect(revised.a.values.use0).toBeUndefined();expect(revised.a.points['use-handle']).toEqual(mailbox.handleOpen);
  });
  it('원격 발명품이 목적지에 도착한 저장에서도 사용 시험을 이어간다',()=>{
    const a=emptyActivity(),s=freshSave();a.values={playVersion:4};s.design.template='remote';
    const first=mount(10,{}, {a,s});first.click('test');expect(a.values.use0).not.toBe(true);
    first.place('use-handle',{x:65,y:42});expect(a.points['use-handle']).toEqual({x:43,y:42});expect(a.points['operating-target']).toEqual({x:57,y:42});
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
    expect(far.a.trials?.find(t=>t.key==='far')?.conditions.clearanceCells).toBe(5);
    expect(near.a.trials?.find(t=>t.key==='near')?.conditions.clearanceCells).toBe(.5);
    const next=mount(4,{},near);next.click('next');expect(next.a.points['distance-magnet']).toEqual({x:52,y:55});
    const paper=mount(4,{},next);paper.place('paper',{x:57,y:55});paper.click('release');
    expect(paper.a.trials?.find(t=>t.key==='paper')?.initialObjects).toEqual(paper.a.trials?.find(t=>t.key==='near')?.initialObjects);
    const paperTrial=paper.a.trials!.find(t=>t.key==='paper')!;
    expect(paperTrial.conditions.clearanceCells).toBe(.5);
    const finalClip=paperTrial.objects.find(o=>o.id==='clip')!;
    expect(finalClip.x).toBeGreaterThan(paper.a.points.paper.x);
    expect(finalClip.x).toBeLessThan(61);
    paper.a.values.round=3;const rescue=mount(4,{},paper);rescue.place('distance-magnet',{x:57,y:42});rescue.click('release');
    expect(missionReady(4,rescue.a,rescue.s)).toBe(true);
  });
});


describe('반복을 줄인 새 탐구 흐름', () => {
  const short = (n:number) => mount(n,{paceVersion:1,mechanicsVersion:1});
  const reopen = (n:number,m:ReturnType<typeof mount>) => mount(n,{},m);
  it('고정된 부품을 관찰한 뒤 덮개를 닫으면 이어하기에서도 탐색이 끝난다',()=>{
    let m=mount(1,{...assembledValues(),paceVersion:1,mechanicsVersion:1});
    expect(missionReady(1,m.a,m.s)).toBe(false);
    m.place('lid',mailbox.handleClosed);tick(1);
    expect(m.a.values.found0).not.toBe(true);
    m.place('lid',{x:50,y:37});
    expect(missionReady(1,m.a,m.s)).toBe(false);
    expect(missionView(1,m.a,m.s).html).toContain('data-inspection-step="1"');
    m.a.values.predict='stick';m=reopen(1,m);m.place('lid',{x:44,y:59});tick(1);
    expect(missionReady(1,m.a,m.s)).toBe(true);
    expect(missionView(1,m.a,m.s).html).toContain('data-inspection-step="2"');
    expect(missionView(1,m.a,m.s).html).not.toContain('책 보관함도 살펴보기');
    expect(m.a.values.found1).toBeUndefined();
  });
  it('자석 없는 경우와 있는 경우를 한 번씩 비교하고 수리를 끝낸다',()=>{
    let m=short(2);m.place('lid',{x:50,y:65});m.click('shake');tick(1);
    expect(missionReady(2,m.a,m.s)).toBe(false);
    m.place('repair-magnet',mailbox.socket);m.place('lid',{x:50,y:65});m.click('shake');tick(1);
    expect(missionReady(2,m.a,m.s)).toBe(true);
    expect(missionView(2,m.a,m.s).html).not.toContain('책 보관함도 고쳐');
  });
  it('처음부터 보이는 여섯 물건을 모두 검사하고 세 개씩 분류해야 진행된다',()=>{
    const m=short(3);
    for(const i of [0,1,2,3,4,6])expect(m.c.root.querySelector(`[data-drag="material-${i}"]`)).not.toBeNull();
    expect(m.c.root.querySelector('[data-drag="material-5"]')).toBeNull();
    for(const x of [36,52]){
      m.place('sweep-magnet',{x,y:42});m.place('sweep-magnet',{x:86,y:38});
    }
    for(const [i,x,y] of [[2,66,43],[3,36,65],[4,52,65]]){
      m.place('sweep-magnet',{x,y});m.place(`material-${i}`,{x:86,y:70});
    }
    expect(missionReady(3,m.a,m.s)).toBe(false);
    m.place('sweep-magnet',{x:66,y:65});m.place('sweep-magnet',{x:86,y:38});
    expect(missionReady(3,m.a,m.s)).toBe(true);
    expect(m.a.trials?.find(t=>t.key==='sort-nut')?.conditions).toMatchObject({material:'nut',magnetic:true,byMagnet:true});
    expect(new Set([0,1,6].map(i=>m.a.points[`material-${i}`].x)).size).toBe(3);
    expect(new Set([2,3,4].map(i=>m.a.points[`material-${i}`].x)).size).toBe(3);
  });
  it('비자성 검사를 마치면 손으로 분류할 재료를 자석이 가리지 않는다',()=>{
    const m=short(3);m.place('sweep-magnet',{x:66,y:43});
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('손으로 잡아 오른쪽 아래');
    expect(m.a.points['sweep-magnet']).toEqual({x:54,y:43});
    m.place('material-2',{x:86,y:70});
    const sorted=m.c.root.querySelector<HTMLButtonElement>('[data-drag="material-2"]')!;
    expect(sorted.disabled).toBe(true);expect(sorted.style.pointerEvents).toBe('none');
  });
  it('먼 곳·가까운 곳·종이 비교를 마치면 같은 개념의 구조 활동을 요구하지 않는다',()=>{
    let m=short(4);m.click('release');m=reopen(4,m);m.click('next');
    m=reopen(4,m);m.place('distance-magnet',{x:49,y:55});m.click('release');
    m=reopen(4,m);m.click('next');m=reopen(4,m);
    m.place('paper',{x:55,y:55});m.click('release');
    expect(missionReady(4,m.a,m.s)).toBe(true);
    expect(m.a.trials?.find(t=>t.key==='paper')?.initialObjects).toEqual(m.a.trials?.find(t=>t.key==='near')?.initialObjects);
    expect(missionView(4,m.a,m.s).html).not.toContain('철 열쇠를 구하자');
  });
  it('한 자석에서 두 극 반응을 비교한 뒤 양끝 표시를 복원한다',()=>{
    let m=short(5);m.place('probe',{x:48,y:53});tick(1);m.click('flip');tick(1);m=reopen(5,m);
    m.place('probe',{x:48,y:53});tick(1);
    const target=m.a.points['unknown-magnet'];
    m.place('stickerS',{x:59,y:40});expect(m.a.values.label0S).not.toBe(true);
    m.place('stickerS',{x:target.x-5.5,y:target.y});
    expect(missionReady(5,m.a,m.s)).toBe(false);
    m.place('stickerN',{x:target.x+5.5,y:target.y});expect(missionReady(5,m.a,m.s)).toBe(true);
    expect(missionView(5,m.a,m.s).html).not.toContain('두 번째 문 자석');
  });
  it('첫 반응부터 극 스티커를 붙이고 고칠 수 있지만 반대 극도 확인해야 완료된다',()=>{
    let m=short(5);m.place('probe',{x:48,y:53});tick(1);
    let target=m.a.points['unknown-magnet'];
    m.place('stickerS',{x:target.x-5.5,y:target.y});
    expect(m.a.values.label0S).toBe(true);
    m.place('stickerN',{x:target.x+5.5,y:target.y});
    expect(m.a.values.solved0).toBe(true);expect(missionReady(5,m.a,m.s)).toBe(false);
    m=reopen(5,m);
    target=m.a.points['unknown-magnet'];
    m.place('stickerS',{x:target.x+5.5,y:target.y});
    expect(m.a.values.label0S).toBeUndefined();expect(m.a.values.solved0).toBeUndefined();
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('같은 극끼리 밀어내');
    m.place('stickerS',{x:target.x-5.5,y:target.y});m=reopen(5,m);
    m.click('flip');tick(1);m.place('probe',{x:48,y:53});tick(1);
    expect(m.a.values.label0N).toBe(true);expect(m.a.values.label0S).toBe(true);
    expect(missionReady(5,m.a,m.s)).toBe(true);
  });
  it.each([true,false])('뒤집기는 두 자석의 출발점만 복원하고 다시 대야 두 번째 반응이 기록된다 (동작 효과 %s)',motion=>{
    const m=short(5);m.s.settings.motion=motion;m.place('probe',{x:48,y:53});tick(1);
    const first=structuredClone(m.a.trials!.find(t=>t.key==='pole0S')!);
    m.click('flip');tick(1);
    expect(m.a.trials).toEqual([first]);expect(m.a.values.reaction).toBeUndefined();
    expect(m.a.points.probe).toEqual({x:29,y:54});expect(m.a.points['unknown-magnet']).toEqual({x:68,y:53});
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('N극을 오른쪽 점선에');
    m.place('stickerN',{x:73.5,y:53});expect(m.a.values.label0N).toBe(true);
    m.place('probe',{x:48,y:53});tick(1);
    expect(m.a.values.test0N).toBe(true);expect(m.a.values.test0S).toBe(true);
    const trial=m.a.trials?.find(t=>t.key==='pole0N');
    expect(trial?.outcome).toBe('attract');
    expect(trial?.initialObjects.map(({id,x,y})=>({id,x,y}))).toEqual(first.initialObjects.map(({id,x,y})=>({id,x,y})));
    expect(trial?.objects.find(o=>o.id==='unknown-magnet')).toMatchObject({x:48+(192+211-2)/25.6,y:53});
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).toContain('스티커');
  });
  it('원위치로 돌아오는 중 다시 열거나 예전 뒤집기 상태를 불러와도 첫 관찰을 보존한다',()=>{
    let m=short(5);m.place('probe',{x:48,y:53});tick(1);
    const first=structuredClone(m.a.trials);
    m.click('flip');tick(.12);expect(m.a.values.poleReturning).toBe(true);
    m=reopen(5,m);
    for(let i=0;i<2;i++){
      expect(m.a.points.probe).toEqual({x:29,y:54});expect(m.a.points['unknown-magnet']).toEqual({x:68,y:53});
      expect(m.a.values.reaction).toBeUndefined();expect(m.a.values.poleReturning).toBeUndefined();expect(m.a.trials).toEqual(first);
      if(!i){m.a.values.reaction='밀려났어';m.a.points['unknown-magnet']={x:77,y:53};m=reopen(5,m);}
    }
  });
  it('두 고리를 놓은 배치를 유지하여 띄우기와 붙이기만 비교한다',()=>{
    let m=short(6);m.place('ring0',{x:68,y:71});m.place('ring1',{x:68,y:56});
    m.c.root.querySelector('[data-drag="ring1"]')!.dispatchEvent(new Event('dblclick'));
    m.click('check');tick(1);
    m=reopen(6,m);m.click('next');expect(m.a.values.round).toBe(2);
    expect(m.a.points.ring0).toEqual({x:68,y:71});
    m=reopen(6,m);expect(m.c.root.querySelector('[data-drag="ring2"]')).toBeNull();
    m.c.root.querySelector('[data-drag="ring1"]')!.dispatchEvent(new Event('dblclick'));
    m.click('check');tick(1);
    expect(missionReady(6,m.a,m.s)).toBe(true);
    expect(m.a.trials?.find(t=>t.key==='join2')?.objects[1].y).toBeCloseTo(71-17/7.2);
  });
  it('청소는 기다리기로 통과하지 않고 짧게 쓸어 닦으면 된다',()=>{
    const m=short(7),center=glassStains[0];m.place('cleaner',center);tick(12);
    expect(m.a.values.clean0).not.toBe(true);
    for(const dx of [6,-6]){m.place('cleaner',{x:center.x+dx,y:center.y});tick(1.5);}
    expect(m.a.values.clean0).toBe(true);
    expect(Number(m.a.values.scrubTurns0)).toBeLessThan(2);
  });
  it('세 얼룩을 이어서 한 번씩 지나가면 되풀이해서 문지르지 않아도 청소된다',()=>{
    const m=short(7);
    for(const [x,y] of [[33.5,50.5],[42.5,50.5],[51.3,55.2],[60.3,55.2],[68.4,47],[77.4,47]]){
      m.place('cleaner',{x,y});tick(.8);
    }
    expect([0,1,2].every(i=>m.a.values[`clean${i}`]===true)).toBe(true);
    expect(missionReady(7,m.a,m.s)).toBe(true);
    expect([0,1,2].every(i=>Number(m.a.values[`scrubTurns${i}`])<2)).toBe(true);
  });
  it('당겨진 카트는 조종 자석을 통과해 방향이 뒤집히지 않는다',()=>{
    const m=short(8);m.place('controller',{x:35,y:59});tick(5);
    expect(Number(m.a.values.car)).toBeCloseTo(29,1);
    tick(5);expect(Number(m.a.values.car)).toBeCloseTo(29,1);
    expect(m.a.values.segment0).not.toBe(true);
  });
  it('조작 화면에서 설정을 여는 동안 카트와 운반 거리는 멈춘다',()=>{
    const m=short(8);m.place('controller',{x:41,y:59});tick(.2);
    const car=m.a.values.car,travel=m.a.values.controlled0;
    m.c.root.inert=true;tick(2);
    expect(m.a.values.car).toBe(car);expect(m.a.values.controlled0).toBe(travel);
    m.c.root.inert=false;tick(.5);expect(Number(m.a.values.car)).toBeGreaterThan(Number(car));
  });
  it('카트를 어느 쪽으로든 자유롭게 움직이고 특정 방법을 강요하지 않는다',()=>{
    const m=short(8);m.place('controller',{x:19,y:59});tick(.1);
    const left=Number(m.a.values.car);expect(left).toBeLessThan(27);
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).not.toContain('이번 의뢰는');
    m.place('controller',{x:Number(m.a.values.car)+10,y:59});tick(.1);
    expect(Number(m.a.values.car)).toBeGreaterThan(left);
    expect(m.c.root.querySelector('.mission-feedback')!.textContent).not.toContain('이번 의뢰는');
  });
  it('당기기나 밀기 중 한 방법으로 한 번 배달하고 멈추면 완료한다',()=>{
    for(const pushing of [false,true]){
      let m=short(8);if(pushing)m.click('flip');
      expect(m.c.root.querySelector('[data-mission="checkpoint"]')).toBeNull();
      for(let i=0;i<80&&Number(m.a.values.car??27)<71;i++){
        m.place('controller',{x:Number(m.a.values.car??27)+(pushing?-8:8),y:59});tick(.2);
      }
      expect(m.a.values.segment0).not.toBe(true);
      const release=Number(m.a.values.car),speed=Number(m.a.values.cartSpeed);
      expect(speed).toBeGreaterThan(0);
      m.click('detach');
      expect(m.a.values.segment0).not.toBe(true);
      tick(.04);
      expect(Number(m.a.values.car)).toBeGreaterThan(release);
      expect(Number(m.a.values.cartSpeed)).toBeLessThan(speed);
      expect(m.a.trials?.some(t=>t.key==='stop0')).not.toBe(true);
      if(!pushing){
        const coastPosition=m.a.values.car;
        m.c.root.dataset.demoPaused='';tick(1);expect(m.a.values.car).toBe(coastPosition);
        delete m.c.root.dataset.demoPaused;
        m=reopen(8,m);
      }
      tick(1);
      expect(m.a.values.cartSpeed).toBe(0);
      expect(m.a.values.segment0).toBe(true);
      const stop=m.a.trials!.find(t=>t.key==='stop0')!;
      expect(stop.initialObjects.find(o=>o.id==='cart-magnet')).toMatchObject({x:release,pole:'N'});
      expect(stop.conditions.rollingDistance).toBeGreaterThan(0);
      const delivered=m.a.trials!.find(t=>t.key==='delivery0')!;
      expect(delivered.conditions).toMatchObject({method:pushing?'push':'pull',facing:'N',cartFacing:pushing?'N':'S'});
      expect(delivered.objects.find(o=>o.id==='controller')?.pole).toBe(pushing?'S':'N');
      expect(missionReady(8,m.a,m.s)).toBe(true);
      expect(m.a.values.segment1).toBeUndefined();
      const html=missionView(8,m.a,m.s).html;expect(html).not.toContain('data-mission="next"');expect(html).not.toContain('data-mission="tool"');
      delete m.a.values.paceVersion;m.a.values.round=1;
      expect(missionReady(8,m.a,m.s)).toBe(true);
    }
  });
  it('배달 도중 당기기에서 밀기로 바꿔도 도착한 실제 기록으로 완료한다',()=>{
    const m=short(8);
    for(let i=0;i<80&&Number(m.a.values.car??27)<50;i++){
      m.place('controller',{x:Number(m.a.values.car??27)+8,y:59});tick(.2);
    }
    m.click('flip');
    for(let i=0;i<80&&Number(m.a.values.car??27)<71;i++){
      m.place('controller',{x:Number(m.a.values.car??27)-8,y:59});tick(.2);
    }
    m.click('detach');tick(1);
    expect(missionReady(8,m.a,m.s)).toBe(true);
    expect(m.a.trials!.find(t=>t.key==='delivery0')!.conditions.method).toBe('mixed');
  });
  it('발명품은 현재 설계의 실제 사용 성공 한 번으로 끝나며 설계 변경은 무효화한다',()=>{
    let m=short(10);m.place('use-handle',{x:50,y:65});m.click('test');
    expect(missionReady(10,m.a,m.s)).toBe(true);
    const html=missionView(10,m.a,m.s).html;expect(html).not.toContain('다른 사용 상황');expect(html).not.toContain('data-drag="force-arrow"');
    m.click('adjust');m=reopen(10,m);m.place('design-magnet',{x:44,y:55});
    expect(missionReady(10,m.a,m.s)).toBe(false);
  });
});

describe('먼 거리 관찰 뒤 직접 고르는 거리',()=>{
  it('5칸을 본 다음 1칸을 바로 선택해도 종이 비교로 이어진다',()=>{
    let m=mount(4,{paceVersion:1,mechanicsVersion:1});
    expect(m.c.root.dataset.handState).toBe('held');
    m.click('release');tick(1);
    m=mount(4,{},m);m.click('next');m=mount(4,{},m);
    expect(missionView(4,m.a,m.s).html).toContain('붙을 것 같은 곳은?');
    m.click('gap-1');m.click('release');
    tick(.16);
    expect(m.c.root.dataset.handState).toBe('released');
    tick(1);
    expect(m.a.values.done1).toBe(true);
    expect(m.a.trials?.find(t=>t.key==='near')?.conditions.clearanceCells).toBe(1);
    expect(m.a.trials?.filter(t=>t.key.startsWith('distance-choice')).length||0).toBe(0);
    m=mount(4,{},m);m.click('next');
    expect(m.a.values.round).toBe(2);
    expect(m.a.points['distance-magnet']).toEqual({x:49,y:55});
  });
  it('2~4칸에서는 손을 놓아도 클립은 그대로이고 다른 자리를 고를 수 있다',()=>{
    const m=mount(4,{paceVersion:1,mechanicsVersion:1,round:1,done0:true});
    for(const gap of [2,4,3]){
      m.click(`gap-${gap}`);expect(m.c.root.dataset.handState).toBe('held');
      m.click('release');tick(1);
      const t=m.a.trials!.find(t=>t.key===`distance-choice-${gap}`)!;
      expect(t.objects).toEqual(t.initialObjects);
      expect(m.a.values.done1).not.toBe(true);
      expect(m.c.root.dataset.handState).toBe('released');
    }
    m.click('gap-1');m.click('release');tick(1.2);
    expect(m.a.values.done1).toBe(true);
    const t=m.a.trials!.find(t=>t.key==='near')!;
    expect(t.objects.find(o=>o.id==='clip')!.x).toBeLessThan(t.initialObjects.find(o=>o.id==='clip')!.x);
  });
  it('움직임 줄이기에서도 놓은 손과 관찰 결과가 남는다',()=>{
    const m=mount(4,{paceVersion:1,round:1});m.s.settings.motion=false;
    m.click('gap-3');m.click('release');expect(m.c.root.dataset.handState).toBe('released');
    m.click('gap-1');m.click('release');expect(m.a.values.done1).toBe(true);
  });
});

// Every activity, many seeds: arbitrary touches in any order may never break the state a save depends on.
describe('아무렇게나 조작해도 깨지지 않는 실험대',()=>{
  const rng=(seed:number)=>()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};
  const controls=(m:ReturnType<typeof mount>)=>[...(m.c.root as unknown as ElementStub).elements.keys()].filter(k=>/^\[data-(drag|mission)=/.test(k)&&!/bench-view|view3d/.test(k));
  const sound=(m:ReturnType<typeof mount>)=>{
    for(const [id,p] of Object.entries(m.a.points)){expect(Number.isFinite(p.x)&&Number.isFinite(p.y),id).toBe(true);expect(p.x,id).toBeGreaterThanOrEqual(-5);expect(p.x,id).toBeLessThanOrEqual(105);expect(p.y,id).toBeGreaterThanOrEqual(-5);expect(p.y,id).toBeLessThanOrEqual(105);}
    expect(validSave(m.s)).toBe(true);
    missionReady(m.c.screen,m.a,m.s);
  };
  for(let n=1;n<=8;n++)it(`활동 ${n}: 시드 12개 × 조작 120번`,()=>{
    for(let seed=1;seed<=12;seed++){
      const random=rng(seed*97+n);
      let m=mount(n,{paceVersion:1,mechanicsVersion:1,inquiryVersion:2,inquiryActivity:n,inquiryPhase:'experiment'});
      for(let step=0;step<120;step++){
        const list=controls(m),target=list[Math.floor(random()*list.length)];
        const id=/="([^"]+)"/.exec(target||'')?.[1];
        const point={x:random()*100,y:random()*100};
        if(id&&target.startsWith('[data-drag'))random()<.5?m.place(id,point):m.drag(id,m.a.points[id]||point,point);
        else if(id)m.click(id);
        tick(.28);
        // The real page redraws after refresh(); a reopen is that redraw, with the same saved state.
        if(step%15===14){sound(m);m=mount(n,{},m);}
      }
      sound(m);tick(2);sound(m);
      cleanups.forEach(fn=>fn());cleanups=[];
    }
  });
});
