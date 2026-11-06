export const concepts = [
  { title: '자석이 덮개를 붙잡는 까닭', summary: '덮개 안쪽 자석은 덮개와 함께 움직이고 몸체의 철판은 제자리에 있어. 닫으면 둘이 만나 덮개를 붙잡아.', question: '우편함을 닫을 때 어떤 두 부품이 만나니?' },
  { title: '닿지 않아도 작용하는 힘', summary: '같은 자리에서 얇은 종이만 끼우고 비교해 봐. 자석은 종이 너머의 철 클립도 당겨. 클립은 종이 앞에서 멈춰.', question: '종이가 사이에 있는데도 클립이 움직인 까닭은 뭘까?' },
  { title: '마주 보는 극이 바꾸는 움직임', summary: '아랫고리의 윗면과 윗고리의 아랫면을 봐. 마주 보는 극이 같으면 서로 밀어내고, 다르면 서로 당겨.', question: '아랫고리 윗면이 N극이라면, 윗고리의 어느 극을 아래로 두어야 뜰까?' },
  { title: '유리 밖에서도 조종할 수 있어', summary: '유리 양쪽의 자석이 서로 당겨서 물속 패드가 손잡이를 따라와. 수레는 자석끼리 닿기 전에도 앞에서 당기거나 뒤에서 밀 수 있어.', question: '수레를 오른쪽으로 보내려면 조종 자석을 어디에, 어떤 극이 마주 보게 둘까?' },
  { title: '발명은 시험하고 고치는 과정', summary: '덮개 자석과 철판이 같은 자리에 만나도록 고쳤어. 편지와 책을 차례로 넣고 덮개가 잘 닫혀 있는지 시험했어.', question: '네 발명품은 어떤 점을 고쳤고, 잘 작동하는지 어떻게 확인했니?' },
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
