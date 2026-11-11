/** Short, observation-based explanations shared by the apparatus and discovery pages. */
export const scienceNotes = [
  { rule: '자석은 철로 된 물체를 끌어당겨.', check: '덮개 안쪽 자석과 몸체의 철판이 만나는 곳을 살펴봐.' },
  { rule: '한 가지만 바꾸어 비교하면 까닭을 찾을 수 있어.', check: '같은 우편함을 같은 세기로 흔들고, 자석만 넣거나 빼 봐.' },
  { rule: '금속이라고 모두 자석에 붙지는 않아.', check: '같은 자석으로 철과 알루미늄을 검사한 결과를 비교해 봐.' },
  { rule: '닿지 않아도 자석의 힘이 작용할 수 있어.', check: '종이를 비교할 때는 출발 간격을 같게 해. 실제로 움직이는 거리는 자석과 물체에 따라 달라.' },
  { rule: '같은 극끼리는 밀어내고, 다른 극끼리는 끌어당겨.', check: 'N·S 글자와 움직임을 함께 봐. 빨강·파랑은 극을 구별하려고 붙인 표시야.' },
  { rule: '마주 보는 같은 극끼리 밀어내면 위 고리가 떠 있을 수 있어.', check: '아래 고리의 윗면과 위 고리의 아랫면을 봐. 자석이 위로 미는 힘이 고리를 받쳐 줘. 기둥은 고리가 옆으로 벗어나지 않게 잡아 줘.' },
  { rule: '유리를 사이에 두고도 두 자석은 끌어당길 수 있어.', check: '물속 패드에도 자석이 들어 있어. 손잡이가 너무 멀어지면 패드가 떨어질 수 있어.' },
  { rule: '마주 보는 극과 자석의 위치에 따라 움직이는 방향이 달라져.', check: '자석을 떼어도 카트는 조금 더 굴러가. 이 레일에서는 마찰 때문에 멈춰.' },
  { rule: '자석의 성질을 이용해 생활의 불편을 해결할 수 있어.', check: '자석을 놓을 곳과 움직일 물체를 정하고, 힘의 방향을 설명해 봐.' },
  { rule: '관찰한 결과를 근거로 내 발명을 설명해.', check: '친구의 질문을 듣고 더 알아볼 점을 찾아봐. 실제로 만들면 움직임을 시험해 봐.' },
];

const terms = /가까이 마주|금속이라고 모두 자석에 붙지는 않아|같은 극끼리|다른 극끼리|마주 보는 극|한 가지만|출발 간격|닿지 않아도|철로 된 물체|끌어당기|끌어당겨|끌어당길|밀어내|마찰|자석의 성질|관찰한 결과/g;
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function emphasizeScience(text: string): string {
  return escape(text).replace(terms, term => `<strong class="science-emphasis">${term}</strong>`);
}

export function scienceNoteMarkup(n: number, a?: { values: Record<string, unknown> }): string {
  const note = n === 2 && a?.values.puzzleVersion === 1
    ? { rule: '자석과 철판이 가까이 마주 보면 덮개를 붙잡아 줘.', check: '자석을 넣어도 덮개가 열리면 철판 자리를 살펴봐. 자석은 그대로 두고 철판을 가까이 옮겨 봐.' }
    : scienceNotes[n - 1];
  return note ? `<aside class="science-note" aria-label="핵심 개념"><h3>꼭 기억해</h3><p>${emphasizeScience(note.rule)}</p><p class="science-check">${emphasizeScience(note.check)}</p></aside>` : '';
}
