import { describe, expect, it } from 'vitest';
import { emptyActivity, freshSave, migrateSave, ready, type Save } from '../src/domain';
import { buddyFeedback, emptyIdea, ideaChecks, ideaReady, usesIdeaLab, validIdea, type Idea } from '../src/idea-model';
import { ideaGate, ideaView } from '../src/idea-lab';
import { finalQuestions } from '../src/final-review';
import { restorationView } from '../src/restoration';

const magnet = (uid: number, x: number, pole: 'N' | 'S' = 'N') => ({ uid, id: 'magnet', x, y: 40, pole });
const iron = (uid: number, x: number) => ({ uid, id: 'iron', x, y: 40 });
const arrow: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 10, y: 10 }, { x: 40, y: 10 }];
const idea = (over: Partial<Idea> = {}): Idea => ({ ...emptyIdea(), problem: 'eraser', properties: ['iron'], stickers: [magnet(1, 40), iron(2, 60)], arrows: [arrow], ...over });

describe('idea workshop science check', () => {
  it('passes a magnet that can reach the iron it depends on', () => expect(ideaChecks(idea())).toEqual([]));
  it('asks for the part the chosen property needs', () => {
    expect(ideaChecks(idea({ stickers: [magnet(1, 40)] }))[0]).toContain('철 스티커');
    expect(ideaChecks(idea({ stickers: [] }))).toEqual(['자석 스티커를 하나 이상 붙여 줘.']);
    expect(ideaChecks(idea({ properties: ['through'] }))[0]).toContain('얇은 판');
  });
  it('rejects parts too far apart for the force to reach', () => expect(ideaChecks(idea({ stickers: [magnet(1, 10), iron(2, 150)] }))[0]).toContain('너무 멀어'));
  it('uses the facing poles for magnet pairs', () => {
    const pair = (a: 'N' | 'S', b: 'N' | 'S') => [magnet(1, 40, a), magnet(2, 60, b)];
    expect(ideaChecks(idea({ properties: ['opposite'], stickers: pair('N', 'N') }))[0]).toContain('달라야');
    expect(ideaChecks(idea({ properties: ['opposite'], stickers: pair('N', 'S') }))).toEqual([]);
    expect(ideaChecks(idea({ properties: ['same'], stickers: pair('N', 'S') }))[0]).toContain('같아야');
    expect(ideaChecks(idea({ properties: ['same'], stickers: pair('S', 'S') }))).toEqual([]);
  });
  it('needs a force arrow', () => expect(ideaChecks(idea({ arrows: [] }))[0]).toContain('화살표'));
});

describe('idea workshop completion', () => {
  it('finishes the first activity only after the check passes', () => {
    expect(ideaReady(9, idea())).toBe(false);
    expect(ideaReady(9, idea({ checked: true }))).toBe(true);
    expect(ideaReady(9, idea({ checked: true, arrows: [] }))).toBe(false);
    expect(ideaReady(9, idea({ checked: true, problem: 'custom', custom: '짧' }))).toBe(false);
  });
  it('accepts a written introduction, so a learner without a microphone is never stuck', () => {
    const shared = { name: '착착 집', shown: true, feedback: buddyFeedback(idea()), chosen: 0, change: '자석을 옮겼어' };
    expect(ideaReady(10, idea({ ...shared, pitch: '지우개가 칠판에 붙어서 안 떨어져요' }))).toBe(true);
    expect(ideaReady(10, idea({ ...shared, voice: true }))).toBe(true);
    expect(ideaReady(10, idea(shared))).toBe(false);
  });
  it('explains what is missing at each step', () => {
    expect(ideaGate(9, 0, emptyIdea())).toContain('불편');
    expect(ideaGate(10, 0, idea())).toContain('이름');
    expect(ideaGate(10, 3, idea({ feedback: buddyFeedback(idea()) }))).toContain('의견');
    expect(ideaGate(9, 3, idea())).toBe('');
  });
  it('routes ready() to the idea only for activities in the new workshop', () => {
    const s = freshSave(), a = emptyActivity(); s.idea = idea({ checked: true });
    expect(ready(9, a, s)).toBe(false);
    a.values.ideaVersion = 1;
    expect(ready(9, a, s)).toBe(true);
  });
});

describe('idea workshop records', () => {
  it('keeps the idea and the revision as separate evidence lines', () => {
    const s = freshSave(), first = emptyActivity(), second = emptyActivity();
    s.idea = idea({ checked: true, name: '착착 집', pitch: '지우개가 칠판에 붙어서 안 떨어져요', shown: true, feedback: buddyFeedback(idea()), chosen: 0, change: '자석을 옮겼어' });
    ideaView(9, first, s); ideaView(10, second, s);
    expect(first.records.map(r => r.key)).toEqual(['idea']);
    expect(second.records.map(r => r.key)).toEqual(['share']);
    expect(second.records[0].result).toContain('자석을 옮겼어');
  });
  it('shows the invention card in the plaza notebook', () => {
    const s = freshSave(), a = emptyActivity(); a.values.ideaVersion = 1;
    s.activities[10] = a; s.idea = idea({ name: '착착 집' });
    s.final.review = { version: 1, page: 4, answers: finalQuestions.map(q => q.answer) };
    expect(restorationView(s, true).html).toContain('idea-card');
  });
});

describe('existing saves', () => {
  const save = (over: Partial<Save>) => ({ ...freshSave(), ...over });
  it('lets a learner between the old design and use tests finish them', () => {
    expect(usesIdeaLab(save({ completed: [1, 2, 3, 4, 5, 6, 7, 8, 9] }), 10)).toBe(false);
    expect(usesIdeaLab(save({ completed: [1, 2, 3, 4, 5, 6, 7, 8] }), 9)).toBe(true);
    expect(usesIdeaLab(save({ completed: [1, 2, 3, 4, 5, 6, 7, 8, 9], idea: emptyIdea() }), 10)).toBe(true);
    expect(usesIdeaLab(save({}), 8)).toBe(false);
  });
  it('drops a damaged idea without losing the rest of the save', () => {
    const s = freshSave(); (s as unknown as { idea: unknown }).idea = { problem: 1 };
    const migrated = migrateSave(s)!;
    expect(migrated.idea).toBeUndefined();
    expect(validIdea(idea())).toBe(true);
  });
});
