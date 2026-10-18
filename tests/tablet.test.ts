import { describe, expect, it } from 'vitest';
import { coreReady, emptyActivity, freshSave, migrateSave, ready, validSave, type Activity } from '../src/domain';
import { addTrial, paperComparison, validTrial } from '../src/trial-records';
import { initializeFinal } from '../src/final-mission';

function distanceTrial(a: Activity, key: string, x: number, paper: boolean, outcome: string) {
  return addTrial(a, { key, activity: 4, conditions: { paper, material: 'iron' }, initialObjects: [{ id: 'magnet', x, y: 48 }, { id: 'clip', x: 73, y: 48 }], objects: [], input: [], outcome, pinned: true });
}
describe('tablet evidence', () => {
  it('compares paper only with the exact same initial objects and material', () => {
    const a = emptyActivity(); a.values.playVersion = 3;
    distanceTrial(a, 'far-clear', 15, false, 'none'); distanceTrial(a, 'near-clear', 47, false, 'attract');
    distanceTrial(a, 'near-paper', 55, true, 'attract'); expect(paperComparison(a)).toBe(false); expect(ready(4, a, freshSave())).toBe(false);
    distanceTrial(a, 'near-paper', 47, true, 'attract'); expect(paperComparison(a)).toBe(true); expect(ready(4, a, freshSave())).toBe(true);
    a.trials![2].conditions.material = 'plastic'; expect(paperComparison(a)).toBe(false);
  });
  it('does not accept saved completion flags without actual comparison records', () => {
    const a = emptyActivity(); Object.assign(a.values, { playVersion: 3, 'near-clear': true, 'far-clear': true, 'near-paper': true });
    expect(ready(4, a, freshSave())).toBe(false);
  });
  it('keeps first observations while bounding later paths and trial history', () => {
    const a = emptyActivity(); distanceTrial(a, 'first', 15, false, 'none');
    for (let i = 0; i < 20; i++) addTrial(a, { key: `try${i}`, activity: 4, conditions: {}, initialObjects: [], objects: [], input: Array.from({ length: 600 }, (_, j) => ({ x: j / 10, y: 48 })), outcome: 'none' });
    expect(a.trials).toHaveLength(13); expect(a.trials![0].key).toBe('first'); expect(a.trials!.every(t => t.input.length <= 240 && validTrial(t))).toBe(true);
  });
  it('requires the two-ring comparison and one three-ring order, without requiring the optional order', () => {
    const a = emptyActivity(); Object.assign(a.values, { playVersion: 3, 'two-attract': true, 'two-repel': true });
    expect(ready(6, a, freshSave())).toBe(false); a.values.order1 = true; expect(ready(6, a, freshSave())).toBe(true); expect(a.values.order2).toBeUndefined();
  });
  it('accepts first successful use plus explanation, but invalidates it after a design revision', () => {
    const s = freshSave(), a = emptyActivity(); Object.assign(s.design, { aligned: true, gap: 22 }); Object.assign(a.values, { playVersion: 3, reason: true });
    addTrial(a, { key: 'use', activity: 10, conditions: { aligned: true, gap: 22 }, initialObjects: [], objects: [], input: [], outcome: 'success', template: 'box', designRevision: 0 });
    expect(ready(10, a, s)).toBe(true); expect(a.values.trial1).toBeUndefined(); s.design.revision++; expect(ready(10, a, s)).toBe(false);
  });
  it('rejects malformed trajectory data on reload', () => {
    const s = freshSave(), a = s.activities[4] = emptyActivity(); const t = distanceTrial(a, 'near-clear', 47, false, 'attract');
    t.input = [{ x: NaN, y: 0 }]; expect(validSave(s)).toBe(false);
  });
});
describe('save migration', () => {
  it('preserves completed evidence, certificate and in-progress positions without inventing new trials', () => {
    const legacy = freshSave(); legacy.version = 1; legacy.completed = Array.from({ length: 10 }, (_, i) => i + 1);
    legacy.evidence = Array.from({ length: 5 }, (_, stage) => ({ stage, date: 'old', activities: [], summary: ['이전 활동 기록'] }));
    Object.assign(legacy.final, { report: true, latch: 'S', ring: 'S', plate: 24, complete: true, date: '2026-10-15' });
    legacy.activities[4] = emptyActivity(); legacy.activities[4].points.magnet = { x: 42, y: 48 };
    const before = structuredClone(legacy), next = migrateSave(legacy)!;
    expect(next.version).toBe(2); expect(next.evidence).toEqual(before.evidence); expect(next.final).toEqual(before.final);
    expect(next.activities[4].points).toEqual(before.activities[4].points); expect(next.activities[4].trials).toEqual([]); expect(legacy).toEqual(before);
  });
  it('refuses unsupported versions without mutating them', () => {
    const input = { version: 99, data: 'keep' }; expect(migrateSave(input)).toBeNull(); expect(input.data).toBe('keep');
  });
});
describe('final repair', () => {
  it('never treats installation or replay alone as direct operation', () => {
    const s = freshSave(); const route = initializeFinal(s); route.installed = true; route.operated = true;
    expect(coreReady(s, true)).toBe(false); expect(route.segments).toEqual([]);
  });
  it.each(['box', 'remote'] as const)('finishes the basic %s route and refuses stale successful trials', template => {
    const s = freshSave(); Object.assign(s.design, { template, aligned: true, gap: 22 }); const r = initializeFinal(s); r.installed = true; r.operated = true;
    addTrial(r.attempt!, { key: 'use', activity: 10, conditions: { aligned: true, gap: 22 }, initialObjects: [], objects: [], input: [], outcome: 'success', template, designRevision: 0 });
    expect(coreReady(s, true)).toBe(true); s.design.revision++; expect(coreReady(s, true)).toBe(false);
  });
  it('rejects malformed nested final attempts before opening a saved repair', () => {
    const s = freshSave(), route = initializeFinal(s); route.attempt!.points.bad = { x: Infinity, y: 0 };
    expect(validSave(s)).toBe(false);
  });
});
