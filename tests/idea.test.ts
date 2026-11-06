import { describe, expect, it } from 'vitest';
import { emptyActivity, freshSave, migrateSave, ready, type Save } from '../src/domain';
import { buddyFeedback, emptyIdea, ideaReady, usesIdeaLab, validIdea, type Idea } from '../src/idea-model';
import { ideaGate, ideaView } from '../src/idea-lab';
import { finalQuestions } from '../src/final-review';
import { restorationView } from '../src/restoration';

const magnet = (uid: number, x: number, pole: 'N' | 'S' = 'N') => ({ uid, id: 'magnet', x, y: 40, pole });
const iron = (uid: number, x: number) => ({ uid, id: 'iron', x, y: 40 });
const arrow: [{ x: number; y: number }, { x: number; y: number }] = [{ x: 10, y: 10 }, { x: 40, y: 10 }];
const idea = (over: Partial<Idea> = {}): Idea => ({ ...emptyIdea(), problem: 'eraser', properties: ['iron'], stickers: [magnet(1, 40), iron(2, 60)], arrows: [arrow], ...over });

describe('idea workshop completion', () => {
  it('lets a learner reach the presentation without a sketch or written explanation', () => {
    expect(ideaReady(9, idea({ properties: [] }))).toBe(false);
    expect(ideaReady(9, idea({ stickers: [], arrows: [] }))).toBe(true);
    expect(ideaReady(9, idea({ problem: 'custom', custom: '짧' }))).toBe(false);
  });
  it('completes with a written introduction and display, without requiring a friend’s comment', () => {
    const shared = { name: '착착 집', shown: true };
    expect(ideaReady(10, idea({ ...shared, pitch: '지우개가 칠판에 붙어서 안 떨어져요' }))).toBe(true);
    expect(ideaReady(10, idea({ ...shared, voice: true }))).toBe(true);
    expect(ideaReady(10, idea(shared))).toBe(false);
  });
  it('explains what is missing at each step', () => {
    expect(ideaGate(9, 0, emptyIdea())).toContain('불편');
    expect(ideaGate(10, 0, idea())).toContain('이름');
    expect(ideaGate(10, 2, idea({ name: '착착 집', pitch: '지우개가 칠판에 붙어서 안 떨어져요', shown: true }))).toBe('');
    expect(ideaGate(9, 2, idea())).toBe('');
  });
  it('routes ready() to the idea only for activities in the new workshop', () => {
    const s = freshSave(), a = emptyActivity(); s.idea = idea({ pitch: '지우개가 칠판에 붙어서 안 떨어져요' });
    expect(ready(9, a, s)).toBe(false);
    a.values.ideaVersion = 1;
    expect(ready(9, a, s)).toBe(true);
  });
});

describe('idea workshop records', () => {
  it('keeps the idea explanation and presentation as separate evidence', () => {
    const s = freshSave(), first = emptyActivity(), second = emptyActivity();
    s.idea = idea({ step9: 3, step10: 3, name: '착착 집', pitch: '지우개가 칠판에 붙어서 안 떨어져요', shown: true, feedback: buddyFeedback(idea()) });
    ideaView(9, first, s); ideaView(10, second, s);
    expect(first.records.map(r => r.key)).toEqual(['idea']);
    expect(second.records.map(r => r.key)).toEqual(['share']);
    expect(first.records[0].result).toContain('칠판에 붙어서');
    expect(second.records[0].result).toBe('착착 집');
    expect(s.idea.step9).toBe(2);
    expect(s.idea.step10).toBe(2);
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
