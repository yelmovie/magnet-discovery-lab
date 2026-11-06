import './learning-visuals.css';
import { apparatusFigure } from './apparatus-figures';

interface LearningVisual {
  image: string; title: string; alt: string; parts: string[];
  look: string; move: string; notice: string;
}

const visuals: LearningVisual[] = [
  { image:'mailbox', title:'덮개 속 두 부품', alt:'열린 우편함 덮개 안쪽의 자석과 몸체 앞쪽의 철 걸쇠', parts:['덮개 안쪽 자석','몸체의 철 걸쇠','위로 여는 손잡이'], look:'덮개와 몸체에서 서로 마주 보는 두 부품을 찾아봐.', move:'나무 손잡이를 위로 올려. 덮개 안쪽의 자석을 찾으면 다시 천천히 닫아 봐.', notice:'덮개가 닫힐 때 어느 두 부품이 만나서 붙을까?' },
  { image:'mailbox', title:'같은 우편함으로 비교', alt:'덮개에 자석이 있고 몸체에 철 걸쇠가 있는 열린 우편함', parts:['넣고 빼는 자석','고정된 철 걸쇠','비교할 같은 덮개'], look:'철 걸쇠는 그대로 두고, 자석만 넣거나 뺄 수 있어.', move:'덮개를 닫고, 열리는지 살짝 흔들어 보자. 자석을 넣은 뒤에도 같은 세기로 흔들어 봐.', notice:'흔드는 힘은 같은데 덮개가 붙잡히는 모습도 같을까?' },
  { image:'materials', title:'겉모습보다 실제 반응', alt:'자석과 철 클립·철못·알루미늄·나무·플라스틱·고무가 놓인 관찰 쟁반', parts:['검사할 자석','서로 다른 재료','두 개의 분류함'], look:'철 클립과 알루미늄은 모두 반짝여. 재료는 서로 달라.', move:'자석을 가까이 대어 확인한 뒤 알맞은 분류함으로 옮겨봐.', notice:'자석을 따라온 재료와 따라오지 않은 재료를 비교해봐.' },
  { image:'paper', title:'자석 끝에서 클립 끝까지', alt:'자석과 철 클립 사이에 얇은 종이 한 장을 세운 거리 비교 장치', parts:['움직이는 자석','철 클립','얇은 종이 한 장'], look:'클립 끝을 눈금 0에 두고, 자석 끝까지 빈칸을 세어 봐.', move:'먼저 5칸, 다음에는 1칸에 자석 끝을 맞춰 손을 떼어 봐.', notice:'마지막에는 같은 출발 간격에서 종이만 넣어 비교해 봐.' },
  { image:'poles', title:'움직임으로 찾는 극', alt:'색을 아는 기준 자석과 종이로 표시를 가린 자석, 두 장의 극 스티커', parts:['기준 자석의 두 극','표시를 가린 자석','N·S 표시 스티커'], look:'실험대에서 기준 자석의 N·S 표시를 먼저 확인해.', move:'기준 자석을 뒤집어 두 극을 각각 가까이 대어봐.', notice:'당겨지거나 밀리는 움직임을 본 뒤 양쪽 표시를 붙여봐.' },
  { image:'rings', title:'서로 마주 보는 두 면', alt:'기둥에 끼운 두 고리자석 사이에 틈이 있고 아래 고리 윗면과 위 고리 아랫면이 같은 빨강인 장치', parts:['기둥과 받침대','아래 고리의 윗면','위 고리의 아랫면'], look:'비교할 곳은 두 고리의 윗면끼리가 아니라 서로 마주 보는 면이야.', move:'고리를 기둥 점선에 놓고, 위 고리만 뒤집어 손을 떼어봐.', notice:'마주 보는 극이 바뀌면 고리 사이의 틈은 어떻게 달라질까?' },
  { image:'aquarium', title:'유리 양쪽의 청소 도구', alt:'수조 유리를 사이에 두고 마주 놓인 바깥 손잡이와 안쪽 청소 패드', parts:['유리 밖 자석 손잡이','사이에 있는 유리','물속의 청소 패드'], look:'손으로 움직이는 것은 밖의 손잡이, 얼룩을 닦는 것은 안쪽 패드야.', move:'손잡이를 패드 가까이 두고 얼룩 위를 천천히 쓸어봐.', notice:'둘 사이가 멀어져 연결이 끊기면 다시 가까이 가져와봐.' },
  { image:'delivery', title:'극과 위치를 함께 보기', alt:'레일 위 택배 카트에 붙은 자석과 떨어져 있는 조종 자석', parts:['카트에 붙은 자석','내가 움직일 조종 자석','멈춰야 할 배달 장소'], look:'그림은 부품을 살피는 예시야. 방향과 극은 실험대 표시를 확인해.', move:'앞에서 당기고 뒤에서 밀어 같은 목적지로 보내봐.', notice:'목적지에 닿으면 조종 자석을 떼어 카트를 멈춰봐.' },
  { image:'invention', title:'불편을 고치는 부품 배치', alt:'우편함 몸체와 덮개, 조립할 자석·철 걸쇠를 설계도 위에 펼친 발명대', parts:['장치 몸체','힘을 주는 자석','마주 보는 상대 부품'], look:'우편함을 닫을지, 유리 너머 물건을 옮길지 먼저 골라봐.', move:'몸체를 놓고 자석과 상대 부품이 마주 보도록 배치해봐.', notice:'시제품을 시험한 결과를 보고 거리·높이·극을 하나씩 고쳐봐.' },
  { image:'mailbox', title:'지금 만든 배치로 시험', alt:'안쪽 자석과 철 걸쇠가 마주 보게 조립한 우편함의 구조', parts:['내가 배치한 자석','마주 보는 부품','실제로 사용할 손잡이'], look:'이전 시험이 아니라 지금 놓인 부품의 위치를 확인해.', move:'손잡이를 움직여 사용한 뒤 사용 시험을 눌러봐.', notice:'배치를 고쳤다면 고친 배치로 다시 시험해봐.' },
];

function visual(n: number, template: string): LearningVisual {
  const item=visuals[Math.max(0,Math.min(9,n-1))];
  if(n===10&&template==='remote')return {...item,image:'aquarium',title:'판 너머로 힘 전달하기',alt:'유리 양쪽에서 서로 마주 보는 바깥 자석 손잡이와 안쪽 패드의 배치 예시',parts:['판 바깥 조작 자석','사이에 있는 유리판','판 안쪽 대상 부품'],look:'그림처럼 판 양쪽을 살펴봐. 내 장치의 안쪽 부품은 실험대에 보여.',move:'내 배치의 바깥 손잡이를 움직여 안쪽 부품을 목표로 보내봐.'};
  return item;
}

export function visualPreview(n: number, template: string): string {
  const v=visual(n,template);
  const interactive=apparatusFigure(n);
  return `<button class="learning-visual-preview" data-action="visual-guide" aria-label="${v.title} · ${interactive ? '장치 움직여 보기' : '장치 그림 크게 보기'}"><img src="/assets/learning/${v.image}.webp" alt="" width="1024" height="688" decoding="async"><span>장치 살펴보기 <b aria-hidden="true">${interactive ? '▸' : '＋'}</b></span></button>`;
}

export function apparatusThumbnail(n:number,template:string) {
  const item=visual(n,template);
  return {src:`/assets/learning/${item.image}.webp`,alt:item.alt};
}

/** 크게 보기: the picture gets the whole dialog width and pans with scrollbars inside its frame. */
export function bindVisualGuide(dialog: HTMLElement) {
  const zoom = dialog.querySelector<HTMLButtonElement>('.learning-visual-zoom');
  zoom?.addEventListener('click', () => {
    const on = zoom.getAttribute('aria-pressed') !== 'true';
    zoom.setAttribute('aria-pressed', String(on)); zoom.textContent = on ? '원래 크기로' : '그림 크게 보기';
    dialog.classList.toggle('is-zoomed', on);
  });
}

export function visualGuideMarkup(n: number, template: string): string {
  const v=visual(n,template);
  const controls='<button class="btn primary" data-action="modal-close">실험대로 돌아가기</button>';
  return `<div class="learning-visual-guide"><span class="learning-visual-kicker">그림에서 찾고, 실험대에서 확인해요</span><h2>${v.title}</h2><div class="learning-visual-layout"><figure><div class="learning-visual-frame"><img src="/assets/learning/${v.image}.webp" alt="${v.alt}" width="1024" height="688"></div><button type="button" class="learning-visual-zoom" aria-pressed="false">그림 크게 보기</button><figcaption>${v.parts.map(p=>`<span>${p}</span>`).join('')}</figcaption></figure><ol>${[['눈으로 찾기',v.look],['직접 움직이기',v.move],['변화 관찰하기',v.notice]].map(([title,text])=>`<li><strong>${title}</strong><p>${text}</p></li>`).join('')}</ol></div>${controls}</div>`;
}
