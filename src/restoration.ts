import { emptyActivity, finalRepairPassed, type Save } from './domain';
import { initializeFinal } from './final-mission';
import { currentInventionTrial } from './trial-records';
import { icon, mascot } from './art';
import { experimentScenes } from './experiment-scenes';
import { finalQuestions, initializeReview, reviewPassed } from './final-review';
import { playEffect } from './game-audio';
import './final-notebook.css';
import type { View } from './activity-types';

/** Install the same design already tested by the learner without repeating its use test. */
export function installRestoration(s:Save):void {
  const r=initializeFinal(s), verified=s.activities[10];
  r.installed=true;r.revision=s.design.revision;r.template=s.design.template;r.operated=false;r.attempt=emptyActivity();
  if(r.mode==='basic'&&r.repair==='invention'&&s.completed.includes(10)&&verified?.values.paceVersion===1&&currentInventionTrial(verified,s.design.template,s.design.revision)){
    // Preserve the original physical trial, including input path and design revision.
    r.attempt=structuredClone(verified);
    r.operated=finalRepairPassed(s);
    if(r.operated&&!r.segments.includes('invention'))r.segments.push('invention');
  }
}

function recordPhotos(s:Save,stage:number) {
  const first=stage*2+1, evidence=s.evidence.find(e=>e.stage===stage);
  const activities={...s.activities};
  evidence?.activities.forEach((activity,index)=>{if(index<2)activities[first+index]=activity;});
  return experimentScenes(first,{...s,activities});
}

/** The plaza is a short conclusion to the completed experiments, never another operation trial. */
export function restorationView(s:Save,preview=false):View {
  // Old certificates remain earned; opening this summary must not add unanswered new work to their save.
  const legacyCompleted=s.final.complete&&!s.final.review;
  const review=legacyCompleted?{version:1 as const,page:5,answers:finalQuestions.map(()=>-1)}:initializeReview(s), done=reviewPassed(review);
  const firstPending=legacyCompleted?-1:finalQuestions.findIndex((q,index)=>review.answers[index]!==q.answer);
  if(!preview&&review.page>(firstPending<0?finalQuestions.length:firstPending))review.page=firstPending;
  const summary=review.page===finalQuestions.length, q=finalQuestions[Math.min(review.page,4)];
  const selected=review.answers[review.page], correct=selected===q.answer, answered=selected>=0;
  const count=finalQuestions.filter((item,index)=>review.answers[index]===item.answer).length;
  const tabs=finalQuestions.map((item,index)=>`<button type="button" class="final-bookmark" data-review-page="${index}" aria-current="${!summary&&review.page===index?'step':'false'}" ${!preview&&index>firstPending&&firstPending>=0?'disabled':''}><span aria-hidden="true">${review.answers[index]===item.answer?'✓':index+1}</span>${item.tab}</button>`).join('');
  const feedback=correct?`<strong>맞아! 수첩에 적어 두자.</strong><span>${q.reason}</span>`:answered?`<strong>사진을 보고 한 번 더 골라 봐.</strong><span>${q.retry}</span>`:'<span>내가 본 움직임과 맞는 답을 찾아봐.</span>';
  const sheet=summary?`
    <div class="final-review-summary"><span class="final-note-tag">${legacyCompleted?'이전 탐험 수료 기록':done?'다섯 발견 완성':'교사용 미리보기'}</span><h1 tabindex="-1" data-review-heading>내 손으로 찾은 자석의 비밀</h1>
    <ul>${finalQuestions.map((item,index)=>`<li><img src="/assets/quest/resident-${index+1}.webp" alt=""><div><b>${item.tab}</b><p>${item.discovery}</p></div><span aria-label="${legacyCompleted?'이전 탐험의 발견':review.answers[index]===item.answer?'직접 정리 완료':'아직 선택하지 않음'}">${legacyCompleted?'★':review.answers[index]===item.answer?'✓':'·'}</span></li>`).join('')}</ul>
    <footer>${legacyCompleted?'<button type="button" class="btn" data-action="city">도시로 돌아가기</button><button type="button" class="btn primary" data-action="certificate">내 수료증 보기</button>':`<button type="button" class="btn" data-review-page="0">수첩 다시 보기</button><button type="button" class="btn primary" data-restoration="finish" ${!done&&!preview?'disabled':''}>${preview?'축제 미리보기':'도시 축제 열기'} ${icon('spark',22)}</button>`}</footer></div>`:`
    <div class="final-review-pages"><aside class="final-experiment-note" aria-label="내가 했던 실험 기록"><span class="final-note-tag">내 실험 ${review.page+1}</span><div class="final-note-photos">${recordPhotos(s,review.page)}</div><p class="final-hand-note">${q.note}</p><div class="final-pencil-rule" data-written="${correct}">${correct?q.discovery:'사진 속 움직임을 살펴봐.'}</div></aside>
    <section class="final-question" aria-labelledby="final-question-title"><span class="final-question-label">정리 문제 ${review.page+1} / 5</span><h1 id="final-question-title" tabindex="-1" data-review-heading>${q.question}</h1>
    <p class="final-answer-instruction">답 하나를 골라 줘</p><div class="final-answer-options" role="group" aria-label="정리 문제의 답">${q.choices.map((choice,index)=>`<button type="button" data-review-answer="${index}" aria-pressed="${selected===index}" class="final-answer${selected===index?correct?' is-correct':' is-retry':''}" ${correct?'disabled':''}><span>${selected===index&&correct?'✓':index+1}</span>${choice}</button>`).join('')}</div>
    <div class="final-answer-feedback" role="status" aria-live="polite" data-result="${correct?'correct':answered?'retry':'waiting'}">${feedback}</div>
    <footer><button type="button" class="btn" data-review-page="${Math.max(0,review.page-1)}" ${review.page===0?'disabled':''}>이전 기록</button><button type="button" class="btn primary" data-review-next ${!correct&&!preview?'disabled':''}>${review.page===4?'수첩 완성하기':'다음 기록'} ${icon('arrow',20)}</button></footer></section></div>`;
  return {
    html:`<section class="final-review"><div class="final-notebook"><div class="final-clipboard-clip" aria-hidden="true"></div><header class="final-notebook-heading"><div><span>중앙 광장 · 발견 정리</span><strong>나의 자석 탐험 수첩</strong></div><b>${legacyCompleted?'수료 완료':`${count} / 5`}</b></header>${legacyCompleted?'':`<nav class="final-bookmarks" aria-label="건물별 실험 기록">${tabs}</nav>`}${sheet}<div class="final-note-host" aria-hidden="true">${mascot('mili',142,2)}</div></div></section>`,
    bind(c){
      const events=new AbortController(),signal=events.signal;
      const refresh=(focus=false)=>{c.touch();c.refresh();if(focus&&typeof document!=='undefined')document.querySelector<HTMLElement>('#final-root [data-review-heading]')?.focus({preventScroll:true});};
      c.root.querySelectorAll<HTMLButtonElement>('[data-review-answer]').forEach(button=>button.addEventListener('click',()=>{
        if(summary||review.answers[review.page]===q.answer)return;
        const answer=Number(button.dataset.reviewAnswer);
        if(!Number.isInteger(answer)||answer<0||answer>=q.choices.length)return;
        review.answers[review.page]=answer;playEffect(answer===q.answer?'success':'compare',s.settings);refresh();
      },{signal}));
      c.root.querySelectorAll<HTMLButtonElement>('[data-review-page]').forEach(button=>button.addEventListener('click',()=>{
        const page=Number(button.dataset.reviewPage);
        if(!Number.isInteger(page)||page<0||page>=5||!preview&&firstPending>=0&&page>firstPending)return;
        review.page=page;refresh(true);
      },{signal}));
      c.root.querySelector('[data-review-next]')?.addEventListener('click',()=>{if(preview||review.answers[review.page]===q.answer){review.page++;refresh(true);}},{signal});
      c.root.querySelector('[data-restoration="finish"]')?.addEventListener('click',()=>{if(preview||reviewPassed(review))c.root.dispatchEvent(new CustomEvent('activate-final',{bubbles:true}));},{signal});
      return ()=>events.abort();
    },
  };
}
