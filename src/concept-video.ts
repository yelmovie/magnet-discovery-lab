export const concepts = [
  { title: '자석이 덮개를 붙잡는 까닭', summary: '자석이 철판을 끌어당겨 덮개를 붙잡아. 자석 유무만 바꾸어 비교해 봐.', question: '집에서 자석이 쓰인 물건을 하나 찾아볼까?' },
  { title: '닿지 않아도 작용하는 힘', summary: '자석은 닿기 전에도 철을 당겨. 같은 거리에서 얇은 종이만 넣어도 힘이 작용해.', question: '모든 금속이 자석에 붙을까? 네 실험을 근거로 이야기해 봐.' },
  { title: '마주 보는 극이 바꾸는 움직임', summary: '같은 극끼리는 밀어내고, 다른 극끼리는 끌어당겨. 고리는 마주 보는 윗면과 아랫면을 살펴봐.', question: '고리 하나를 뒤집으면 어떤 움직임이 달라질까?' },
  { title: '유리 밖에서도 조종할 수 있어', summary: '가까이 있는 자석은 유리 너머 철 패드를 당겨. 극과 위치를 바꾸면 카트를 당기거나 밀 수 있어.', question: '카트의 같은 방향 이동을 서로 다른 두 방법으로 만들 수 있니?' },
  { title: '발명은 시험하고 고치는 과정', summary: '불편을 찾고 부품을 배치한 뒤 시험해. 거리와 높이, 마주 보는 극을 고치고 다른 상황에서도 확인해.', question: '네 설계에서 고친 부분과 그 까닭을 이야기해 봐.' },
];

export function conceptMarkup(stage: number, replay: boolean) {
  const item = concepts[stage], base = `/video/concepts/stage-${stage + 1}`;
  return `<div class="concept-heading"><span class="concept-tag">발견 ${stage + 1} · 12초 개념 실험실</span><h2>${item.title}</h2></div><div class="concept-screen"><video class="concept-video" playsinline preload="metadata" poster="${base}.webp" aria-label="${item.title} 개념 영상" controls><source src="${base}.mp4" type="video/mp4"><track kind="captions" srclang="ko" label="한국어" src="${base}.vtt"></video><p class="concept-error" role="status" hidden>영상을 불러오지 못했어. ${item.summary}</p></div><p class="concept-summary">${item.question}</p><div class="concept-actions"><button type="button" class="btn" data-video="restart">처음부터 보기</button><button type="button" class="btn primary" data-video="continue">${replay ? '탐험으로 돌아가기' : '도구 받고 도시로 →'}</button></div>`;
}

/** All media listeners and playback belong to the modal lifetime. No viewing-time gate. */
export function bindConcept(dialog: HTMLElement, effects: boolean, motion: boolean, onContinue: () => void) {
  const video = dialog.querySelector<HTMLVideoElement>('video')!, controller = new AbortController();
  const signal = controller.signal;
  video.muted = !effects; video.volume = .42;
  dialog.querySelector('[data-video="restart"]')!.addEventListener('click', () => { video.currentTime = 0; void video.play().catch(() => {}); }, { signal });
  dialog.querySelector('[data-video="continue"]')!.addEventListener('click', onContinue, { signal });
  video.addEventListener('error', () => { dialog.querySelector<HTMLElement>('.concept-error')!.hidden = false; }, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); }, { signal });
  if (motion) void video.play().catch(() => { /* Visible native play controls remain available. */ });
  return () => { controller.abort(); video.pause(); video.removeAttribute('src'); video.querySelector('source')?.remove(); video.load(); };
}
