import { describe, expect, it } from 'vitest';
import { emptyActivity, freshSave } from '../src/domain';
import { keyRescueText, missionGuide } from '../src/mission-content';
import { discoveryFor, discoveries } from '../src/inquiry-content';
import { reviewQuestion, finalQuestions } from '../src/final-review';
import { learningVisual } from '../src/learning-visuals';
import { scienceNotes, emphasizeScience, scienceNoteMarkup } from '../src/science-guidance';

describe('실제로 한 활동과 과학 안내의 연결', () => {
  it('클립을 열쇠로 바꿀 때 문장 조사도 함께 맞춘다', () => {
    expect(keyRescueText('철 클립을 놓자 클립이 움직였어. 클립은 철이야.'))
      .toBe('철 열쇠를 놓자 철 열쇠가 움직였어. 철 열쇠는 철이야.');
    const a = emptyActivity(); a.values.puzzleRevision = 2;
    expect(discoveryFor(4, a).question).toContain('철 열쇠를');
    expect(missionGuide(4, a)).not.toMatch(/열쇠[을이은]/);
  });
  it('철판까지 고치는 우편함을 자석만 바꾼 실험이라고 설명하지 않는다', () => {
    const a = emptyActivity(); a.values.puzzleVersion = 1;
    expect(missionGuide(2, a)).toContain('철판 자리를');
    expect(scienceNoteMarkup(2, a)).toContain('철판 자리를');
    expect(scienceNoteMarkup(2, a)).not.toContain('자석만 넣거나 빼');
    expect(scienceNoteMarkup(2)).toContain('자석만 넣거나 빼');
  });
  it('열쇠 퍼즐과 이전 클립 실험의 안내·문제를 각각 맞춘다', () => {
    const a = emptyActivity();
    expect(missionGuide(4, a)).toContain('클립');
    a.values.puzzleRevision = 2;
    expect(missionGuide(4, a)).toContain('철 열쇠');
    expect(learningVisual(4, 'box', a).move).toContain('철 열쇠');
    expect(discoveryFor(4, a).question).toContain('철 열쇠');
    expect(discoveryFor(4, a).answer).toBe(discoveries[1].answer);
    expect(discoveries[1].question).toContain('클립');
  });
  it('광장도 보관된 열쇠 실험을 따라가되 저장한 정답 번호를 유지한다', () => {
    const s = freshSave();
    expect(reviewQuestion(s, 1).tab).toBe('철 클립');
    const a = emptyActivity(); a.values.puzzleRevision = 2;
    s.evidence.push({ stage: 1, date: s.updated, activities: [emptyActivity(), a], summary: [] });
    expect(reviewQuestion(s, 1).tab).toBe('철 열쇠');
    expect(reviewQuestion(s, 1).answer).toBe(finalQuestions[1].answer);
  });
  it('새 공방은 설계·발표로 안내하고 이전 장치 시험은 보존한다', () => {
    const a = emptyActivity();
    expect(missionGuide(10, a)).toContain('사용 시험');
    a.values.ideaVersion = 1;
    expect(missionGuide(10, a)).toContain('소개');
    expect(missionGuide(10, a)).not.toContain('사용 시험');
  });
  it('열 활동 모두 짧은 핵심과 관찰 조건을 제공하고 HTML을 이스케이프한다', () => {
    expect(scienceNotes).toHaveLength(10);
    expect(scienceNotes.every(note => note.rule && note.check)).toBe(true);
    expect(emphasizeScience('같은 극은 밀어내. <img onerror="x">')).toContain('<strong');
    expect(emphasizeScience('<img onerror="x">')).not.toContain('<img');
  });
});
