import './concept-focus.css';
import {bindConceptFocus,emphasizeConcept} from './concept-focus.js';
export const conceptCaptions: string[][] = [["덮개를 열면 빨강·파랑 자석이 함께 올라가. 몸체의 철판은 제자리에 있어.", "덮개를 내리면 자석과 철판이 맞닿아 덮개를 붙잡아.", "같은 세기로 흔들어 보니, 이 우편함은 자석을 뺀 쪽만 열렸어."], ["철 클립과 철못은 자석에 붙었어. 알루미늄 포일과 나무는 그대로야.", "자석을 가까이 가져가자, 닿기 전부터 철 클립이 움직여.", "같은 자리에서 얇은 종이만 넣어 봐. 클립은 종이 앞까지 끌려와."], ["S극과 S극이 마주 봐. 두 자석이 서로 밀어내며 멀어져.", "S극과 N극이 마주 봐. 두 자석이 서로 끌어당겨 붙어.", "막대에 끼운 윗고리를 놓아 봐. 마주 보는 면의 극에 따라 뜨거나 붙어."], ["손잡이를 내리면 물속 패드도 내려가. 두 자석이 유리 너머로 서로 당겨.", "앞에서 다른 극을 마주 대면 수레가 끌려와. 자석끼리 닿기 전에도 움직여.", "뒤에서 같은 극을 마주 대면 수레가 밀려나. 이번에도 오른쪽으로 가."], ["덮개를 닫고 흔드니 다시 열렸어. 자석이 철판에서 멀리 빗나가 있어.", "철판의 자리를 고쳐 봐. 이제 덮개를 닫으면 자석과 철판이 만나.", "편지를 넣고, 책을 넣고 다시 시험했어. 두 번 다 덮개가 잘 닫혀 있어."]];
const conceptTerms = [['자석','철판'],['철 클립','닿기 전','종이'],['S극','N극','밀어','끌어당겨'],['유리','다른 극','같은 극'],['자석','철판','시험']];
const focusLabels = [['자석과 철판','서로 붙잡기','같은 조건 비교'],['붙는 물질','닿기 전의 힘','종이 너머의 힘'],['같은 극 · 밀기','다른 극 · 당기기','마주 보는 극'],['유리 너머','앞에서 당기기','뒤에서 밀기'],['문제 찾기','자리 고치기','다시 시험']];

export const concepts = [
  { title: '자석이 덮개를 붙잡는 까닭', summary: '덮개 안쪽 자석은 덮개와 함께 움직이고 몸체의 철판은 제자리에 있어. 닫으면 둘이 만나 덮개를 붙잡아.', question: '우편함을 닫을 때 어떤 두 부품이 만나니?' },
  { title: '닿지 않아도 작용하는 힘', summary: '같은 자리에서 얇은 종이만 끼우고 비교해 봐. 자석은 종이 너머의 철 클립도 당겨. 클립은 종이 앞에서 멈춰.', question: '종이가 사이에 있는데도 클립이 움직인 까닭은 뭘까?' },
  { title: '마주 보는 극이 바꾸는 움직임', summary: '아랫고리의 윗면과 윗고리의 아랫면을 봐. 마주 보는 극이 같으면 서로 밀어내고, 다르면 서로 당겨.', question: '아랫고리 윗면이 N극이라면, 윗고리의 어느 극을 아래로 두어야 뜰까?' },
  { title: '유리 밖에서도 조종할 수 있어', summary: '유리 양쪽의 자석이 서로 당겨서 물속 패드가 손잡이를 따라와. 수레는 자석끼리 닿기 전에도 앞에서 당기거나 뒤에서 밀 수 있어.', question: '수레를 오른쪽으로 보내려면 조종 자석을 어디에, 어떤 극이 마주 보게 둘까?' },
  { title: '발명은 시험하고 고치는 과정', summary: '덮개 자석과 철판이 같은 자리에 만나도록 고쳤어. 편지와 책을 차례로 넣고 덮개가 잘 닫혀 있는지 시험했어.', question: '네 발명품은 어떤 점을 고쳤고, 잘 작동하는지 어떻게 확인했니?' },
];

export function conceptMarkup(stage: number, replay: boolean) {
  const item = concepts[stage], base = `/video/concepts/stage-${stage + 1}`;
  return `<div class="concept-heading" data-concept-stage="${stage}"><span class="concept-tag">발견 ${stage + 1} · 12초 개념 실험실</span><h2>${item.title}</h2></div><div class="concept-screen"><video class="concept-video" playsinline preload="metadata" poster="${base}.webp" aria-label="${item.title} 개념 영상" controls><source src="${base}.mp4" type="video/mp4"><track kind="captions" srclang="ko" label="한국어" src="${base}.vtt"></video><p class="concept-error" role="status" hidden>영상을 불러오지 못했어. ${item.summary}</p></div><p class="concept-caption" role="status" aria-live="polite">${emphasizeConcept(conceptCaptions[stage][0],conceptTerms[stage])}</p><p class="concept-summary">${item.question}</p><div class="concept-actions"><button type="button" class="btn" data-video="restart">처음부터 보기</button><button type="button" class="btn primary" data-video="continue">${replay ? '탐험으로 돌아가기' : '도구 받고 도시로 →'}</button></div>`;
}

/** All media listeners and playback belong to the modal lifetime. Only the mailbox wrap-up waits for the clip to end. */
export function bindConcept(dialog: HTMLElement, effects: boolean, motion: boolean, onContinue: () => void, finishVideo = false) {
  const video = dialog.querySelector<HTMLVideoElement>('video')!, controller = new AbortController();
  const signal = controller.signal;
  const stage=Number(dialog.querySelector<HTMLElement>('[data-concept-stage]')!.dataset.conceptStage);
  const caption=dialog.querySelector<HTMLElement>('.concept-caption')!;
  let lastCue=-1;
  const updateCaption=()=>{const cue=Math.min(2,Math.floor(video.currentTime/4));if(cue!==lastCue){caption.innerHTML=emphasizeConcept(conceptCaptions[stage][cue],conceptTerms[stage]);lastCue=cue;}};
  video.addEventListener('timeupdate',updateCaption,{signal});
  video.addEventListener('seeked',updateCaption,{signal});
  const releaseFocus=bindConceptFocus(dialog,video,{steps:focusLabels[stage].map((term,i)=>({at:i*4,term})),terms:conceptTerms[stage],caption,anchor:dialog.querySelector<HTMLElement>('.concept-screen')!,controls:false,reduced:!motion});
  // Native captions remain available from the player's CC menu; the DOM copy is visible by default.
  if(video.textTracks[0])video.textTracks[0].mode='hidden';
  video.muted = !effects; video.volume = .42;
  dialog.querySelector('[data-video="restart"]')!.addEventListener('click', () => { video.currentTime = 0; void video.play().catch(() => {}); }, { signal });
  const next=dialog.querySelector<HTMLButtonElement>('[data-video="continue"]')!;
  if(finishVideo){
    next.disabled=true;
    next.textContent='영상이 끝나면 마무리';
    video.addEventListener('ended',()=>{next.disabled=false;next.textContent='도구 받고 도시로 →';},{signal});
  }
  next.addEventListener('click', onContinue, { signal });
  const fail=()=>{video.pause();next.disabled=false;if(finishVideo)next.textContent='내용 읽고 도시로 →';dialog.querySelector<HTMLElement>('.concept-error')!.hidden=false;caption.innerHTML=emphasizeConcept(concepts[stage].summary,conceptTerms[stage]);};
  video.addEventListener('error',fail,{signal});
  video.querySelector('source')?.addEventListener('error',fail,{signal});
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); }, { signal });
  if (motion && !matchMedia('(prefers-reduced-motion: reduce)').matches) void video.play().catch(() => { /* Visible native play controls remain available. */ });
  return () => { releaseFocus();controller.abort(); video.pause(); video.removeAttribute('src'); video.querySelector('source')?.remove(); video.load(); };
}
