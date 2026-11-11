import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyActivity, freshSave } from '../src/domain';
import { canDemonstrate, demonstrationSteps, ExperimentAutoplay } from '../src/experiment-autoplay';
import { mailboxParts, partKey } from '../src/mailbox-assembly';
import { mailbox } from '../src/mailbox';

describe('optional experiment demonstrations', () => {
  it('assembles every mailbox part in order before closing the lid',()=>{
    const steps=demonstrationSteps(1,freshSave());
    expect(steps).toHaveLength(7);
    expect(steps.slice(0,6)).toMatchObject(mailboxParts.map(part=>({kind:'move',id:partKey(part),target:part.target})));
    expect(steps[6]).toMatchObject({kind:'move',id:'lid',target:mailbox.handleClosed});
  });
  it('only exposes controls on the current hands-on experiments', () => {
    const a=emptyActivity();
    a.values.inquiryVersion=2;
    for(const phase of ['predict','explain','apply','complete']){
      a.values.inquiryPhase=phase;
      expect(canDemonstrate(5,a)).toBe(false);
    }
    a.values.inquiryPhase='experiment';
    for(let stage=1;stage<=10;stage++)expect(canDemonstrate(stage,a)).toBe(true);
    expect(canDemonstrate(11,a)).toBe(false);
    a.values.inquiryVersion=1;
    expect(canDemonstrate(5,a)).toBe(false);
  });

  it('plans only missing observations without clearing existing records or chosen design', () => {
    const save=freshSave(), a=save.activities[5]=emptyActivity();
    a.points.probe={x:35,y:44};
    a.values.test0S=true;
    a.records.push({key:'old',label:'S극 관찰',result:'당겨졌어'});
    const before=structuredClone(save), steps=demonstrationSteps(5,save);
    expect(steps.map(step=>step.kind)).toEqual(['press','move']);
    expect(steps.at(-1)?.label).toContain('N극');
    expect(save).toEqual(before);
  });

  it('finishes material sorting but leaves pole-sticker answers for the learner', () => {
    const save=freshSave();
    const moves=(n:number)=>demonstrationSteps(n,save).flatMap(step=>step.kind==='move'?[step.id]:[]);
    expect(new Set(moves(3))).toEqual(new Set(['sweep-magnet','material-2','material-3','material-4']));
    expect(demonstrationSteps(5,save).map(step=>step.kind==='move'?step.id:step.kind)).toEqual(['probe','press','probe']);
    expect(demonstrationSteps(5,save).filter(step=>step.kind==='press').map(step=>step.selector))
      .toEqual(['[data-mission="flip"]']);
  });

  it('waits for the learner to choose an invention and tests their own design', () => {
    const save=freshSave(), a=save.activities[9]=emptyActivity();
    a.values.mechanicsVersion=1;
    expect(demonstrationSteps(9,save)).toEqual([]);
    a.values.chosen=true;
    expect(demonstrationSteps(9,save)).toMatchObject([{kind:'move',id:'base'},{kind:'move',id:'design-magnet'},{kind:'move',id:'design-target'},{kind:'press',selector:'[data-mission="prototype"]'}]);
    Object.assign(a.values,{base:true,magnet:true,target:true});
    expect(demonstrationSteps(9,save)).toMatchObject([{kind:'press',selector:'[data-mission="prototype"]'}]);
    save.activities[10]=emptyActivity();save.design.template='remote';
    expect(demonstrationSteps(10,save)).toMatchObject([{kind:'move',id:'use-handle'},{kind:'press',selector:'[data-mission="test"]'}]);
  });
  it('resumes after fitted parts and cleans every remaining aquarium stain',()=>{
    const s=freshSave(),a=s.activities[1]=emptyActivity();
    a.values['assembly-body']=true;a.values['assembly-cover']=true;
    expect(demonstrationSteps(1,s).filter(step=>step.kind==='move').map(step=>step.id)).toEqual(['assembly-grip','assembly-socket','assembly-plate','assembly-magnet','lid']);
    s.activities[7]=emptyActivity();
    expect(demonstrationSteps(7,s)).toMatchObject([{kind:'wipe',stain:0},{kind:'wipe',stain:1},{kind:'wipe',stain:2}]);
    s.activities[7].values.clean0=true;
    expect(demonstrationSteps(7,s)).toMatchObject([{kind:'wipe',stain:1},{kind:'wipe',stain:2}]);
  });
  it('tests both ring conditions and makes just one delivery by the chosen pole',()=>{
    const s=freshSave();
    const rings=demonstrationSteps(6,s);
    expect(rings.filter(step=>step.kind==='press').map(step=>step.selector)).toEqual(['[aria-label="2번 고리 뒤집기"]','[data-mission="check"]','[data-mission="next"]','[aria-label="2번 고리 뒤집기"]','[data-mission="check"]']);
    expect(demonstrationSteps(8,s)).toMatchObject([{kind:'drive'}]);
    s.activities[8]=emptyActivity();s.activities[8].values={round:1,controllerPole:'S'};
    expect(demonstrationSteps(8,s)).toMatchObject([{kind:'drive'}]);
  });
});

class Control extends EventTarget {
  style={left:'29%',top:'54%'};dataset:Record<string,string>={};disabled=false;hidden=false;inert=false;textContent='';
  children=new Map<string,Control>();classList={toggle(){}};
  querySelector(selector:string){return this.children.get(selector)||null;}
  setAttribute(){} focus(){} click(){this.dispatchEvent(new Event('click'));}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it.each([1, 2] as const)('plays the same observation sequence at %ix speed', speed => {
  vi.useFakeTimers();
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false, querySelector: () => null }));
  vi.stubGlobal('CustomEvent', class extends Event {
    detail: unknown;
    constructor(type: string, init: { detail: unknown }) { super(type); this.detail = init.detail; }
  });
  const shell = new Control(), root = new Control(), panel = new Control(), toggle = new Control(), flip = new Control(), probe = new Control();
  shell.children.set('.experiment-autoplay', panel);
  panel.children.set('[data-demo="toggle"]', toggle);
  panel.children.set('[data-demo="stop"]', new Control());
  panel.children.set('.demo-caption', new Control());
  root.children.set('[data-mission="flip"]', flip);
  root.children.set('[data-drag="probe"]', probe);
  const save = freshSave(), activity = save.activities[5] = emptyActivity();
  save.settings.motion = false;
  save.settings.autoplaySpeed = speed;
  activity.values = { paceVersion: 1, round: 0, test0S: true };
  let observations = 0;
  flip.addEventListener('click', () => { activity.values.probePole = 'S'; });
  probe.addEventListener('piece-place', () => { observations++; activity.values.test0N = true; });
  const player = new ExperimentAutoplay();
  const dispose = player.bind(shell as unknown as HTMLElement, root as unknown as HTMLElement, 5, save, () => {});
  toggle.click();
  vi.advanceTimersByTime(1000);
  expect(observations).toBe(speed === 2 ? 1 : 0);
  vi.advanceTimersByTime(2000);
  expect(observations).toBe(1);
  expect(activity.values.solved0).toBeUndefined();
  dispose(); player.reset();
});

it('blocks starting a demonstration when the teacher turns it off', () => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  const shell = new Control(), root = new Control(), panel = new Control(), toggle = new Control();
  shell.children.set('.experiment-autoplay', panel);
  panel.children.set('[data-demo="toggle"]', toggle);
  panel.children.set('[data-demo="stop"]', new Control());
  panel.children.set('.demo-caption', new Control());
  const save = freshSave(); save.settings.autoplay = false;
  const player = new ExperimentAutoplay();
  const dispose = player.bind(shell as unknown as HTMLElement, root as unknown as HTMLElement, 1, save, () => {});
  toggle.click();
  expect(player.save).toBeUndefined();
  expect(root.dataset.demoRun).toBeUndefined();
  dispose(); player.reset();
});

it('autoplay updates the live activity, keeps observations on stop, and does not submit answers',()=>{
  vi.useFakeTimers();
  vi.stubGlobal('window',Object.assign(new EventTarget(),{setTimeout,clearTimeout}));
  vi.stubGlobal('document',Object.assign(new EventTarget(),{hidden:false,querySelector:()=>null}));
  vi.stubGlobal('CustomEvent',class extends Event {detail:unknown;constructor(type:string,init:{detail:unknown}){super(type);this.detail=init.detail;}});
  const shell=new Control(),root=new Control(),panel=new Control(),toggle=new Control(),stop=new Control(),caption=new Control(),probe=new Control(),flip=new Control();
  shell.children.set('.experiment-autoplay',panel);
  panel.children.set('[data-demo="toggle"]',toggle);panel.children.set('[data-demo="stop"]',stop);panel.children.set('.demo-caption',caption);
  root.children.set('[data-drag="probe"]',probe);root.children.set('[data-mission="flip"]',flip);
  const save=freshSave(),a=save.activities[5]=emptyActivity();save.settings.motion=false;
  a.values={paceVersion:1,mechanicsVersion:1,round:0,test0S:true};
  a.records.push({key:'before',label:'먼저 한 관찰',result:'당겨졌어'});
  const history=structuredClone(save.evidence),design=structuredClone(save.design);
  flip.addEventListener('click',()=>{a.values.probePole='S';});
  probe.addEventListener('piece-place',()=>{a.values.test0N=true;a.records.push({key:'auto',label:'N극 관찰',result:'밀려났어'});});
  const player=new ExperimentAutoplay(),dispose=player.bind(shell as unknown as HTMLElement,root as unknown as HTMLElement,5,save,()=>{});
  toggle.click();expect(player.save).toBe(save);
  vi.advanceTimersByTime(3200);
  expect(a.values.test0S).toBe(true);expect(a.values.test0N).toBe(true);
  expect(caption.textContent).toContain('직접 골라');
  expect(root.dataset.demoPaused).toBeUndefined();
  stop.click();expect(player.save).toBeUndefined();
  expect(a.records.map(record=>record.key)).toEqual(['before','auto']);
  expect(a.values.solved0).toBeUndefined();expect(save.completed).toEqual([]);
  expect(save.evidence).toEqual(history);expect(save.design).toEqual(design);
  dispose();player.reset();
});
