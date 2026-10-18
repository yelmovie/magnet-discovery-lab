import { describe, expect, it } from 'vitest';
import { accessible, cartDirection, cleanPercent, completeActivity, coreReady, defaultDesign, designResult, dirtyCell, emptyActivity, freshSave, grid, progress, ready, relation, response, ringGaps, sweep, validSave } from '../src/domain';

describe('magnet rules', () => {
  it('distinguishes pole relations and material response', () => {
    expect(relation('N', 'N')).toBe('repel'); expect(relation('S', 'S')).toBe('repel'); expect(relation('N', 'S')).toBe('attract');
    expect(response(20)).toBe('strong'); expect(response(36)).toBe('strong'); expect(response(37)).toBe('weak'); expect(response(71)).toBe('none'); expect(response(20, false)).toBe('none');
  });
  it('computes facing surfaces of rings rather than comparing top labels', () => {
    expect(ringGaps(['N', 'S', 'N'])).toEqual([true, true]); expect(ringGaps(['N', 'N', 'N'])).toEqual([false, false]); expect(ringGaps(['N', 'S', 'S'])).toEqual([true, false]);
  });
  it('pulls at the front and pushes at the back', () => {
    expect(cartDirection('front', 'S')).toBe(1); expect(cartDirection('front', 'N')).toBe(-1);
    expect(cartDirection('back', 'S')).toBe(1); expect(cartDirection('back', 'N')).toBe(-1);
  });
});
describe('meaningful completion', () => {
  it('requires actual observations of both devices', () => {
    const s = freshSave(), a = emptyActivity(); a.values.found0 = a.values.found1 = true; expect(ready(1, a, s)).toBe(false);
    for (const i of [0, 1]) for (const name of ['open', 'inside', 'predicted']) a.values[`${name}${i}`] = true;
    expect(ready(1, a, s)).toBe(true);
  });
  it('needs controlled distance and paper observations', () => {
    const s = freshSave(), a = emptyActivity(); a.values['near-clear'] = a.values['far-clear'] = a.values.compare = true; expect(ready(4, a, s)).toBe(false);
    a.values['near-paper'] = true; expect(ready(4, a, s)).toBe(true);
  });
  it('does not accept answers to unknown poles without both experiments', () => {
    const s = freshSave(), a = emptyActivity(); for (let i = 0; i < 4; i++) a.values[`solved${i}`] = true;
    expect(ready(5, a, s)).toBe(false); for (let i = 0; i < 4; i++) for (const p of ['N', 'S']) a.values[`test${i}${p}`] = true;
    expect(ready(5, a, s)).toBe(true);
  });
  it('denies inaccessible activities and empty completion', () => { const s = freshSave(); s.activities[2] = emptyActivity(); expect(accessible(s, 1)).toBe(true); expect(accessible(s, 2)).toBe(false); expect(accessible(s, 3)).toBe(false); expect(completeActivity(s, 2)).toBe(false); expect(accessible(s, 11)).toBe(false); });
  it('creates one immutable evidence snapshot for the two activities', () => {
    const s = freshSave(); s.completed = [1]; s.activities[1] = emptyActivity(); s.activities[2] = emptyActivity();
    for (const i of [0, 1]) for (const name of ['with', 'without', 'role']) s.activities[2].values[`${name}${i}`] = true;
    expect(completeActivity(s, 2)).toBe(true); expect(s.evidence).toHaveLength(1); expect(progress(s)).toBe(20); expect(accessible(s, 3)).toBe(true);
    s.activities[2].values.role0 = false; expect(s.evidence[0].activities[1].values.role0).toBe(true);
    s.activities[2].values.role0 = true; completeActivity(s, 2); expect(s.evidence).toHaveLength(1);
  });
});
describe('cleaning', () => {
  it('counts only original dirt and ignores duplicates / out of range', () => {
    expect(cleanPercent([])).toBe(0); expect(cleanPercent([-1, 99999, 0, 0])).toBe(0);
    const all = Array.from({ length: grid.w * grid.h }, (_, i) => i).filter(i => dirtyCell(i % grid.w, Math.floor(i / grid.w)));
    expect(cleanPercent([...all, ...all])).toBe(100);
  });
  it('interpolates cleaning between points and supports the completion threshold', () => {
    let mask: number[] = []; for (let y = 0; y <= 100; y += 6) mask = sweep(mask, { x: 0, y }, { x: 100, y });
    expect(cleanPercent(mask)).toBe(100); const s = freshSave(), a = emptyActivity(); a.mask = mask; expect(ready(7, a, s)).toBe(true);
  });
});
describe('inventions', () => {
  it('tests geometry and material/poles, and allows multiple solutions', () => {
    const d = defaultDesign(); expect(designResult(d).ready).toBe(false); d.aligned = true; expect(designResult(d).ready).toBe(false);
    d.gap = 24; expect(designResult(d).ready).toBe(true); d.pair = 'magnet'; expect(designResult(d).ready).toBe(false); d.pole = 'S'; expect(designResult(d).ready).toBe(true);
  });
  it('rejects old test results after a design revision', () => {
    const s = freshSave(), a = emptyActivity(); Object.assign(a.values, { passed: true, reason: true, revision: 1, template: 'box' }); s.design.revision = 2; expect(ready(10, a, s)).toBe(false); a.values.revision = 2; expect(ready(10, a, s)).toBe(true);
    s.design.template = 'remote'; expect(ready(10, a, s)).toBe(false);
  });
});
describe('progress / persistence', () => {
  it('distinguishes five completed missions from a fully restored city', () => {
    const s = freshSave(); s.evidence = Array.from({ length: 5 }, (_, stage) => ({ stage, date: '', activities: [], summary: [] }));
    expect(progress(s)).toBe(95); expect(coreReady(s)).toBe(false); s.final.report = true; s.final.latch = 'S'; s.final.ring = 'S'; s.final.plate = 24; expect(coreReady(s)).toBe(true); s.final.complete = true; expect(progress(s)).toBe(100);
  });
  it('rejects malformed and future saves without pretending they are fresh', () => {
    expect(validSave(freshSave())).toBe(true); expect(validSave({ version: 2 })).toBe(false); expect(validSave(null)).toBe(false);
    const s = freshSave(); s.final.complete = true; expect(validSave(s)).toBe(false);
  });
  it('rejects evidence without completed activities', () => { const s = freshSave(); s.evidence = [{ stage: 0, date: '', activities: [], summary: [] }]; expect(validSave(s)).toBe(false); });
});

describe('administrator access', () => {
  it('opens all ten activities without creating progress and restores normal gates when disabled', () => {
    const s = freshSave(), before = structuredClone(s);
    for (let n = 1; n <= 10; n++) expect(accessible(s, n, true)).toBe(true);
    for (const n of [0, 11, 1.5]) expect(accessible(s, n, true)).toBe(false);
    expect(s).toEqual(before); expect(progress(s)).toBe(0);
    expect(accessible(s, 1)).toBe(true); expect(accessible(s, 2)).toBe(false); expect(accessible(s, 9)).toBe(false);
  });
  it('bypasses core prerequisites only for preview and still requires the three physical conditions', () => {
    const s = freshSave(); expect(coreReady(s, true)).toBe(false);
    Object.assign(s.final, { latch: 'S', ring: 'S', plate: 24 });
    expect(coreReady(s, true)).toBe(true); expect(coreReady(s)).toBe(false);
    expect(s.evidence).toEqual([]); expect(s.final.complete).toBe(false);
  });
});


describe('direct manipulation adventure', () => {
  it('requires observing each material and correcting the sorted result', () => {
    const s=freshSave(),a=emptyActivity();a.values.playVersion=2;
    for(const id of ['clip','nail','aluminum','wood','plastic','rubber'])a.values[id]=true;
    expect(ready(3,a,s)).toBe(false);
    for(const id of ['clip','nail','aluminum','wood','plastic','rubber'])a.values[`sorted-${id}`]=true;
    expect(ready(3,a,s)).toBe(true);
    a.values['sorted-aluminum']=false;expect(ready(3,a,s)).toBe(false);
  });
  it('requires all three ring repair orders, not a single successful arrangement', () => {
    const s=freshSave(),a=emptyActivity();Object.assign(a.values,{playVersion:2,tested:true,gaps:true,reason:true,order0:true});
    expect(ready(6,a,s)).toBe(false);a.values.order1=true;expect(ready(6,a,s)).toBe(false);a.values.order2=true;expect(ready(6,a,s)).toBe(true);
  });
  it('requires two use cases and the current design revision for final invention evidence', () => {
    const s=freshSave(),a=emptyActivity();Object.assign(a.values,{playVersion:2,trial0:true,reason:true,template:'box',revision:s.design.revision});
    expect(ready(10,a,s)).toBe(false);a.values.trial1=true;expect(ready(10,a,s)).toBe(true);
    s.design.revision++;expect(ready(10,a,s)).toBe(false);
  });
  it('preserves legacy completed evidence while using new activity gates', () => {
    const s=freshSave();s.completed=[1,2];s.evidence=[{stage:0,date:'',activities:[],summary:['legacy']}];
    const a=emptyActivity();a.values.playVersion=2;s.activities[3]=a;
    expect(validSave(s)).toBe(true);expect(accessible(s,3)).toBe(true);expect(completeActivity(s,3)).toBe(false);
    expect(s.evidence[0].summary).toEqual(['legacy']);
  });
});
