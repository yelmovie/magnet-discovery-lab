import { record, type Activity, type Save } from './domain';
import type { Context } from './activity-types';
import { mailboxAssembled } from './mailbox-assembly';
import { missionReady } from './mission-model';
import { playEffect } from './game-audio';
import './inquiry-prompts.css';

type Choice = { id: string; label: string };
export type WatchCheck = { question: string; choices: string[]; answer: number; retry: string; finding: string };
export type Prompt = {
  kind: 'predict' | 'watch' | 'compare'; pending: boolean; question: string; action: string;
  choices?: Choice[]; predicted?: string; observed?: string; message?: string;
};

const predictions: Choice[] = [{ id: 'stick', label: '붙을 것 같아' }, { id: 'apart', label: '안 붙을 것 같아' }];
const comparisons: Choice[] = [{ id: 'same', label: '처음 예상과 같았어' }, { id: 'different', label: '처음 예상과 달랐어' }];
export const mailboxResult = '자석과 철판이 붙었어';

/** After watching, the learner still answers from what they saw. Even activities use their discovery question instead. */
export const watchChecks: Record<number, WatchCheck> = {
  1: { question: '덮개를 닫자 무슨 일이 있었어?', choices: ['덮개의 자석이 몸체의 철판에 붙었어', '자석과 철판이 서로 밀어냈어', '덮개가 다시 저절로 열렸어'], answer: 0, retry: '설정의 연구 가방을 열어 닫히는 장면을 살펴봐. 오른쪽 안쪽 그림에서 두 부품이 어떻게 됐지?', finding: '봤구나! 자석이 철판을 붙잡아서 덮개가 닫혀 있었어.' },
  3: { question: '자석을 가까이 댔을 때 따라온 물건은?', choices: ['반짝이는 물건 전부', '철로 된 물건', '알루미늄과 플라스틱'], answer: 1, retry: '설정의 연구 가방을 열어 수리함에 들어간 물건을 살펴봐. 알루미늄은 어디로 갔지?', finding: '봤구나! 철로 된 물건은 따라왔고, 반짝여도 알루미늄은 따라오지 않았어.' },
  7: { question: '물속 패드는 어떻게 얼룩을 닦았어?', choices: ['물이 흘러서 패드를 밀었어', '손이 유리를 지나 패드를 잡았어', '유리 밖 자석을 따라 패드가 움직였어'], answer: 2, retry: '설정의 연구 가방을 열어 손잡이와 패드가 함께 움직이는 장면을 살펴봐.', finding: '봤구나! 유리를 사이에 두고 밖의 자석이 안쪽 패드를 끌고 다녔어.' },
};

const mailboxPrompts = (a: Activity) => a.values.assemblyVersion === 1 && mailboxAssembled(a);
const label = (choices: Choice[], id: unknown) => choices.find(choice => choice.id === id)?.label ?? '';
const comparisonFor = (a: Activity) => a.values.predict === 'stick' ? 'same' : 'different';

function comparePrompt(a: Activity): Prompt {
  const answered = a.values.predictCompare !== undefined;
  const message = answered
    ? a.values.predictCompare === 'same' ? '예상대로 붙었어. 내 생각을 실험으로 확인했어.' : '생각이 달라졌어! 결과를 보고 생각을 고치는 게 탐구야.'
    : a.values.predictCompareHint === true ? '두 칸의 글을 다시 비교해 봐.' : undefined;
  return { kind: 'compare', pending: !answered, question: '처음 생각과 비교해 봐', action: '처음 예상과 실제 결과를 비교해 줘', predicted: label(predictions, a.values.predict), observed: mailboxResult, choices: answered ? undefined : comparisons, message };
}

/** The one small choice this activity is waiting for, if any. Completion rules stay in mission-model. */
export function currentPrompt(n: number, a: Activity, s: Save): Prompt | null {
  if(n===2&&a.values.mailboxQuickRepair===true)return null;
  const check = watchChecks[n];
  if (n === 1 && mailboxPrompts(a) && a.values.found0 === true && a.values.latch0 !== true && a.values.predict === undefined) {
    return { kind: 'predict', pending: true, question: '덮개를 닫으면 자석과 철판은 어떻게 될까?', action: '덮개를 닫기 전에 내 예상을 골라 줘', choices: predictions, message: '틀려도 괜찮아. 네 생각을 골라 봐.' };
  }
  if (check && a.values.autoObserved === true && a.values.watchChoice === undefined && missionReady(n, a, s)) {
    const retry = a.values.watchFirst !== undefined;
    return { kind: 'watch', pending: true, question: check.question, action: '방금 본 결과를 하나 골라 줘', choices: check.choices.map((text, index) => ({ id: String(index), label: text })), message: retry ? check.retry : undefined };
  }
  if (n === 1 && a.values.latch0 === true && a.values.predict !== undefined) return comparePrompt(a);
  return null;
}
export const promptPending = (n: number, a: Activity, s: Save) => currentPrompt(n, a, s)?.pending === true;

export function answerPrompt(n: number, a: Activity, s: Save, value: string): void {
  const prompt = currentPrompt(n, a, s);
  if (!prompt?.pending) return;
  if (prompt.kind === 'predict') {
    a.values.predict = value;
    record(a, { key: 'inquiry-prediction', label: '실험 전 내 예상', result: label(predictions, value) });
  } else if (prompt.kind === 'watch') {
    const check = watchChecks[n], choice = Number(value);
    if (a.values.watchFirst === undefined) {
      a.values.watchFirst = choice;
      if (choice !== check.answer) record(a, { key: 'inquiry-watch-first', label: '자동 관찰 후 처음 고른 결과', result: check.choices[choice] });
    }
    if (choice === check.answer) {
      a.values.watchChoice = choice;
      record(a, { key: 'inquiry-watch', label: '자동 관찰 후 고른 결과', result: check.choices[choice] });
    }
  } else if (value === comparisonFor(a)) {
    a.values.predictCompare = value;
    delete a.values.predictCompareHint;
    record(a, { key: 'inquiry-observed', label: '실제 결과', result: mailboxResult });
    record(a, { key: 'inquiry-compare', label: '예상과 비교', result: label(comparisons, value) });
  } else a.values.predictCompareHint = true;
}

/** Keeps the learner's first reason; `reflection` itself keeps holding the latest choice. */
export function recordReflection(a: Activity, d: { choices: string[]; answer: number }, selected: number): void {
  if (a.values.reflectionFirst !== undefined) return;
  a.values.reflectionFirst = selected;
  if (selected !== d.answer) record(a, { key: 'inquiry-first-choice', label: '처음 고른 답', result: d.choices[selected] });
}

const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function promptMarkup(p: Prompt): string {
  const options = p.choices?.length ? `<div class="thinking-options" role="group" aria-label="${esc(p.question)}">${p.choices.map(choice => `<button type="button" class="thinking-option" data-prompt-choice="${choice.id}">${esc(choice.label)}</button>`).join('')}</div>` : '';
  const pair = p.kind === 'compare' ? `<dl class="thinking-pair"><div><dt>처음 예상</dt><dd>${esc(p.predicted!)}</dd></div><div><dt>실제 결과</dt><dd>${esc(p.observed!)}</dd></div></dl>` : '';
  const note = p.message ? `<p class="thinking-note">${esc(p.message)}</p>` : '';
  // The learner answers before an automatic demonstration may close the lid.
  return `<section class="thinking-card" data-prompt-kind="${p.kind}" ${p.kind === 'predict' ? 'data-awaits-learner' : ''}><h2>${esc(p.question)}</h2>${pair}${options}${note}</section>`;
}

/** A small card on the bench. It follows the same update signal as the coach, so experiments keep their own rendering. */
export function bindInquiryPrompts(c: Context, n: number, redraw: () => void): () => void {
  const host = c.root.querySelector<HTMLElement>('.inquiry-prompt-host'), shell = c.root.closest<HTMLElement>('.quest-activity');
  if (!host || !shell) return () => {};
  const events = new AbortController();
  let shown = '', focusNext = false;
  const sync = () => {
    const prompt = currentPrompt(n, c.a, c.s), html = prompt ? promptMarkup(prompt) : '', appeared = !shown && !!html;
    if (html !== shown) {
      shown = html; host.innerHTML = html;
      host.closest('.mission-board')?.classList.toggle('has-thinking-card', !!prompt);
    }
    if (focusNext || appeared && prompt?.pending && document.activeElement === document.body) {
      focusNext = false;
      const target = host.querySelector<HTMLElement>('button') ?? c.root.querySelector<HTMLElement>('[data-mission="close-lid"]:not(:disabled):not([hidden])') ?? shell.querySelector<HTMLElement>('[data-action="complete"]:not(:disabled)');
      target?.focus({ preventScroll: true });
    }
  };
  host.addEventListener('click', event => {
    const choice = (event.target as Element).closest<HTMLElement>('[data-prompt-choice]');
    if (!choice) return;
    answerPrompt(n, c.a, c.s, choice.dataset.promptChoice!);
    playEffect('click', c.s.settings);
    focusNext = true;
    c.touch(); redraw(); c.meta();
  }, { signal: events.signal });
  shell.addEventListener('coach-update', sync, { signal: events.signal });
  sync();
  return () => events.abort();
}
