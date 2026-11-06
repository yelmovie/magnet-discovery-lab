import { describe, expect, it } from 'vitest';
import { emptyActivity, freshSave, migrateSave, ready, type Activity, type Save } from '../src/domain';
import { inquiryNext } from '../src/inquiry';
import { coaching } from '../src/coach';
import { autoplayResult } from '../src/experiment-autoplay';
import { mailboxParts, partKey } from '../src/mailbox-assembly';
import { missionReady } from '../src/mission-model';
import { addTrial, trialTitle, type Trial } from '../src/trial-records';
import { answerPrompt, currentPrompt, promptPending, recordReflection, watchChecks } from '../src/inquiry-prompts';
import { learningNotes, recordMode } from '../src/learning-notes';
import { discoveries } from '../src/inquiry-content';

const trial = (key: string, conditions: Trial['conditions'] = {}): Trial => ({ id: `1:${key}`, key, activity: 1, modelVersion: 1, conditions: { label: '시험', ...conditions }, initialObjects: [], objects: [], input: [], outcome: 'success', pinned: true });
function assembled(a: Activity = emptyActivity()) {
  Object.assign(a.values, { playVersion: 4, mechanicsVersion: 1, paceVersion: 1, inquiryVersion: 2, inquiryActivity: 1, inquiryPhase: 'experiment', assemblyVersion: 1, found0: true });
  for (const part of mailboxParts) a.values[partKey(part)] = true;
  a.trials = [trial('inspect0')];
  return a;
}
function latched(a: Activity) { a.values.latch0 = true; a.trials!.push(trial('latch0')); return a; }
const saveWith = (n: number, a: Activity): Save => { const s = freshSave(); s.activities[n] = a; return s; };

describe('우편함 예상과 관찰 비교', () => {
  it('조립을 마치기 전에는 묻지 않고, 조립이 끝나면 예상부터 묻는다', () => {
    const a = emptyActivity(); a.values.assemblyVersion = 1;
    expect(currentPrompt(1, a, saveWith(1, a))).toBeNull();
    const done = assembled();
    expect(currentPrompt(1, done, saveWith(1, done))).toMatchObject({ kind: 'predict', pending: true });
  });
  it('정답을 미리 알려주지 않고 두 예상을 같은 무게로 보여 준다', () => {
    const a = assembled(), prompt = currentPrompt(1, a, saveWith(1, a))!;
    expect(prompt.choices!.map(c => c.label)).toEqual(['붙을 것 같아', '안 붙을 것 같아']);
    expect(JSON.stringify(prompt)).not.toMatch(/정답|맞아|틀렸/);
  });
  it('예상을 고르면 닫을 때까지 더 묻지 않고, 닫은 뒤에는 실제 결과를 나란히 보여 준다', () => {
    const a = assembled(), s = saveWith(1, a);
    answerPrompt(1, a, s, 'apart');
    expect(a.values.predict).toBe('apart');
    expect(currentPrompt(1, a, s)).toBeNull();
    latched(a);
    expect(currentPrompt(1, a, s)).toMatchObject({ kind: 'compare', pending: true, predicted: '안 붙을 것 같아', observed: '자석과 철판이 붙었어' });
  });
  it('예상이 달라도 실패로 처리하지 않고 생각을 고친 것을 존중한다', () => {
    const a = latched(assembled()), s = saveWith(1, a);
    a.values.predict = 'apart';
    answerPrompt(1, a, s, 'different');
    expect(a.values.predictCompare).toBe('different');
    const prompt = currentPrompt(1, a, s)!;
    expect(prompt).toMatchObject({ kind: 'compare', pending: false });
    expect(prompt.message).toMatch(/생각/);
    expect(prompt.message).not.toMatch(/틀렸|실패/);
  });
  it('두 칸을 잘못 읽으면 저장하지 않고 다시 비교하게 한다', () => {
    const a = latched(assembled()), s = saveWith(1, a);
    a.values.predict = 'apart';
    answerPrompt(1, a, s, 'same');
    expect(a.values.predictCompare).toBeUndefined();
    expect(currentPrompt(1, a, s)).toMatchObject({ kind: 'compare', pending: true });
    expect(currentPrompt(1, a, s)!.message).toMatch(/두 칸/);
  });
  it('비교를 고르기 전까지 다음 버튼만 잠그고 완료 판정은 그대로 둔다', () => {
    const a = latched(assembled()), s = saveWith(1, a);
    a.values.predict = 'stick';
    expect(missionReady(1, a, s)).toBe(true);
    expect(ready(1, a, s)).toBe(true);
    expect(inquiryNext(1, a, s).enabled).toBe(false);
    answerPrompt(1, a, s, 'same');
    expect(inquiryNext(1, a, s)).toEqual({ label: '다음 탐구로', enabled: true });
  });
  it('이전 저장처럼 예상 없이 이미 닫은 우편함은 묻지도 막지도 않는다', () => {
    const a = latched(assembled()), s = saveWith(1, a);
    expect(currentPrompt(1, a, s)).toBeNull();
    expect(inquiryNext(1, a, s).enabled).toBe(true);
  });
  it('구형 우편함 활동에는 예상 질문을 붙이지 않는다', () => {
    const a = assembled(); delete a.values.assemblyVersion;
    expect(currentPrompt(1, a, saveWith(1, a))).toBeNull();
  });
  it('자꾸의 다음 행동 안내도 예상 선택을 먼저 가리킨다', () => {
    const a = assembled(), s = saveWith(1, a);
    expect(coaching(1, a, s).action).toMatch(/예상/);
  });
});

describe('자동재생과 직접 탐구 구분', () => {
  it('실험 기록에 직접 해봄과 자동으로 관찰함을 나눠 적고, 정보가 없는 이전 기록은 건드리지 않는다', () => {
    expect(trialTitle(trial('a', { manual: true }))).toBe('시험 · 직접 해봄');
    expect(trialTitle(trial('a', { autoplay: true }))).toBe('시험 · 자동으로 관찰함');
    expect(trialTitle(trial('a'))).toBe('시험');
  });
  it('활동의 기록 방식을 개수로 요약하고, 구분 정보가 없으면 비워 둔다', () => {
    const a = emptyActivity(); a.trials = [trial('a', { manual: true }), trial('b', { autoplay: true }), trial('c', { autoplay: true })];
    expect(recordMode([a])).toBe('직접 해봄 1 · 자동으로 관찰함 2');
    const old = emptyActivity(); old.trials = [trial('a')];
    expect(recordMode([old])).toBe('');
  });
  it('자동으로 관찰한 홀수 활동은 다음으로 가기 전에 본 결과를 한 번 고른다', () => {
    for (const n of [1, 3, 7]) expect(watchChecks[n]).toBeTruthy();
    const a = latched(assembled()), s = saveWith(1, a);
    a.values.predict = 'stick'; a.values.autoObserved = true;
    expect(currentPrompt(1, a, s)).toMatchObject({ kind: 'watch', pending: true });
    expect(inquiryNext(1, a, s).enabled).toBe(false);
    expect(autoplayResult(1, s)).toMatch(/골라/);
  });
  it('자동 관찰 뒤 처음 고른 답과 다시 고친 답을 나눠 남긴다', () => {
    const a = latched(assembled()), s = saveWith(1, a), check = watchChecks[1];
    a.values.predict = 'stick'; a.values.autoObserved = true;
    const wrong = (check.answer + 1) % check.choices.length;
    answerPrompt(1, a, s, String(wrong));
    expect(a.values.watchFirst).toBe(wrong);
    expect(currentPrompt(1, a, s)).toMatchObject({ kind: 'watch', pending: true, message: check.retry });
    answerPrompt(1, a, s, String(check.answer));
    expect(a.values.watchFirst).toBe(wrong);
    expect(a.values.watchChoice).toBe(check.answer);
    expect(currentPrompt(1, a, s)).toMatchObject({ kind: 'compare', pending: true });
  });
  it('자동재생 표시가 없는 이전 기록은 질문 때문에 막히지 않는다', () => {
    const a = emptyActivity(); Object.assign(a.values, { inquiryVersion: 2, inquiryActivity: 3, inquiryPhase: 'experiment' });
    a.trials = [trial('materials', { autoplay: true })];
    expect(currentPrompt(3, a, saveWith(3, a))).toBeNull();
  });
  it('짝수 활동은 뒤따르는 발견 정리가 같은 역할을 하므로 질문을 더하지 않는다', () => {
    for (const n of [2, 4, 6, 8]) {
      const a = emptyActivity(); a.values.autoObserved = true;
      expect(promptPending(n, a, saveWith(n, a))).toBe(false);
    }
  });
});

describe('학습 증거', () => {
  it('발견 정리의 최초 선택은 다시 골라도 덮어쓰지 않는다', () => {
    const a = emptyActivity(), d = discoveries[0];
    recordReflection(a, d, 1); recordReflection(a, d, 2); recordReflection(a, d, 0);
    expect(a.values.reflectionFirst).toBe(1);
    expect(a.records.find(r => r.key === 'inquiry-first-choice')?.result).toBe(d.choices[1]);
  });
  it('처음부터 맞으면 고친 기록을 만들지 않는다', () => {
    const a = emptyActivity(), d = discoveries[0];
    recordReflection(a, d, d.answer);
    expect(a.records.some(r => r.key === 'inquiry-first-choice')).toBe(false);
  });
  it('최초 선택과 고친 선택을 구분해 짧게 보여 준다', () => {
    const a = emptyActivity(), d = discoveries[0];
    recordReflection(a, d, 1);
    a.records.push({ key: 'inquiry-discovery', label: '실험으로 발견한 규칙', result: d.choices[0] });
    expect(learningNotes([a]).map(row => [row.label, row.value])).toEqual([['처음 고른 근거', d.choices[1]], ['다시 고친 근거', d.choices[0]]]);
  });
  it('바로 고른 근거는 처음과 고친 답으로 나누지 않는다', () => {
    const a = emptyActivity();
    a.records.push({ key: 'inquiry-discovery', label: '실험으로 발견한 규칙', result: '가까우면 당겨' });
    expect(learningNotes([a]).map(row => row.label)).toEqual(['고른 근거']);
  });
  it('예상과 비교 기록을 순서대로 모으고, 이전 기록에는 아무것도 지어내지 않는다', () => {
    const a = assembled(), s = saveWith(1, a);
    answerPrompt(1, a, s, 'stick'); latched(a); answerPrompt(1, a, s, 'same');
    expect(learningNotes([a]).map(row => row.label)).toEqual(['실험 전 내 예상', '실제 결과', '예상과 비교']);
    const old = emptyActivity(); old.records.push({ key: 'found0', label: '우편함 부품 조립', result: '끼웠어' });
    expect(learningNotes([old])).toEqual([]);
  });
});

describe('저장 호환', () => {
  it('새 값이 들어간 활동도, 없는 이전 활동도 저장 검증을 통과한다', () => {
    const s = freshSave(), a = latched(assembled());
    a.values.predict = 'stick'; a.values.predictCompare = 'same'; a.values.reflectionFirst = 1;
    addTrial(a, { key: 'x', activity: 1, conditions: { label: '시험', manual: true }, initialObjects: [], objects: [], input: [], outcome: 'success' });
    s.activities[1] = a; s.activities[2] = emptyActivity();
    const migrated = migrateSave(structuredClone(s))!;
    expect(migrated.activities[1].values.predict).toBe('stick');
    expect(migrated.activities[2].values).toEqual({});
  });
});
